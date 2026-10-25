const express = require('express');
const router = express.Router();
const seedDatabase = require('../utils/seedData');
const { protect, authorize } = require('../middleware/auth');

// @desc    Trigger seed data reset
// @route   POST /api/seed
// @access  Public or Admin (can be called to initialize application)
router.post('/', async (req, res, next) => {
  try {
    await seedDatabase();
    res.json({
      success: true,
      message: 'Database seeded successfully with VISTEON sample inventory and accounts.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
