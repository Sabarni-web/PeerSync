const Feedback = require('../models/Feedback');
const User = require('../models/User');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// @desc    Submit feedback for a session
// @route   POST /api/feedback
const submitFeedback = async (req, res) => {
  const {
    sessionId,
    mentorId,
    overallRating,
    helpfulnessRating,
    clarityRating,
    styleMatch,
    wouldRepeat,
    comment,
  } = req.body;

  // Save feedback
  const feedback = await Feedback.create({
    sessionId,
    studentId: req.user._id,
    mentorId,
    overallRating,
    helpfulnessRating: helpfulnessRating || 3,
    clarityRating: clarityRating || 3,
    styleMatch: styleMatch || 'somewhat',
    wouldRepeat: wouldRepeat || 'maybe',
    comment: comment || '',
  });

  // Update mentor's aggregate stats
  const allFeedbacks = await Feedback.find({ mentorId });
  const avgRating =
    allFeedbacks.reduce((sum, f) => sum + f.overallRating, 0) / allFeedbacks.length;

  await User.findByIdAndUpdate(mentorId, {
    'mentorProfile.avgRating': Math.round(avgRating * 10) / 10,
    'mentorProfile.totalRatings': allFeedbacks.length,
    $inc: { 'mentorProfile.totalSessions': 1 },
  });

  // Send to ML service for retraining (fire and forget)
  try {
    await axios.post(`${ML_SERVICE_URL}/api/ml/feedback`, {
      student_id: req.user._id.toString(),
      mentor_id: mentorId,
      rating: overallRating,
    });
  } catch {
    console.log('⚠️ ML service unavailable for feedback sync');
  }

  res.status(201).json({ message: 'Feedback submitted', feedback });
};

// @desc    Get feedbacks for a mentor
// @route   GET /api/feedback/mentor/:mentorId
const getMentorFeedbacks = async (req, res) => {
  const feedbacks = await Feedback.find({ mentorId: req.params.mentorId })
    .populate('studentId', 'name')
    .sort('-createdAt');

  res.json(feedbacks);
};

module.exports = { submitFeedback, getMentorFeedbacks };
