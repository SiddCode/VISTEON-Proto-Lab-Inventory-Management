const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getSettings);
router.patch('/', protect, authorize('ADMIN'), updateSettings);

module.exports = router;
