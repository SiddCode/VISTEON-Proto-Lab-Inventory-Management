const InventoryRecord = require('../models/InventoryRecord');
const StockTransaction = require('../models/StockTransaction');
const { TRANSACTION_TYPES } = require('../config/constants');
const { generateTxnId } = require('./inventoryController');

// @desc    Receive additional stock for an existing part (Inward Receipt)
// @route   POST /api/stock/inward
// @access  Private
const receiveStock = async (req, res, next) => {
  try {
    const {
      inventoryRecordId,
      quantity,
      rack,
      bin,
      storageBox,
      remarks,
      referenceNumber,
      inwardDate,
    } = req.body;

    if (!inventoryRecordId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Inventory Record ID and Quantity',
      });
    }

    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Received quantity must be a positive number greater than zero',
      });
    }

    // Atomic update to prevent race conditions
    const updateFields = {
      $inc: { availableQuantity: parsedQty },
      $set: {
        lastInwardDate: inwardDate ? new Date(inwardDate) : new Date(),
        updatedBy: req.user?._id,
      },
    };

    // If rack/bin updated
    if (rack && rack.trim()) {
      updateFields.$set.rack = rack.trim().toUpperCase();
    }
    if (bin && bin.trim()) {
      updateFields.$set.bin = bin.trim().toUpperCase();
    }
    if (storageBox && storageBox.trim() && (!rack || !bin)) {
      if (storageBox.includes('/')) {
        const parts = storageBox.split('/');
        updateFields.$set.rack = parts[0].trim().toUpperCase();
        updateFields.$set.bin = parts[1].trim().toUpperCase();
      } else {
        updateFields.$set.bin = storageBox.trim().toUpperCase();
      }
    }

    const existingRecord = await InventoryRecord.findOne({ _id: inventoryRecordId, active: true });
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found or inactive',
      });
    }

    const finalRack = updateFields.$set.rack || existingRecord.rack || 'RACK-01';
    const finalBin = updateFields.$set.bin || existingRecord.bin || 'BIN-01';
    updateFields.$set.storageBox = `${finalRack} / ${finalBin}`;

    const updatedRecord = await InventoryRecord.findOneAndUpdate(
      { _id: inventoryRecordId, active: true },
      updateFields,
      { new: true }
    );

    const effectiveDate = inwardDate ? new Date(inwardDate) : new Date();

    // Create immutable stock transaction
    const transaction = await StockTransaction.create({
      transactionId: generateTxnId(TRANSACTION_TYPES.INWARD),
      type: TRANSACTION_TYPES.INWARD,
      inventoryRecord: updatedRecord._id,
      partNumber: updatedRecord.partNumber,
      mpn: updatedRecord.mpn,
      trackingId: updatedRecord.trackingId,
      barcode: updatedRecord.barcode,
      program: updatedRecord.program,
      rack: updatedRecord.rack,
      bin: updatedRecord.bin,
      storageBox: updatedRecord.storageBox,
      quantity: parsedQty,
      transactionDate: effectiveDate,
      referenceNumber: referenceNumber ? referenceNumber.trim() : '',
      remarks: remarks ? remarks.trim() : 'Stock Inward Receipt',
      processedBy: req.user?._id,
      processedByName: req.user?.name || 'System Operator',
    });

    res.status(201).json({
      success: true,
      message: `Successfully received ${parsedQty} units for Part ${updatedRecord.partNumber}. New available stock: ${updatedRecord.availableQuantity}.`,
      item: updatedRecord,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Issue / Dispatch components (Outward)
// @route   POST /api/stock/outward
// @access  Private
const issueStock = async (req, res, next) => {
  try {
    const {
      inventoryRecordId,
      trackingId,
      barcode,
      quantity,
      recipient,
      referenceNumber,
      remarks,
      outwardDate,
    } = req.body;

    // Must provide either inventoryRecordId, trackingId, or barcode
    if (!inventoryRecordId && !trackingId && !barcode) {
      return res.status(400).json({
        success: false,
        message: 'Component identifier (Barcode, Tracking ID, or Inventory ID) is required',
      });
    }

    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Outward quantity must be a positive number greater than zero',
      });
    }

    // Build query identifier
    const filter = { active: true };
    if (inventoryRecordId) {
      filter._id = inventoryRecordId;
    } else {
      const cleanIdentifier = (barcode || trackingId).trim().toUpperCase();
      filter.$or = [
        { trackingId: cleanIdentifier },
        { barcode: cleanIdentifier },
        { partNumber: cleanIdentifier },
      ];
    }

    // First check existing record state
    const existingRecord = await InventoryRecord.findOne(filter);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: `No active inventory record found matching the scanned barcode or Tracking ID. Please verify spelling or scan again.`,
      });
    }

    if (existingRecord.availableQuantity < parsedQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Requested: ${parsedQty}, Currently Available: ${existingRecord.availableQuantity} for Part ${existingRecord.partNumber} (${existingRecord.trackingId}).`,
        availableQuantity: existingRecord.availableQuantity,
      });
    }

    // ATOMIC DEDUCTION: Matches only if availableQuantity >= parsedQty
    const updatedRecord = await InventoryRecord.findOneAndUpdate(
      {
        _id: existingRecord._id,
        availableQuantity: { $gte: parsedQty },
      },
      {
        $inc: { availableQuantity: -parsedQty },
        $set: { updatedBy: req.user?._id },
      },
      { new: true }
    );

    if (!updatedRecord) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent outward collision detected or insufficient stock. Please refresh and retry.',
      });
    }

    const effectiveDate = outwardDate ? new Date(outwardDate) : new Date();

    // Create immutable outward stock transaction
    const transaction = await StockTransaction.create({
      transactionId: generateTxnId(TRANSACTION_TYPES.OUTWARD),
      type: TRANSACTION_TYPES.OUTWARD,
      inventoryRecord: updatedRecord._id,
      partNumber: updatedRecord.partNumber,
      mpn: updatedRecord.mpn,
      trackingId: updatedRecord.trackingId,
      barcode: updatedRecord.barcode,
      program: updatedRecord.program,
      rack: updatedRecord.rack,
      bin: updatedRecord.bin,
      storageBox: updatedRecord.storageBox,
      quantity: parsedQty,
      transactionDate: effectiveDate,
      recipient: recipient ? recipient.trim() : 'General Assembly / Dispatch',
      referenceNumber: referenceNumber ? referenceNumber.trim() : '',
      remarks: remarks ? remarks.trim() : 'Stock Outward Dispatch',
      processedBy: req.user?._id,
      processedByName: req.user?.name || 'System Operator',
    });

    res.status(200).json({
      success: true,
      message: `Dispatched ${parsedQty} units of ${updatedRecord.partNumber} (${updatedRecord.trackingId}). Remaining stock: ${updatedRecord.availableQuantity}.`,
      item: updatedRecord,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get stock transactions history
// @route   GET /api/stock/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      program,
      q,
      startDate,
      endDate,
      sortBy = 'transactionDate',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (program && program !== 'ALL') {
      query.program = program;
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [
        { transactionId: searchRegex },
        { partNumber: searchRegex },
        { mpn: searchRegex },
        { trackingId: searchRegex },
        { barcode: searchRegex },
        { rack: searchRegex },
        { bin: searchRegex },
        { recipient: searchRegex },
        { referenceNumber: searchRegex },
      ];
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transactionDate.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [transactions, totalItems] = await Promise.all([
      StockTransaction.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('processedBy', 'name email'),
      StockTransaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/stock/transactions/:id
// @access  Private
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await StockTransaction.findById(req.params.id)
      .populate('processedBy', 'name email')
      .populate('inventoryRecord');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  receiveStock,
  issueStock,
  getTransactions,
  getTransactionById,
};
