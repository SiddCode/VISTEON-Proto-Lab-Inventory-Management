const express = require('express');
const router = express.Router();
const {
  getOutwardReport,
  exportOutwardCsv,
} = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

router.get('/outward', protect, getOutwardReport);
router.get('/outward/export', protect, exportOutwardCsv);

module.exports = router;
