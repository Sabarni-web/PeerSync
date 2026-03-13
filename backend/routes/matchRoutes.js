const express = require('express');
const router = express.Router();
const { findMentors, getRecentMatches } = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.post('/find', protect, findMentors);
router.get('/recent', protect, getRecentMatches);

module.exports = router;
