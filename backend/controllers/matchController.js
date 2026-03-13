const axios = require('axios');
const User = require('../models/User');
const Session = require('../models/Session');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// @desc    Find mentors using AI
// @route   POST /api/matches/find
const findMentors = async (req, res) => {
  const student = await User.findById(req.user._id);
  const { topN = 3 } = req.body;

  try {
    // Call ML service
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/ml/recommend`, {
      student_id: student._id.toString(),
      learning_style: student.learningStyle,
      subjects_needed: student.subjectsNeeded,
      availability: student.availability,
      gpa: student.gpa,
      semester: student.semester,
      top_n: topN,
    });

    const recommendations = mlResponse.data.recommendations || [];

    res.json({
      student: student.name,
      recommendations,
      source: 'ai',
    });
  } catch (err) {
    console.log('⚠️ ML Service unavailable, using fallback');

    // Fallback: return mentors from MongoDB
    const mentors = await User.find({
      isMentor: true,
      _id: { $ne: student._id },
    })
      .select('name college semester mentorProfile')
      .limit(topN);

    const recommendations = mentors.map((m, i) => ({
      mentor_id: m._id,
      name: m.name,
      match_percentage: Math.round(90 - i * 7),
      reasons: [
        `${m.mentorProfile?.teachingStyle || 'Adaptive'} teaching approach`,
        `Expert in ${m.mentorProfile?.subjectExpertise?.[0] || 'multiple subjects'}`,
        'Available and ready to help',
      ],
      mentor_details: {
        teaching_style: m.mentorProfile?.teachingStyle,
        subject_expertise: m.mentorProfile?.subjectExpertise,
        semester: m.semester,
        patience_score: m.mentorProfile?.patienceScore || 4.5,
      },
    }));

    res.json({
      student: student.name,
      recommendations,
      source: 'fallback',
    });
  }
};

// @desc    Get recent matches
// @route   GET /api/matches/recent
const getRecentMatches = async (req, res) => {
  const sessions = await Session.find({
    $or: [{ studentId: req.user._id }, { mentorId: req.user._id }],
  })
    .populate('studentId', 'name')
    .populate('mentorId', 'name')
    .sort('-createdAt')
    .limit(10);

  res.json(sessions);
};

module.exports = { findMentors, getRecentMatches };
