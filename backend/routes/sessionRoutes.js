const express = require('express');
const router = express.Router();
const {
  startSession,
  acceptSession,
  declineSession,
  endSession,
  getMySessions,
  getSessionMessages,
  getSession,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.post('/start',           protect, startSession);
router.get('/',                 protect, getMySessions);
router.get('/:id',              protect, getSession);
router.put('/:id/accept',       protect, acceptSession);
router.put('/:id/decline',      protect, declineSession);
router.put('/:id/end',          protect, endSession);
router.get('/:id/messages',     protect, getSessionMessages);

module.exports = router;
