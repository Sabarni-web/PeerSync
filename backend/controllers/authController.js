const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, college, semester } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      college: college || '',
      semester: semester || 1,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      college: user.college,
      semester: user.semester,
      onboardingComplete: user.onboardingComplete,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      college: user.college,
      semester: user.semester,
      learningStyle: user.learningStyle,
      onboardingComplete: user.onboardingComplete,
      isMentor: user.isMentor,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      college: user.college,
      semester: user.semester,
      learningStyle: user.learningStyle,
      subjectsNeeded: user.subjectsNeeded,
      subjectsStrong: user.subjectsStrong,
      availability: user.availability,
      gpa: user.gpa,
      isMentor: user.isMentor,
      mentorProfile: user.mentorProfile,
      onboardingComplete: user.onboardingComplete,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = { signup, login, getMe };
