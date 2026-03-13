import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="container">
        {/* Welcome */}
        <div className="welcome-banner fade-in">
          <div className="welcome-text">
            <h1>👋 Welcome back, {user?.name?.split(' ')[0] || 'there'}!</h1>
            <p>
              {user?.learningStyle
                ? `${user.learningStyle} Learner • Semester ${user.semester}`
                : 'Complete your profile to get started'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions slide-up">
          <Link to="/find-mentor" className="action-card action-primary">
            <span className="action-icon">🔍</span>
            <div>
              <h3>Find a Mentor</h3>
              <p>Get AI-powered mentor recommendations based on your profile</p>
            </div>
            <span className="action-arrow">→</span>
          </Link>

          {!user?.isMentor && (
            <Link to="/profile" className="action-card action-accent">
              <span className="action-icon">🎓</span>
              <div>
                <h3>Become a Mentor</h3>
                <p>Share your knowledge and help other students excel</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>
          )}

          {user?.isMentor && (
            <Link to="/mentor-dashboard" className="action-card action-accent">
              <span className="action-icon">📊</span>
              <div>
                <h3>Mentor Hub</h3>
                <p>Check incoming requests and your mentoring stats</p>
              </div>
              <span className="action-arrow">→</span>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="dashboard-stats slide-up">
          <div className="stat-card">
            <span className="stat-value">0</span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">—</span>
            <span className="stat-label">Avg Rating</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">0h</span>
            <span className="stat-label">Learning Time</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{user?.subjectsNeeded?.length || 0}</span>
            <span className="stat-label">Subjects</span>
          </div>
        </div>

        {/* Profile completion nudge */}
        {!user?.onboardingComplete && (
          <div className="nudge-card slide-up">
            <div className="nudge-text">
              <h3>📝 Complete Your Profile</h3>
              <p>Take a 2-minute quiz so our AI can find your perfect mentor match.</p>
            </div>
            <Link to="/onboarding" className="btn-primary">Take the Quiz →</Link>
          </div>
        )}

        {/* Learning Profile */}
        {user?.onboardingComplete && (
          <div className="profile-summary slide-up">
            <h2>Your Learning Profile</h2>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">Learning Style</span>
                <span className="profile-value badge">{user.learningStyle}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Subjects Needed</span>
                <div className="tag-list">
                  {user.subjectsNeeded?.map((s, i) => (
                    <span key={i} className="tag">{s}</span>
                  ))}
                </div>
              </div>
              <div className="profile-item">
                <span className="profile-label">Strong Subjects</span>
                <div className="tag-list">
                  {user.subjectsStrong?.length > 0
                    ? user.subjectsStrong.map((s, i) => <span key={i} className="tag tag-green">{s}</span>)
                    : <span className="text-muted">Not set yet</span>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
