const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password in queries by default
    },
    college: {
      type: String,
      trim: true,
      default: '',
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      default: 1,
    },

    // --- Learning Profile (filled during onboarding) ---
    learningStyle: {
      type: String,
      enum: ['Visual', 'Auditory', 'Read-Write', 'Kinesthetic', ''],
      default: '',
    },
    subjectsNeeded: {
      type: [String], // Subjects the student struggles with
      default: [],
    },
    subjectsStrong: {
      type: [String], // Subjects the student could mentor in
      default: [],
    },
    availability: {
      type: [String], // Array of 'Day_Slot' strings, e.g., ['Mon_Morning', 'Wed_Afternoon']
      default: [],
    },
    gpa: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },

    // --- Mentor Status ---
    isMentor: {
      type: Boolean,
      default: false,
    },
    mentorProfile: {
      teachingStyle: {
        type: String,
        enum: ['Visual', 'Auditory', 'Read-Write', 'Kinesthetic', ''],
        default: '',
      },
      subjectExpertise: {
        type: [String],
        default: [],
      },
      mentorAvailability: {
        type: [String],
        default: [],
      },
      patienceScore: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      },
      totalSessions: {
        type: Number,
        default: 0,
      },
      avgRating: {
        type: Number,
        default: 0,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
    },

    // --- Profile Completion ---
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
