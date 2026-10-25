const express = require('express');
const router = express.Router();
const {
  receiveStock,
  issueStock,
  getTransactions,
  getTransactionById,
} = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

router.post('/inward', protect, receiveStock);
router.post('/outward', protect, issueStock);
router.get('/transactions', protect, getTransactions);
router.get('/transactions/:id', protect, getTransactionById);

module.exports = router;
