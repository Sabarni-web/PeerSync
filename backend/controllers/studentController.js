const User = require('../models/User');

// @desc    Complete onboarding quiz
// @route   PUT /api/students/onboarding
const completeOnboarding = async (req, res) => {
  const { learningStyle, subjectsNeeded, subjectsStrong, availability, gpa } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      learningStyle,
      subjectsNeeded,
      subjectsStrong: subjectsStrong || [],
      availability: availability || [],
      gpa: gpa || 0,
      onboardingComplete: true,
    },
    { new: true }
  );

  res.json({ message: 'Onboarding complete', profile: user });
};

// @desc    Get student profile
// @route   GET /api/students/profile
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user);
};

// @desc    Update student profile
// @route   PUT /api/students/profile
const updateProfile = async (req, res) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json(user);
};

// @desc    Become a mentor (opt-in)
// @route   PUT /api/students/become-mentor
const becomeMentor = async (req, res) => {
  const { teachingStyle, subjectExpertise, mentorAvailability } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      isMentor: true,
      mentorProfile: {
        teachingStyle: teachingStyle || 'Visual',
        subjectExpertise: subjectExpertise || [],
        mentorAvailability: mentorAvailability || [],
        patienceScore: 4.0,
        totalSessions: 0,
        avgRating: 0,
        totalRatings: 0,
      },
    },
    { new: true }
  );

  res.json({ message: 'You are now a mentor!', mentorProfile: user.mentorProfile });
};

module.exports = { completeOnboarding, getProfile, updateProfile, becomeMentor };
