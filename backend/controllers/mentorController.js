const User = require('../models/User');
const Feedback = require('../models/Feedback');

// @desc    Get mentor by ID (public profile)
// @route   GET /api/mentors/:id
const getMentorById = async (req, res) => {
  const mentor = await User.findById(req.params.id);

  if (!mentor || !mentor.isMentor) {
    return res.status(404).json({ message: 'Mentor not found' });
  }

  const reviews = await Feedback.find({ mentorId: mentor._id })
    .populate('studentId', 'name')
    .sort('-createdAt')
    .limit(10);

  res.json({
    _id: mentor._id,
    name: mentor.name,
    college: mentor.college,
    semester: mentor.semester,
    mentorProfile: mentor.mentorProfile,
    reviews: reviews.map((r) => ({
      studentName: r.studentId?.name || 'Anonymous',
      overallRating: r.overallRating,
      comment: r.comment,
      date: r.createdAt,
    })),
  });
};

// @desc    Get my mentor stats
// @route   GET /api/mentors/me/stats
const getMyMentorStats = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.isMentor) {
    return res.status(403).json({ message: 'You are not a mentor' });
  }

  res.json({
    totalSessions: user.mentorProfile?.totalSessions || 0,
    avgRating: user.mentorProfile?.avgRating || 0,
    totalRatings: user.mentorProfile?.totalRatings || 0,
    totalHours: Math.round((user.mentorProfile?.totalSessions || 0) * 1.5 * 10) / 10,
  });
};

// @desc    Get all mentors
// @route   GET /api/mentors
const getAllMentors = async (req, res) => {
  const mentors = await User.find({ isMentor: true })
    .select('name college semester mentorProfile')
    .limit(50);
  res.json(mentors);
};

module.exports = { getMentorById, getMyMentorStats, getAllMentors };
