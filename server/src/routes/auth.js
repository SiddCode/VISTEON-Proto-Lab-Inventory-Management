const express = require('express');
const router = express.Router();
const { login, getMe, register, updateProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/register', protect, authorize('ADMIN'), register);
router.put('/profile', protect, updateProfile);

module.exports = router;
