const Session = require('../models/Session');
const Message = require('../models/Message');

// @desc    Request a session (student → mentor) — status starts as 'pending'
// @route   POST /api/sessions/start
const startSession = async (req, res) => {
  const { mentorId, subject, matchScore } = req.body;

  if (!mentorId || !subject) {
    return res.status(400).json({ message: 'mentorId and subject are required' });
  }

  // Prevent duplicate pending or active session between same pair
  const existing = await Session.findOne({
    studentId: req.user._id,
    mentorId,
    status: { $in: ['pending', 'active'] },
  }).populate('studentId', 'name email').populate('mentorId', 'name email mentorProfile');

  if (existing) {
    return res.status(200).json({ ...existing.toObject(), resumed: true });
  }

  const session = await Session.create({
    studentId:  req.user._id,
    mentorId,
    subject,
    matchScore: matchScore || 0,
    status:     'pending',         // ← waits for mentor to accept
  });

  const populated = await Session.findById(session._id)
    .populate('studentId', 'name email')
    .populate('mentorId', 'name email mentorProfile');

  // Notify mentor via Socket.IO
  const io = req.app.locals.io;
  if (io) {
    io.to(`mentor_${mentorId}`).emit('session_request', {
      sessionId:   session._id.toString(),
      studentName: req.user.name,
      studentId:   req.user._id.toString(),
      subject,
      matchScore:  matchScore || 0,
    });
  }

  res.status(201).json(populated);
};


// @desc    Mentor accepts a pending session
// @route   PUT /api/sessions/:id/accept
const acceptSession = async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  if (session.mentorId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the assigned mentor can accept this session' });
  }

  if (session.status !== 'pending') {
    return res.status(400).json({ message: `Session is already ${session.status}` });
  }

  session.status    = 'active';
  session.startedAt = new Date();
  await session.save();

  // Notify both participants — they'll navigate to /chat/:sessionId
  const io = req.app.locals.io;
  if (io) {
    io.to(session._id.toString()).emit('session_accepted', {
      sessionId: session._id.toString(),
    });
    // Also push to the student's private room (they may not be in session room yet)
    io.to(`student_${session.studentId.toString()}`).emit('session_accepted', {
      sessionId: session._id.toString(),
    });
  }

  res.json({ message: 'Session accepted', sessionId: session._id });
};


// @desc    Mentor declines a pending session
// @route   PUT /api/sessions/:id/decline
const declineSession = async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  if (session.mentorId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the assigned mentor can decline this session' });
  }

  if (session.status !== 'pending') {
    return res.status(400).json({ message: `Session is already ${session.status}` });
  }

  session.status = 'declined';
  await session.save();

  // Notify the student
  const io = req.app.locals.io;
  if (io) {
    io.to(`student_${session.studentId.toString()}`).emit('session_declined', {
      sessionId:   session._id.toString(),
      mentorName:  req.user.name,
    });
  }

  res.json({ message: 'Session declined' });
};


// @desc    End a session — emit 'session_ended' to both participants via Socket
// @route   PUT /api/sessions/:id/end
const endSession = async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  const isParticipant =
    session.studentId.toString() === req.user._id.toString() ||
    session.mentorId.toString()  === req.user._id.toString();

  if (!isParticipant) {
    return res.status(403).json({ message: 'Not authorized to end this session' });
  }

  session.status          = 'completed';
  session.endedAt         = new Date();
  session.durationMinutes = Math.round((session.endedAt - session.startedAt) / 60000);
  await session.save();

  // Broadcast to everyone in the session room so the other participant gets redirected
  const io = req.app.locals.io;
  if (io) {
    io.to(session._id.toString()).emit('session_ended', {
      sessionId:   session._id.toString(),
      endedBy:     req.user._id.toString(),
      endedByName: req.user.name || 'Your partner',
    });
  }

  res.json(session);
};


// @desc    Get my sessions
// @route   GET /api/sessions
const getMySessions = async (req, res) => {
  const sessions = await Session.find({
    $or: [{ studentId: req.user._id }, { mentorId: req.user._id }],
  })
    .populate('studentId', 'name email')
    .populate('mentorId', 'name email mentorProfile')
    .sort('-createdAt');

  res.json(sessions);
};


// @desc    Get messages for a session
// @route   GET /api/sessions/:id/messages
const getSessionMessages = async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  const isParticipant =
    session.studentId.toString() === req.user._id.toString() ||
    session.mentorId.toString()  === req.user._id.toString();

  if (!isParticipant) {
    return res.status(403).json({ message: 'Not authorized to view this session' });
  }

  const messages = await Message.find({ sessionId: req.params.id })
    .populate('senderId', 'name')
    .sort('createdAt');

  res.json(messages);
};


// @desc    Get a single session by ID
// @route   GET /api/sessions/:id
const getSession = async (req, res) => {
  const session = await Session.findById(req.params.id)
    .populate('studentId', 'name email')
    .populate('mentorId', 'name email mentorProfile');

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  // Safe participant check (handles both populated object and raw ObjectId)
  const studentId = session.studentId?._id?.toString() || session.studentId?.toString();
  const mentorId  = session.mentorId?._id?.toString()  || session.mentorId?.toString();

  if (studentId !== req.user._id.toString() && mentorId !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  res.json(session);
};

module.exports = { startSession, acceptSession, declineSession, endSession, getMySessions, getSessionMessages, getSession };
