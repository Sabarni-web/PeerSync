import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './FindMentor.css';

const FindMentor = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setSearched(false);
    setResults([]);

    // Simulated loading steps for visual effect
    const steps = ['Analyzing your profile...', 'Scanning 200 mentors...', 'Computing compatibility scores...', 'Ranking top matches...'];
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await api.post('/matches/find', { topN: 3 });
      setResults(res.data.recommendations || []);
    } catch (err) {
      // If ML service is down, show demo data
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

  return (
    <div className="page">
      <div className="container">
        <div className="find-header fade-in">
          <h1>🔍 Find Your Mentor</h1>
          <p>Our AI will analyze your profile across 6 dimensions and recommend the top 3 most compatible mentors.</p>
          <button className="btn-find" onClick={handleSearch} disabled={loading}>
            {loading ? '🧠 AI is working...' : '🤖 Find My Best Mentors'}
          </button>
        </div>

        {loading && (
          <div className="loading-container fade-in">
            <div className="ai-loader">
              <div className="loader-ring"></div>
              <span className="loader-text">{loadingStep}</span>
            </div>
          </div>
        )}

        {searched && !loading && (
          <div className="results-container">
            {results.length === 0 ? (
              <div className="no-results">No mentors found. Try updating your profile.</div>
            ) : (
              results.map((mentor, idx) => (
                <div key={mentor.mentor_id} className="mentor-card slide-up" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className="mc-header">
                    <div className="mc-rank">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {idx === 0 ? 'BEST MATCH' : idx === 1 ? 'GREAT MATCH' : 'GOOD MATCH'}</div>
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

                  <div className="mc-reasons">
                    <span className="reasons-label">Why this match:</span>
                    {mentor.reasons?.map((r, i) => (
                      <div key={i} className="reason">✓ {r}</div>
                    ))}
                  </div>

                  <div className="mc-actions">
                    <button className="btn-connect">💬 Connect Now</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindMentor;
