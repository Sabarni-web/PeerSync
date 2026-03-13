const Session = require('../models/Session');

// @desc    Start a session
// @route   POST /api/sessions/start
const startSession = async (req, res) => {
  const { mentorId, subject, matchScore } = req.body;

  const session = await Session.create({
    studentId: req.user._id,
    mentorId,
    subject,
    matchScore: matchScore || 0,
    status: 'active',
    startTime: new Date(),
  });

  res.status(201).json(session);
};

// @desc    End a session
// @route   PUT /api/sessions/:id/end
const endSession = async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  session.status = 'completed';
  session.endTime = new Date();
  session.duration = Math.round((session.endTime - session.startTime) / 60000); // minutes
  await session.save();

  res.json(session);
};

// @desc    Get my sessions
// @route   GET /api/sessions
const getMySessions = async (req, res) => {
  const sessions = await Session.find({
    $or: [{ studentId: req.user._id }, { mentorId: req.user._id }],
  })
    .populate('studentId', 'name')
    .populate('mentorId', 'name')
    .sort('-createdAt');

  res.json(sessions);
};

module.exports = { startSession, endSession, getMySessions };
