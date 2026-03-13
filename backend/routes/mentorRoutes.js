const express = require('express');
const router = express.Router();
const {
  getMentorById,
  getMyMentorStats,
  getAllMentors,
} = require('../controllers/mentorController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllMentors);
router.get('/me/stats', protect, getMyMentorStats);
router.get('/:id', protect, getMentorById);

module.exports = router;
