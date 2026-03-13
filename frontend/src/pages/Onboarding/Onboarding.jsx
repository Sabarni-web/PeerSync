import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Onboarding.css';

const VARK_STYLES = ['Visual', 'Auditory', 'Read-Write', 'Kinesthetic'];
const SUBJECTS = ['Data Structures', 'Machine Learning', 'Web Development', 'Calculus', 'Database Systems', 'Operating Systems', 'Computer Networks', 'Python', 'Java', 'Statistics'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS = ['Morning', 'Afternoon', 'Evening'];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [learningStyle, setLearningStyle] = useState('');
  const [subjectsNeeded, setSubjectsNeeded] = useState([]);
  const [subjectsStrong, setSubjectsStrong] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [gpa, setGpa] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const toggleSubject = (subject, type) => {
    const setter = type === 'needed' ? setSubjectsNeeded : setSubjectsStrong;
    const current = type === 'needed' ? subjectsNeeded : subjectsStrong;
    setter(current.includes(subject) ? current.filter(s => s !== subject) : [...current, subject]);
  };

  const toggleSlot = (slot) => {
    setAvailability(availability.includes(slot) ? availability.filter(s => s !== slot) : [...availability, slot]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.put('/students/onboarding', {
        learningStyle, subjectsNeeded, subjectsStrong, availability, gpa: parseFloat(gpa) || 0,
      });
      updateUser({ ...res.data.profile, onboardingComplete: true });
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card fade-in">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>
        <p className="step-label">Step {step} of 4</p>

        {step === 1 && (
          <div className="step-content">
            <h2>How do you learn best?</h2>
            <p className="step-desc">Select your primary learning style</p>
            <div className="style-grid">
              {VARK_STYLES.map(style => (
                <button key={style} className={`style-btn ${learningStyle === style ? 'active' : ''}`} onClick={() => setLearningStyle(style)}>
                  <span className="style-emoji">{style === 'Visual' ? '👁️' : style === 'Auditory' ? '👂' : style === 'Read-Write' ? '📖' : '🤲'}</span>
                  <span>{style}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2>Subjects I need help with</h2>
            <p className="step-desc">Select the subjects you're struggling with</p>
            <div className="subject-grid">
              {SUBJECTS.map(subj => (
                <button key={subj} className={`subject-btn ${subjectsNeeded.includes(subj) ? 'active' : ''}`} onClick={() => toggleSubject(subj, 'needed')}>
                  {subj}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2>My availability</h2>
            <p className="step-desc">When are you free to study?</p>
            <div className="availability-grid">
              <div className="avail-header"><div></div>{DAYS.map(d => <div key={d} className="avail-day">{d}</div>)}</div>
              {SLOTS.map(slot => (
                <div key={slot} className="avail-row">
                  <div className="avail-slot">{slot}</div>
                  {DAYS.map(day => {
                    const key = `${day}_${slot}`;
                    return (
                      <div key={key} className={`avail-cell ${availability.includes(key) ? 'active' : ''}`} onClick={() => toggleSlot(key)}></div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-content">
            <h2>Almost done!</h2>
            <p className="step-desc">Optional: Tell us more about yourself</p>
            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>GPA (on 4.0 scale)</label>
              <input type="number" value={gpa} onChange={(e) => setGpa(e.target.value)} placeholder="e.g. 3.2" min="0" max="4" step="0.1" />
            </div>
            <h3 style={{ marginTop: 24, marginBottom: 12, fontSize: '1rem' }}>Subjects I'm strong at (optional)</h3>
            <p className="step-desc" style={{ marginBottom: 12 }}>Help us identify you as a future mentor!</p>
            <div className="subject-grid">
              {SUBJECTS.filter(s => !subjectsNeeded.includes(s)).map(subj => (
                <button key={subj} className={`subject-btn green ${subjectsStrong.includes(subj) ? 'active' : ''}`} onClick={() => toggleSubject(subj, 'strong')}>
                  {subj}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="step-actions">
          {step > 1 && <button className="btn-back" onClick={() => setStep(step - 1)}>← Back</button>}
          {step < 4 ? (
            <button className="btn-next" onClick={() => setStep(step + 1)} disabled={step === 1 && !learningStyle}>Next →</button>
          ) : (
            <button className="btn-next" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Complete Setup ✓'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
