const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getRecentTransactions,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, getDashboardSummary);
router.get('/recent-transactions', protect, getRecentTransactions);

module.exports = router;
