const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Ratings (1-5 scale)
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    helpfulnessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    clarityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    // Qualitative feedback
    styleMatch: {
      type: String,
      enum: ['yes', 'somewhat', 'no'],
      default: 'somewhat',
    },
    wouldRepeat: {
      type: String,
      enum: ['yes', 'maybe', 'no'],
      default: 'maybe',
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
