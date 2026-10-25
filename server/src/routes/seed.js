const express = require('express');
const router = express.Router();
const seedDatabase = require('../utils/seedData');
const { protect, authorize } = require('../middleware/auth');

// @desc    Trigger seed data reset
// @route   POST /api/seed
// @access  Public or Admin (can be called to initialize application)
router.post('/', async (req, res, next) => {
  try {
    const forceReset = req.query.reset === 'true';
    await seedDatabase({ forceReset });
    res.json({
      success: true,
      message: forceReset
        ? 'Database reset and seeded with VISTEON sample inventory and accounts.'
        : 'Database verified idempotently. Existing data preserved.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
