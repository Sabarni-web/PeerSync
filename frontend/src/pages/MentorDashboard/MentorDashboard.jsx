import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import './MentorDashboard.css';

const MentorDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { sessionRequest, clearRequest } = useSocket();

  const [stats, setStats] = useState({ totalSessions: 0, completedSessions: 0, avgRating: 0, totalRatings: 0, totalHours: 0 });
  const [activeSessions, setActiveSessions]   = useState([]);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null); // sessionId currently being accepted/declined

  const fetchData = async () => {
    try {
      const [statsRes, sessRes] = await Promise.allSettled([
        api.get('/mentors/me/stats'),
        api.get('/sessions'),
      ]);

      let calculatedStats = { totalSessions: 0, completedSessions: 0, avgRating: 0, totalRatings: 0, totalHours: 0 };

      if (statsRes.status === 'fulfilled') {
        calculatedStats = { ...calculatedStats, ...statsRes.value.data };
      }

      if (sessRes.status === 'fulfilled') {
        const sessions = sessRes.value.data;
        const active   = sessions.filter(s => s.status === 'active');
        const pending  = sessions.filter(s => s.status === 'pending' && s.mentorId?._id === user?._id || s.mentorId === user?._id);

        setActiveSessions(active);
        setPendingSessions(pending);

        const completed = sessions.filter(s => s.status === 'completed');
        calculatedStats.totalSessions     = completed.length;
        calculatedStats.completedSessions = completed.length;
        const totalMins = completed.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
        calculatedStats.totalHours = Math.round((totalMins / 60) * 10) / 10;
      }

      setStats(calculatedStats);
    } catch (err) {
      console.error('Failed to load mentor dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Re-fetch when a new session_request arrives via socket
  useEffect(() => {
    if (sessionRequest && !sessionRequest.declined) {
      fetchData();
    }
  }, [sessionRequest]);

  const handleAccept = async (sessionId) => {
    setActingOn(sessionId);
    try {
      await api.put(`/sessions/${sessionId}/accept`);
      clearRequest();
      navigate(`/chat/${sessionId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept session');
    } finally {
      setActingOn(null);
    }
  };

  const handleDecline = async (sessionId) => {
    setActingOn(sessionId);
    try {
      await api.put(`/sessions/${sessionId}/decline`);
      setPendingSessions(prev => prev.filter(s => s._id !== sessionId));
      clearRequest();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline session');
    } finally {
      setActingOn(null);
    }
  };

  // Live elapsed time for active sessions
  const getElapsed = (startedAt) => {
    if (!startedAt) return '0m';
    const mins = Math.floor((Date.now() - new Date(startedAt)) / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  return (
    <div className="page">
      <div className="container">
        <div className="mentor-dash fade-in">
          <div className="md-header">
            <div className="md-header-text">
              <h1>🎓 Mentor Hub</h1>
              <p>Welcome back, Mentor {user?.name?.split(' ')[0]}! Here's your teaching overview.</p>
            </div>
          </div>

          {/* ── Pending Requests ────────────────────────────────────────── */}
          {pendingSessions.length > 0 && (
            <div className="md-pending-section">
              <div className="md-pending-title">
                <span className="pending-pulse" />
                🔔 Incoming Requests ({pendingSessions.length})
              </div>
              <div className="md-pending-list">
                {pendingSessions.map(sess => {
                  const student = sess.studentId?.name || 'A student';
                  const isActing = actingOn === sess._id;
                  return (
                    <div key={sess._id} className="md-pending-card">
                      <div className="mpc-avatar">{student.charAt(0)}</div>
                      <div className="mpc-info">
                        <span className="mpc-student">{student}</span>
                        <span className="mpc-meta">📚 {sess.subject} · {sess.matchScore > 0 ? `${sess.matchScore}% match` : 'Browse request'}</span>
                      </div>
                      <div className="mpc-actions">
                        <button
                          className="mpc-btn mpc-decline"
                          onClick={() => handleDecline(sess._id)}
                          disabled={isActing}
                        >
                          ✕
                        </button>
                        <button
                          className="mpc-btn mpc-accept"
                          onClick={() => handleAccept(sess._id)}
                          disabled={isActing}
                        >
                          {isActing ? '⏳' : '✓ Accept'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Active Sessions Banner ─────────────────────────────────── */}
          {activeSessions.length > 0 && (
            <div className="md-active-sessions">
              <div className="md-active-title">
                <span className="active-pulse" />
                🔴 Active Sessions ({activeSessions.length})
              </div>
              <div className="md-active-list">
                {activeSessions.map(sess => {
                  const student = sess.studentId?.name || 'A student';
                  const elapsed = getElapsed(sess.startedAt);
                  return (
                    <div key={sess._id} className="md-active-card">
                      <div className="mac-avatar">{student.charAt(0)}</div>
                      <div className="mac-info">
                        <span className="mac-student">{student}</span>
                        <span className="mac-meta">📚 {sess.subject} · ⏱ {elapsed}</span>
                      </div>
                      <button
                        className="mac-join-btn"
                        onClick={() => navigate(`/chat/${sess._id}`)}
                      >
                        Join Session →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Stats Grid ────────────────────────────────────────────── */}
          <div className="md-stats-grid">
            <div className="md-stat-card">
              <span className="md-stat-icon">📚</span>
              <span className="md-stat-val">{stats.totalSessions}</span>
              <span className="md-stat-label">Total Sessions</span>
            </div>
            <div className="md-stat-card">
              <span className="md-stat-icon">⭐</span>
              <span className="md-stat-val">{stats.avgRating || '—'}</span>
              <span className="md-stat-label">Avg Rating</span>
            </div>
            <div className="md-stat-card">
              <span className="md-stat-icon">⏰</span>
              <span className="md-stat-val">{stats.totalHours}h</span>
              <span className="md-stat-label">Hours Taught</span>
            </div>
            <div className="md-stat-card">
              <span className="md-stat-icon">💬</span>
              <span className="md-stat-val">{stats.totalRatings}</span>
              <span className="md-stat-label">Reviews</span>
            </div>
          </div>

          {/* ── Teaching Profile ───────────────────────────────────────── */}
          <div className="md-section">
            <h2>Your Teaching Profile</h2>
            <div className="md-profile-info">
              <div className="md-info-row">
                <span>Teaching Style</span>
                <span className="badge">{user?.mentorProfile?.teachingStyle || user?.learningStyle || '—'}</span>
              </div>
              <div className="md-info-row">
                <span>Expertise</span>
                <div className="tag-list">
                  {(user?.mentorProfile?.subjectExpertise || user?.subjectsStrong || [])
                    .filter(s => {
                      if (!user?.quizCompleted || !user?.skillScores) return true;
                      const scoreData = user.skillScores[s] || user.skillScores?.get?.(s);
                      return !scoreData || scoreData.score > 70;
                    })
                    .map((s, i) => (
                    <span key={i} className="tag tag-green">{s}</span>
                  ))}
                </div>
              </div>
              <div className="md-info-row">
                <span>Available Slots</span>
                <span className="text-muted">{user?.mentorProfile?.mentorAvailability?.length || user?.availability?.length || 0} slots/week</span>
              </div>
            </div>
          </div>

          {/* ── Incoming Requests Section ───────────────────────────────── */}
          <div className="md-section">
            <h2>Incoming Requests</h2>
            {pendingSessions.length === 0 && activeSessions.length === 0 ? (
              <div className="md-empty">
                <span>📭</span>
                <p>No pending requests right now.</p>
                <span className="text-muted">When students request your help, they'll appear here.</span>
              </div>
            ) : (
              <div className="md-empty">
                <span>✅</span>
                <p>
                  {pendingSessions.length > 0 && `${pendingSessions.length} pending request${pendingSessions.length > 1 ? 's' : ''}. `}
                  {activeSessions.length > 0 && `${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''} in progress.`}
                </p>
                <span className="text-muted">Check the panels above to take action.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;
