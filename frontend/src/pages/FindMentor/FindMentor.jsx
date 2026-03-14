import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import './FindMentor.css';

const FindMentor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [mlStatus, setMlStatus] = useState(null);
  const [source, setSource] = useState('');

  const [activeTab, setActiveTab] = useState('ai');
  const [allMentors, setAllMentors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Connect modal state
  const [connectModal, setConnectModal] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Waiting for mentor to accept
  const [waitingSession, setWaitingSession] = useState(null); // { sessionId, mentorName, subject }

  const { sessionRequest, clearRequest } = useSocket();

  // When a decline comes through SocketContext, clear the waiting state
  useEffect(() => {
    if (sessionRequest?.declined && waitingSession) {
      setWaitingSession(null);
      // Don't clearRequest here — GlobalSessionNotifier shows the error
    }
  }, [sessionRequest]);

  // ── Fetch all mentors and ML status on mount ─────────────────────────────
  useEffect(() => {
    api.get('/ml-status')
      .then(res => setMlStatus(res.data.ml_online))
      .catch(() => setMlStatus(false));

    api.get('/mentors')
      .then(res => setAllMentors(res.data))
      .catch(err => console.error('Failed to load mentors:', err));
  }, []);

  const filteredMentors = allMentors.filter(m => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (m.name || '').toLowerCase().includes(q);
    const subjectMatch = (m.mentorProfile?.subjectExpertise || []).some(s => (s || '').toLowerCase().includes(q));
    const collegeMatch = (m.college || '').toLowerCase().includes(q);
    return nameMatch || subjectMatch || collegeMatch;
  });

  // ── Find Mentors ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    setLoading(true);
    setSearched(false);
    setResults([]);

    const steps = [
      'Analyzing your profile...',
      'Scanning 200 mentors...',
      'Computing compatibility scores...',
      'Ranking top matches...',
    ];
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await api.post('/matches/find', { topN: 3 });
      setResults(res.data.recommendations || []);
      setSource(res.data.source || 'ai');
    } catch {
      setSource('demo');
      setResults([
        { mentor_id: 'demo1', name: 'Riya Sharma', match_percentage: 94, reasons: ['Visual teaching style matches yours', 'Expert in Data Structures', 'Excellent schedule compatibility'], mentor_details: { teaching_style: 'Visual', subject_expertise: ['Data Structures', 'Algorithms'], semester: 6, patience_score: 4.8 } },
        { mentor_id: 'demo2', name: 'Arjun Patel', match_percentage: 87, reasons: ['Good schedule overlap', 'Covers most of your needed subjects', 'Known for clear explanations'], mentor_details: { teaching_style: 'Read-Write', subject_expertise: ['Database Systems', 'SQL'], semester: 5, patience_score: 4.5 } },
        { mentor_id: 'demo3', name: 'Sneha Roy', match_percentage: 81, reasons: ['Compatible teaching approach', 'Relevant subject expertise', 'Highly rated for patience'], mentor_details: { teaching_style: 'Kinesthetic', subject_expertise: ['Machine Learning', 'Python'], semester: 7, patience_score: 4.9 } },
      ]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  // ── Open Connect Modal ────────────────────────────────────────────────────
  const openConnectModal = (mentor) => {
    if (mentor.mentor_id?.startsWith('demo')) return; // ignore demo cards
    const subjects = mentor.mentor_details?.subject_expertise || [];
    setSelectedSubject(subjects[0] || '');
    setConnectModal({ mentor });
  };

  const closeConnectModal = () => {
    setConnectModal(null);
    setSelectedSubject('');
  };

  // ── Request Session (pending — wait for mentor accept) ───────────────────
  const handleConnect = async () => {
    if (!connectModal || !selectedSubject) return;
    setConnecting(true);

    try {
      const { mentor } = connectModal;
      const res = await api.post('/sessions/start', {
        mentorId: mentor.mentor_id,
        subject: selectedSubject,
        matchScore: mentor.match_percentage || 0,
      });

      // If session was already active (resumed), go straight to chat
      if (res.data.status === 'active' || res.data.resumed) {
        closeConnectModal();
        navigate(`/chat/${res.data._id}`);
        return;
      }

      // Otherwise, wait for mentor to accept
      setWaitingSession({
        sessionId:  res.data._id,
        mentorName: mentor.name,
        subject:    selectedSubject,
      });
      closeConnectModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  // ── Cancel a pending request ──────────────────────────────────────────────
  const handleCancelRequest = async () => {
    if (!waitingSession) return;
    try {
      await api.put(`/sessions/${waitingSession.sessionId}/decline`);
    } catch { /* best-effort */ }
    setWaitingSession(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="container">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="find-header fade-in">
          <h1>{activeTab === 'ai' ? '🔍 Find Your Mentor (AI)' : '🌐 Browse Mentors'}</h1>
          <p>
            {activeTab === 'ai' 
              ? 'Our AI analyzes your profile across 6 dimensions and recommends the top 3 most compatible mentors.'
              : 'Search our entire network to find the perfect mentor by name, college, or subject.'}
          </p>

          <div className="mentor-tabs">
            <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>🤖 AI Match</button>
            <button className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>🔍 Browse All</button>
          </div>

          {activeTab === 'ai' && (
            <>
              <div className="ml-status-badge">
                {mlStatus === null && <span className="ml-badge checking">⏳ Checking AI engine...</span>}
                {mlStatus === true && <span className="ml-badge online">🟢 AI Engine Online — Live ML Recommendations Active</span>}
                {mlStatus === false && <span className="ml-badge offline">🟡 AI Engine Offline — Smart fallback will be used</span>}
              </div>

              <button className="btn-find" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching ...' : ' Find My Best Mentors'}
              </button>
            </>
          )}

          {activeTab === 'browse' && (
            <div className="browse-search">
              <input 
                type="text" 
                placeholder="Search by name, subject, or college..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          )}
        </div>

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && (
          <div className="loading-container fade-in">
            <div className="ai-loader">
              <div className="loader-ring"></div>
              <span className="loader-text">{loadingStep}</span>
            </div>
          </div>
        )}

        {/* ── AI Results ─────────────────────────────────────────────────────── */}
        {activeTab === 'ai' && searched && !loading && (
          <div className="results-container">
            {source && (
              <div className={`source-badge ${source}`}>
                {source === 'ai' ? '🤖 Results powered by ML recommendation engine' :
                  source === 'fallback' ? '📋 Results from smart fallback (ML offline)' :
                    '🎭 Demo results — server unavailable'}
              </div>
            )}

            {results.length === 0 ? (
              <div className="no-results">
                No mentors found. Try updating your profile with more subjects and availability slots.
              </div>
            ) : (
              results.map((mentor, idx) => (
                <div
                  key={mentor.mentor_id}
                  className="mentor-card slide-up"
                  style={{ animationDelay: `${idx * 0.15}s` }}
                >
                  <div className="mc-header">
                    <div className="mc-rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}{' '}
                      {idx === 0 ? 'BEST MATCH' : idx === 1 ? 'GREAT MATCH' : 'GOOD MATCH'}
                    </div>
                    <div className="mc-score">{mentor.match_percentage}%</div>
                  </div>

                  <div className="mc-body">
                    <div className="mc-avatar">{mentor.name?.charAt(0) || '?'}</div>
                    <div className="mc-info">
                      <h3>{mentor.name}</h3>
                      <p>Semester {mentor.mentor_details?.semester} • {mentor.mentor_details?.teaching_style} Teacher</p>
                      <div className="mc-tags">
                        {mentor.mentor_details?.subject_expertise?.map((s, i) => (
                          <span key={i} className="tag">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ML Score Breakdown */}
                  {mentor.hybrid_score !== undefined && (
                    <div className="mc-scores">
                      <div className="score-item">
                        <span className="score-label">Content Match</span>
                        <div className="score-bar">
                          <div className="score-fill" style={{ width: `${Math.round(mentor.content_score * 100)}%` }}></div>
                        </div>
                        <span className="score-val">{Math.round(mentor.content_score * 100)}%</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Collaborative</span>
                        <div className="score-bar">
                          <div className="score-fill collab" style={{ width: `${Math.round(mentor.collaborative_score * 100)}%` }}></div>
                        </div>
                        <span className="score-val">{Math.round(mentor.collaborative_score * 100)}%</span>
                      </div>
                      {mentor.schedule_overlap !== undefined && (
                        <div className="score-meta">
                          📅 {mentor.schedule_overlap} shared time slots &nbsp;•&nbsp;
                          📚 {Math.round((mentor.subject_relevance || 0) * 100)}% subject relevance
                          {mentor.style_match && ' • 🎯 Teaching style matched!'}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mc-reasons">
                    <span className="reasons-label">Why this match:</span>
                    {mentor.reasons?.map((r, i) => (
                      <div key={i} className="reason">✓ {r}</div>
                    ))}
                  </div>

                  <div className="mc-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn-connect" 
                      style={{ flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      onClick={() => navigate(`/mentor/${mentor.mentor_id}`)}
                      disabled={mentor.mentor_id?.startsWith('demo')}
                    >
                      👤 View Profile
                    </button>
                    <button
                      className="btn-connect"
                      style={{ flex: 1 }}
                      onClick={() => openConnectModal(mentor)}
                      disabled={mentor.mentor_id?.startsWith('demo')}
                      title={mentor.mentor_id?.startsWith('demo') ? 'Demo mode — log in with a real account' : ''}
                    >
                      💬 Connect Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Browse Results ─────────────────────────────────────────────────── */}
        {activeTab === 'browse' && (
          <div className="browse-grid fade-in">
            {filteredMentors.length === 0 ? (
              <div className="no-results">No mentors found matching "{searchQuery}"</div>
            ) : (
              filteredMentors.map((mentor, idx) => (
                <div key={mentor._id} className="mentor-card slide-up" style={{ animationDelay: `${(idx % 15) * 0.05}s` }}>
                  <div className="mc-body" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="mc-avatar">{mentor.name?.charAt(0) || '?'}</div>
                    <div className="mc-info">
                      <h3>{mentor.name}</h3>
                      <p>{mentor.college} • Semester {mentor.semester}</p>
                      <div className="mc-tags" style={{ marginTop: '8px' }}>
                        {(mentor.mentorProfile?.subjectExpertise || []).slice(0, 3).map((s, i) => (
                          <span key={i} className="tag">{s}</span>
                        ))}
                        {(mentor.mentorProfile?.subjectExpertise || []).length > 3 && (
                          <span className="tag">+{(mentor.mentorProfile?.subjectExpertise || []).length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mc-actions" style={{ paddingTop: '20px', display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn-connect" 
                      style={{ flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      onClick={() => navigate(`/mentor/${mentor._id}`)}
                    >
                      👤 View Profile
                    </button>
                    <button 
                      className="btn-connect" 
                      style={{ flex: 1 }}
                      onClick={() => openConnectModal({
                        mentor_id: mentor._id,
                        name: mentor.name,
                        match_percentage: 'N/A ',
                        mentor_details: { subject_expertise: mentor.mentorProfile?.subjectExpertise || [] }
                      })}
                    >
                      💬 Connect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Connect Modal ─────────────────────────────────────────────────── */}
      {connectModal && (
        <div className="modal-overlay" onClick={closeConnectModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-avatar">{connectModal.mentor.name?.charAt(0)}</div>
              <div>
                <h3>Connect with {connectModal.mentor.name}</h3>
                <p>{connectModal.mentor.match_percentage}% compatibility match</p>
              </div>
            </div>

            <div className="modal-body">
              <label className="modal-label">What subject do you need help with?</label>
              <div className="subject-grid">
                {connectModal.mentor.mentor_details?.subject_expertise?.map((subj, i) => (
                  <button
                    key={i}
                    className={`subject-btn ${selectedSubject === subj ? 'selected' : ''}`}
                    onClick={() => setSelectedSubject(subj)}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeConnectModal}>Cancel</button>
              <button
                className="btn-start-session"
                onClick={handleConnect}
                disabled={!selectedSubject || connecting}
              >
                {connecting ? '⏳ Sending...' : '📨 Request Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waiting for Mentor Screen ──────────────────────────────────── */}
      {waitingSession && (
        <div className="modal-overlay">
          <div className="modal-box waiting-box">
            <div className="waiting-spinner" />
            <h3>Waiting for Mentor...</h3>
            <p>
              Your request has been sent to{' '}
              <strong>{waitingSession.mentorName}</strong>.
              <br />
              Subject: <span className="gsn-subject">{waitingSession.subject}</span>
            </p>
            <p className="waiting-note">The session will start automatically once they accept.</p>
            <button className="btn-cancel" style={{ marginTop: '8px' }} onClick={handleCancelRequest}>
              Cancel Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindMentor;
