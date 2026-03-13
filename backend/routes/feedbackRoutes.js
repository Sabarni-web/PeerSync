const express = require('express');
const router = express.Router();
const { submitFeedback, getMentorFeedbacks } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitFeedback);
router.get('/mentor/:mentorId', protect, getMentorFeedbacks);

module.exports = router;
