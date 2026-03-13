const express = require('express');
const router = express.Router();
const { startSession, endSession, getMySessions } = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.post('/start', protect, startSession);
router.put('/:id/end', protect, endSession);
router.get('/', protect, getMySessions);

module.exports = router;
