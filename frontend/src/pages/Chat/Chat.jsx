import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import './Chat.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const Chat = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join_session', sessionId);
    });

    socketRef.current.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on('user_typing', (data) => {
      if (data.userId !== user?._id) setTyping(data.userName);
    });

    socketRef.current.on('user_stop_typing', () => setTyping(null));

    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      socketRef.current?.emit('leave_session', sessionId);
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socketRef.current?.emit('send_message', {
      sessionId,
      senderId: user?._id,
      content: newMessage.trim(),
      type: 'text',
    });

    setNewMessage('');
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

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="ch-info">
            <div className="ch-avatar">💬</div>
            <div>
              <h3>Study Session</h3>
              <span className={`status ${connected ? 'online' : 'offline'}`}>
                {connected ? '● Connected' : '○ Connecting...'}
              </span>
            </div>
          </div>
          <div className="ch-session-id">Session: {sessionId?.slice(0, 8)}...</div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <span className="empty-icon">💬</span>
              <p>Start the conversation!</p>
              <span className="text-muted">Ask your mentor a question or share what you need help with.</span>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.senderId === user?._id ? 'sent' : 'received'}`}>
              <div className="msg-bubble">
                <p>{msg.content}</p>
                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {typing && (
            <div className="typing-indicator">
              <div className="typing-dots"><span></span><span></span><span></span></div>
              <span>{typing} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chat-input" onSubmit={handleSend}>
          <input type="text" value={newMessage} onChange={handleTyping} placeholder="Type a message..." autoFocus />
          <button type="submit" disabled={!newMessage.trim()}>Send →</button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
