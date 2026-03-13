import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Profile.css';

const SUBJECTS = ['Data Structures', 'Machine Learning', 'Web Development', 'Calculus', 'Database Systems', 'Operating Systems', 'Computer Networks', 'Python', 'Java', 'Statistics'];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    semester: user?.semester || 1,
    learningStyle: user?.learningStyle || '',
  });
  const [saving, setSaving] = useState(false);
  const [mentorLoading, setMentorLoading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/students/profile', form);
      updateUser(form);
      setEditing(false);
    } catch (err) {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleBecomeMentor = async () => {
    setMentorLoading(true);
    try {
      const res = await api.put('/students/become-mentor', {
        teachingStyle: user?.learningStyle,
        subjectExpertise: user?.subjectsStrong || [],
        mentorAvailability: user?.availability || [],
      });
      updateUser({ isMentor: true, mentorProfile: res.data.mentorProfile });
    } catch (err) {
      alert('Failed to become mentor');
    } finally {
      setMentorLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="profile-page fade-in">
          <div className="profile-header-card">
            <div className="profile-avatar">{user?.name?.charAt(0) || '?'}</div>
            <div>
              <h1>{user?.name}</h1>
              <p>{user?.college || 'No college set'} • Semester {user?.semester}</p>
              {user?.isMentor && <span className="mentor-badge">✓ Active Mentor</span>}
            </div>
          </div>

          <div className="profile-sections">
            <div className="profile-section">
              <div className="section-header">
                <h2>Profile Info</h2>
                <button className="btn-edit" onClick={() => setEditing(!editing)}>
                  {editing ? 'Cancel' : '✏️ Edit'}
                </button>
              </div>

              {editing ? (
                <div className="edit-form">
                  <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
                  <div className="form-group"><label>College</label><input value={form.college} onChange={(e) => setForm({...form, college: e.target.value})} /></div>
                  <div className="form-group"><label>Semester</label>
                    <select value={form.semester} onChange={(e) => setForm({...form, semester: Number(e.target.value)})}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              ) : (
                <div className="info-list">
                  <div className="info-row"><span>Email</span><span>{user?.email}</span></div>
                  <div className="info-row"><span>Learning Style</span><span className="badge">{user?.learningStyle || '—'}</span></div>
                  <div className="info-row"><span>Subjects Needed</span><div className="tag-list">{user?.subjectsNeeded?.map((s, i) => <span key={i} className="tag">{s}</span>)}</div></div>
                  <div className="info-row"><span>Strong Subjects</span><div className="tag-list">{user?.subjectsStrong?.length ? user.subjectsStrong.map((s, i) => <span key={i} className="tag tag-green">{s}</span>) : <span className="text-muted">Not set</span>}</div></div>
                </div>
              )}
            </div>

            {!user?.isMentor && (
              <div className="mentor-opt-in">
                <div className="opt-in-content">
                  <span className="opt-in-icon">🎓</span>
                  <div>
                    <h3>Become a Mentor</h3>
                    <p>Share your expertise and help fellow students. Your strong subjects will be used as your teaching areas.</p>
                  </div>
                </div>
                <button className="btn-mentor" onClick={handleBecomeMentor} disabled={mentorLoading}>
                  {mentorLoading ? 'Setting up...' : 'Become a Mentor →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
