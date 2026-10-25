const express = require('express');
const router = express.Router();
const { login, getMe, register, updateProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', (req, res, next) => {
  console.log(`[Auth Route] Incoming POST /api/auth/login from IP: ${req.ip}`);
  next();
}, login);
router.get('/me', protect, getMe);
router.post('/register', protect, authorize('ADMIN'), register);
router.put('/profile', protect, updateProfile);

module.exports = router;
