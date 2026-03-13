import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-text">
            <span className="hero-badge">🚀 AI-Powered Education</span>
            <h1>Find Your Perfect <span className="gradient-text">Study Partner</span> with AI</h1>
            <p>PeerSync matches struggling students with the most compatible peer mentors using AI — based on learning style, schedule, personality, and academic needs.</p>
            <div className="hero-actions">
              <Link to="/signup" className="btn-primary">Get Started Free →</Link>
              <a href="#how-it-works" className="btn-secondary">See How It Works</a>
            </div>
            <div className="hero-stats">
              <div className="stat"><span className="stat-num">94%</span><span className="stat-label">Match Accuracy</span></div>
              <div className="stat"><span className="stat-num">500+</span><span className="stat-label">Students Matched</span></div>
              <div className="stat"><span className="stat-num">3×</span><span className="stat-label">More Engagement</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="floating-card card-1">
                <div className="fc-avatar">🧑‍🎓</div>
                <div><strong>Riya Sharma</strong><br/><span>94% Match • Visual Learner</span></div>
              </div>
              <div className="floating-card card-2">
                <div className="fc-avatar">👨‍💻</div>
                <div><strong>Arjun Patel</strong><br/><span>87% Match • DSA Expert</span></div>
              </div>
              <div className="floating-card card-3">
                <div className="fc-avatar">👩‍🔬</div>
                <div><strong>Sneha Roy</strong><br/><span>81% Match • DBMS Specialist</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How PeerSync Works</h2>
          <p className="section-subtitle">Three simple steps to find your ideal learning partner</p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">📝</div>
              <div className="step-num">01</div>
              <h3>Take the Quiz</h3>
              <p>A 2-minute learning style assessment using the VARK model to understand how you learn best.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">🤖</div>
              <div className="step-num">02</div>
              <h3>AI Matches You</h3>
              <p>Our hybrid recommendation engine analyzes 6 dimensions of compatibility to find your top 3 mentors.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">💬</div>
              <div className="step-num">03</div>
              <h3>Learn Together</h3>
              <p>Connect via real-time chat. After each session, your feedback makes future matches even smarter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <h2>Why PeerSync?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">🧬</span>
              <h3>Holistic Profiling</h3>
              <p>We analyze learning style, schedule, personality, and academic history — not just the subject.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔄</span>
              <h3>Adaptive AI</h3>
              <p>Every rating feeds back into the model. The system gets smarter with every session.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🤝</span>
              <h3>Peer-to-Peer</h3>
              <p>Free, relatable help from fellow students. Anyone can be both a learner and a mentor.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">⚡</span>
              <h3>Real-Time Chat</h3>
              <p>Instant WebSocket-powered messaging with your matched mentor. No delays.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to find your perfect mentor?</h2>
            <p>Join PeerSync and transform the way you learn — for free.</p>
            <Link to="/signup" className="btn-primary btn-lg">Get Started →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="logo-icon">⚡</span>
            <span className="gradient-text" style={{ fontWeight: 700, fontSize: '1.2rem' }}>PeerSync</span>
            <p>AI-Powered Peer Mentor Matching</p>
          </div>
          <div className="footer-links">
            <span>Built for Hack Among Us 2026 🏆</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
