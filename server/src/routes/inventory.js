const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
});

const {
  getInventory,
  getInventoryById,
  createPart,
  updatePart,
  deletePart,
} = require('../controllers/inventoryController');

const {
  previewImport,
  executeImport,
  exportPrimaryExcel,
  exportEnhancedExcel,
} = require('../controllers/excelController');

const { protect, authorize } = require('../middleware/auth');

// Export routes (Must be before /:id)
router.get('/export/excel', protect, exportPrimaryExcel);
router.get('/export/enhanced', protect, exportEnhancedExcel);

// Import routes (Must be before /:id)
router.post('/import/preview', protect, upload.single('file'), previewImport);
router.post('/import/confirm', protect, executeImport);

// Base inventory routes
router.route('/')
  .get(protect, getInventory)
  .post(protect, createPart);

// Single record routes
router.route('/:id')
  .get(protect, getInventoryById)
  .patch(protect, updatePart)
  .delete(protect, authorize('ADMIN'), deletePart);

module.exports = router;
