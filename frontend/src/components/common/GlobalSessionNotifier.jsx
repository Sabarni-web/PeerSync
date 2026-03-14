import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { useState } from 'react';
import './GlobalSessionNotifier.css';

const GlobalSessionNotifier = () => {
  const { user }                         = useAuth();
  const { sessionRequest, clearRequest } = useSocket();
  const [acting, setActing]              = useState(false);

  if (!sessionRequest) return null;

  // ── Student: their request was declined ───────────────────────────────────
  if (sessionRequest.declined) {
    return (
      <div className="gsn-overlay">
        <div className="gsn-box gsn-declined">
          <div className="gsn-icon">😔</div>
          <h3>Session Request Declined</h3>
          <p>
            <strong>{sessionRequest.mentorName}</strong> is not available right now.
            <br />Try requesting a different mentor!
          </p>
          <button className="gsn-btn gsn-btn-close" onClick={clearRequest}>Got it</button>
        </div>
      </div>
    );
  }

  // ── Mentor: incoming session request ─────────────────────────────────────
  if (!user?.isMentor) return null;  // only render for mentors

  const handleAccept = async () => {
    setActing(true);
    try {
      await api.put(`/sessions/${sessionRequest.sessionId}/accept`);
      clearRequest();
      // Navigation is handled by socket 'session_accepted' on the mentor's own client
      window.location.href = `/chat/${sessionRequest.sessionId}`;
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept session');
      setActing(false);
    }
  };

  const handleDecline = async () => {
    setActing(true);
    try {
      await api.put(`/sessions/${sessionRequest.sessionId}/decline`);
    } catch {
      // ignore errors — still clear on UI
    } finally {
      clearRequest();
      setActing(false);
    }
  };

  return (
    <div className="gsn-overlay">
      <div className="gsn-box gsn-request">
        <div className="gsn-pulse-ring" />
        <div className="gsn-icon">📚</div>
        <h3>New Session Request!</h3>
        <div className="gsn-student-info">
          <div className="gsn-avatar">{sessionRequest.studentName?.charAt(0)}</div>
          <div>
            <strong>{sessionRequest.studentName}</strong>
            <p>wants to learn <span className="gsn-subject">{sessionRequest.subject}</span></p>
            {sessionRequest.matchScore > 0 && (
              <span className="gsn-match">{sessionRequest.matchScore}% match</span>
            )}
          </div>
        </div>
        <div className="gsn-actions">
          <button
            className="gsn-btn gsn-btn-decline"
            onClick={handleDecline}
            disabled={acting}
          >
            ✕ Decline
          </button>
          <button
            className="gsn-btn gsn-btn-accept"
            onClick={handleAccept}
            disabled={acting}
          >
            {acting ? '⏳ ...' : '✓ Accept Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalSessionNotifier;
