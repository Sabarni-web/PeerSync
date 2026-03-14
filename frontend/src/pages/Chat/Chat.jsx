import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import api from '../../services/api';
import './Chat.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '✅'];

// ── Live timer hook ────────────────────────────────────────────────────────────
const useLiveTimer = (startedAt) => {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const totalSec = Math.floor((Date.now() - new Date(startedAt)) / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      const s = (totalSec % 60).toString().padStart(2, '0');
      setElapsed(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
};

// ── Reaction aggregator ────────────────────────────────────────────────────────
const groupReactions = (reactions = []) => {
  const map = {};
  reactions.forEach(r => {
    map[r.emoji] = (map[r.emoji] || 0) + 1;
  });
  return Object.entries(map);
};

// ── Simple markdown renderer ───────────────────────────────────────────────────
const renderAIContent = (text) => {
  // Process text into paragraphs and handle inline formatting
  return text.split('\n').map((line, i) => {
    // Bold
    let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    processed = processed.replace(/`(.*?)`/g, '<code>$1</code>');
    // Bullet points
    if (processed.startsWith('• ') || processed.startsWith('- ')) {
      processed = `<span class="ai-bullet">›</span> ${processed.slice(2)}`;
    }
    return processed;
  }).join('<br/>');
};

// ─────────────────────────────────────────────────────────────────────────────
const Chat = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(null);
  const [connected, setConnected] = useState(false);
  const [ending, setEnding] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [toast, setToast] = useState(null);   // { text, type }
  const [hoveredMsg, setHoveredMsg] = useState(null);   // message _id with emoji bar visible
  const [aiMode, setAiMode] = useState(false);         // AI ask mode toggle
  const [aiLoading, setAiLoading] = useState(false);    // AI thinking indicator

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const elapsed = useLiveTimer(session?.startedAt);

  // ── Show toast helper ──────────────────────────────────────────────────────
  const showToast = useCallback((text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Load session + messages ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [sessRes, msgRes] = await Promise.all([
          api.get(`/sessions/${sessionId}`),
          api.get(`/sessions/${sessionId}/messages`),
        ]);
        setSession(sessRes.data);
        // Attach empty reactions array to loaded messages if missing
        setMessages(msgRes.data.map(m => ({ ...m, reactions: m.reactions || [] })));
      } catch (err) {
        console.error('Failed to load session:', err.message);
        navigate('/dashboard');
      } finally {
        setLoadingSession(false);
      }
    };
    load();
  }, [sessionId]);

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      setConnected(true);
      // Pass userId so backend can look up the name and broadcast peer_joined
      socketRef.current.emit('join_session', { sessionId, userId: user?._id });
    });

    socketRef.current.on('peer_joined', ({ userName }) => {
      showToast(`${userName} has joined the session 👋`, 'success');
    });

    socketRef.current.on('receive_message', (message) => {
      setMessages(prev => [...prev, { ...message, reactions: message.reactions || [] }]);
    });

    socketRef.current.on('message_reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => m._id?.toString() === messageId ? { ...m, reactions } : m)
      );
    });

    socketRef.current.on('user_typing', (data) => {
      if (data.userId !== user?._id) setTyping(data.userName);
    });

    socketRef.current.on('user_stop_typing', () => setTyping(null));

    // ── Session ended by the other participant ────────────────────────────
    socketRef.current.on('session_ended', ({ endedByName, endedBy }) => {
      if (endedBy !== user?._id?.toString()) {
        showToast(`Session ended by ${endedByName}`, 'warning');
        setTimeout(() => navigate(`/feedback/${sessionId}`), 1800);
      }
    });

    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      socketRef.current?.emit('leave_session', sessionId);
      socketRef.current?.disconnect();
    };
  }, [sessionId, user?._id]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message (normal or AI) ────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgContent = newMessage.trim();

    if (aiMode) {
      // Send user question as a normal message first
      socketRef.current?.emit('send_message', {
        sessionId,
        senderId: user?._id,
        content: `🤖 @AI: ${msgContent}`,
        type: 'text',
      });
      setNewMessage('');
      setAiLoading(true);

      try {
        // Build conversation history for context
        const conversationHistory = messages.slice(-10).map(m => ({
          content: m.content,
          type: m.type,
        }));

        await api.post('/chatbot/ask', {
          sessionId,
          question: msgContent,
          conversationHistory,
        });
        // Response will arrive via socket 'receive_message'
      } catch (err) {
        console.error('AI error:', err);
        showToast('AI could not respond. Try again.', 'warning');
      } finally {
        setAiLoading(false);
      }
    } else {
      // Normal message
      socketRef.current?.emit('send_message', {
        sessionId,
        senderId: user?._id,
        content: msgContent,
        type: 'text',
      });
      setNewMessage('');
    }

    socketRef.current?.emit('stop_typing', { sessionId, userId: user?._id });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socketRef.current?.emit('typing', { sessionId, userId: user?._id, userName: user?.name });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { sessionId, userId: user?._id });
    }, 1500);
  };

  // ── React to message ───────────────────────────────────────────────────────
  const handleReact = (messageId, emoji) => {
    setHoveredMsg(null);
    socketRef.current?.emit('react_message', {
      messageId,
      emoji,
      userId: user?._id,
      sessionId,
    });
  };

  // ── End session ────────────────────────────────────────────────────────────
  const handleEndSession = async () => {
    if (!window.confirm('End this session and give feedback?')) return;
    setEnding(true);
    try {
      await api.put(`/sessions/${sessionId}/end`);
      navigate(`/feedback/${sessionId}`);
    } catch (err) {
      alert('Could not end session: ' + (err.response?.data?.message || err.message));
      setEnding(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const isStudent = session?.studentId?._id === user?._id || session?.studentId === user?._id;
  const otherName = isStudent
    ? (session?.mentorId?.name || 'Mentor')
    : (session?.studentId?.name || 'Student');
  const subject = session?.subject || 'Study Session';
  const isLong = elapsed.split(':').length === 3 || parseInt(elapsed.split(':')[0]) >= 30;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingSession) return (
    <div className="chat-page">
      <div className="chat-loading">
        <div className="chat-spinner" />
        <p>Connecting to session...</p>
      </div>
    </div>
  );

  // ── Pending: waiting for mentor to accept ──────────────────────────────────
  if (session?.status === 'pending') return (
    <div className="chat-page">
      <div className="chat-loading">
        <div className="chat-spinner" />
        <p style={{ marginTop: '12px', fontWeight: 600 }}>Waiting for {otherName} to accept…</p>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          You'll be connected automatically once they accept your request.
        </span>
      </div>
    </div>
  );


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="chat-page">

      {/* ── Toast notifications ───────────────────────────────────────────── */}
      {toast && (
        <div className={`chat-toast chat-toast-${toast.type}`}>
          {toast.text}
        </div>
      )}

      <div className="chat-container">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="chat-header">
          <div className="ch-info">
            <div className="ch-avatar">{otherName.charAt(0)}</div>
            <div>
              <h3>{otherName}</h3>
              <span className={`status ${connected ? 'online' : 'offline'}`}>
                {connected ? '● Connected' : '○ Connecting...'}
              </span>
            </div>
          </div>

          <div className="ch-meta">
            <div className="ch-subject">📚 {subject}</div>
            <div className={`ch-timer ${isLong ? 'timer-long' : ''}`}>⏱ {elapsed}</div>
            <button
              className="btn-end-session"
              onClick={handleEndSession}
              disabled={ending}
            >
              {ending ? 'Ending...' : '✅ End Session'}
            </button>
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <span className="empty-icon">💬</span>
              <p>Session started! Say hello to {otherName}.</p>
              <span className="text-muted">Working on: {subject}</span>
              <span className="text-muted ai-hint">💡 Tip: Click the 🤖 button to ask AI for help!</span>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isAI = msg.type === 'ai';
            const isSelf = !isAI && (msg.senderId?._id === user?._id || msg.senderId === user?._id);
            const msgId = msg._id?.toString() || idx.toString();
            const grouped = groupReactions(msg.reactions);

            return (
              <div
                key={msgId}
                className={`message ${isAI ? 'ai-message' : isSelf ? 'sent' : 'received'}`}
                onMouseEnter={() => setHoveredMsg(msgId)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                {/* Sender label */}
                {isAI && (
                  <div className="msg-sender-name ai-sender">
                    <span className="ai-badge">🤖 AI Tutor</span>
                  </div>
                )}
                {!isSelf && !isAI && (
                  <div className="msg-sender-name">
                    {msg.senderId?.name || otherName}
                  </div>
                )}

                <div className="msg-bubble-wrap">
                  <div className={`msg-bubble ${isAI ? 'ai-bubble' : ''}`}>
                    {isAI ? (
                      <div
                        className="ai-content"
                        dangerouslySetInnerHTML={{ __html: renderAIContent(msg.content) }}
                      />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    <span className="msg-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Emoji reaction bar — appears on hover */}
                  {hoveredMsg === msgId && (
                    <div className={`emoji-bar ${isSelf ? 'emoji-bar-left' : 'emoji-bar-right'}`}>
                      {QUICK_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          className="emoji-btn"
                          onClick={() => handleReact(msg._id, emoji)}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reaction pills */}
                {grouped.length > 0 && (
                  <div className={`reaction-pills ${isSelf ? 'pills-right' : 'pills-left'}`}>
                    {grouped.map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className="reaction-pill"
                        onClick={() => handleReact(msg._id, emoji)}
                      >
                        {emoji} {count > 1 && <span className="pill-count">{count}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* AI thinking indicator */}
          {aiLoading && (
            <div className="message ai-message">
              <div className="msg-sender-name ai-sender">
                <span className="ai-badge">🤖 AI Tutor</span>
              </div>
              <div className="msg-bubble-wrap">
                <div className="msg-bubble ai-bubble ai-thinking">
                  <div className="ai-thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="ai-thinking-text">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {typing && (
            <div className="typing-indicator">
              <div className="typing-dots"><span /><span /><span /></div>
              <span>{typing} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ───────────────────────────────────────────────────────── */}
        <form className="chat-input" onSubmit={handleSend}>
          <button
            type="button"
            className={`ai-toggle-btn ${aiMode ? 'ai-toggle-active' : ''}`}
            onClick={() => setAiMode(!aiMode)}
            title={aiMode ? 'Switch to normal chat' : 'Ask AI Tutor'}
          >
            🤖
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={aiMode ? 'Ask AI Tutor a question...' : `Message ${otherName}...`}
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || aiLoading}
            className={aiMode ? 'ai-send-btn' : ''}
          >
            {aiLoading ? (
              <span className="send-spinner" />
            ) : aiMode ? (
              '✨ Ask AI'
            ) : (
              'Send →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
