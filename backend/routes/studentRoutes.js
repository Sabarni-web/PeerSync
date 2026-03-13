const express = require('express');
const router = express.Router();
const {
  completeOnboarding,
  getProfile,
  updateProfile,
  becomeMentor,
} = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

router.put('/onboarding', protect, completeOnboarding);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/become-mentor', protect, becomeMentor);

module.exports = router;
