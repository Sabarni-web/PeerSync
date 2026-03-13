import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import './MentorProfile.css';

const MentorProfile = () => {
  const { id } = useParams();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentor = async () => {
      try {
        const res = await api.get(`/mentors/${id}`);
        setMentor(res.data);
      } catch {
        // Demo fallback
        setMentor({
          name: 'Demo Mentor', college: 'Heritage Institute', semester: 6,
          mentorProfile: { teachingStyle: 'Visual', subjectExpertise: ['Data Structures', 'Algorithms'], avgRating: 4.7, totalSessions: 23, totalRatings: 18, patienceScore: 4.8 },
          reviews: [
            { studentName: 'Ravi K.', overallRating: 5, comment: 'Explained recursion so clearly!', date: new Date() },
            { studentName: 'Priya S.', overallRating: 4, comment: 'Great session, very patient.', date: new Date() },
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchMentor();
  }, [id]);

  if (loading) return <div className="page"><div className="container"><p>Loading...</p></div></div>;
  if (!mentor) return <div className="page"><div className="container"><p>Mentor not found</p></div></div>;

  const mp = mentor.mentorProfile || {};

  return (
    <div className="page">
      <div className="container">
        <div className="mentor-profile-page fade-in">
          <div className="mp-header">
            <div className="mp-avatar">{mentor.name?.charAt(0)}</div>
            <div>
              <h1>{mentor.name}</h1>
              <p>{mentor.college} • Semester {mentor.semester}</p>
              <span className="mp-style-badge">{mp.teachingStyle} Teacher</span>
            </div>
            <div className="mp-rating-big">
              <span className="mp-rating-num">{mp.avgRating || '—'}</span>
              <span className="mp-rating-star">★</span>
              <span className="mp-rating-count">({mp.totalRatings || 0} reviews)</span>
            </div>
          </div>

          <div className="mp-stats-row">
            <div className="mp-stat"><span className="mp-stat-val">{mp.totalSessions || 0}</span><span>Sessions</span></div>
            <div className="mp-stat"><span className="mp-stat-val">{mp.patienceScore || '—'}</span><span>Patience</span></div>
            <div className="mp-stat"><span className="mp-stat-val">{mp.subjectExpertise?.length || 0}</span><span>Subjects</span></div>
          </div>

          <div className="mp-section">
            <h2>Expertise</h2>
            <div className="tag-list">{mp.subjectExpertise?.map((s, i) => <span key={i} className="tag">{s}</span>)}</div>
          </div>

          <div className="mp-section">
            <h2>Reviews</h2>
            {mentor.reviews?.length > 0 ? (
              <div className="reviews-list">
                {mentor.reviews.map((r, i) => (
                  <div key={i} className="review-card">
                    <div className="review-header">
                      <strong>{r.studentName}</strong>
                      <span className="review-stars">{'★'.repeat(r.overallRating)}{'☆'.repeat(5 - r.overallRating)}</span>
                    </div>
                    <p>{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted">No reviews yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorProfile;
