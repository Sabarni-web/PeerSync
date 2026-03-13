import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './MentorDashboard.css';

const MentorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalSessions: 0, completedSessions: 0, avgRating: 0, totalRatings: 0, totalHours: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/mentors/me/stats');
        setStats(res.data);
      } catch {
        // Demo fallback
        setStats({ totalSessions: 23, completedSessions: 20, avgRating: 4.7, totalRatings: 18, totalHours: 31.5 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
                  {(user?.mentorProfile?.subjectExpertise || user?.subjectsStrong || []).map((s, i) => (
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

          <div className="md-section">
            <h2>Incoming Requests</h2>
            <div className="md-empty">
              <span>📭</span>
              <p>No pending requests right now.</p>
              <span className="text-muted">When students request your help, they'll appear here.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;
