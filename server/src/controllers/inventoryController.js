const InventoryRecord = require('../models/InventoryRecord');
const StockTransaction = require('../models/StockTransaction');
const { TRANSACTION_TYPES, PREDEFINED_PROGRAMS } = require('../config/constants');

// Generate unique transaction ID
const generateTxnId = (type) => {
  const prefix = type === TRANSACTION_TYPES.INWARD ? 'TXN-INW' : 'TXN-OUT';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
};

// Generate unique barcode identifier (Code 128 compliant)
const generateUniqueBarcode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `VIS-BC-${timestamp}-${random}`;
};

// @desc    Get inventory list with search, filters, pagination
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res, next) => {
  try {
    const {
      q,
      program,
      rack,
      bin,
      storageBox,
      stockStatus,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = { active: true };

    // Search by Part Number, MPN, Tracking ID, Barcode, Rack, Bin, or Box
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [
        { partNumber: searchRegex },
        { mpn: searchRegex },
        { trackingId: searchRegex },
        { barcode: searchRegex },
        { rack: searchRegex },
        { bin: searchRegex },
        { storageBox: searchRegex },
      ];
    }

    // Program filter
    if (program && program !== 'ALL') {
      query.program = program;
    }

    // Rack filter
    if (rack && rack !== 'ALL') {
      query.rack = rack.toUpperCase().trim();
    }

    // Bin filter
    if (bin && bin !== 'ALL') {
      query.bin = bin.toUpperCase().trim();
    }

    // Storage Box filter (legacy compatibility)
    if (storageBox && storageBox !== 'ALL') {
      query.storageBox = storageBox.toUpperCase().trim();
    }

    // Stock Status filter
    if (stockStatus === 'IN_STOCK') {
      query.availableQuantity = { $gt: 0 };
    } else if (stockStatus === 'LOW_STOCK') {
      // Individual threshold comparison: availableQuantity <= minStockThreshold AND availableQuantity > 0
      query.$expr = {
        $and: [
          { $gt: ['$availableQuantity', 0] },
          { $lte: ['$availableQuantity', '$minStockThreshold'] },
        ],
      };
    } else if (stockStatus === 'OUT_OF_STOCK' || stockStatus === 'CRITICAL_STOCK') {
      query.availableQuantity = 0;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [items, totalItems, distinctPrograms, distinctRacks, distinctBins, distinctBoxes] = await Promise.all([
      InventoryRecord.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      InventoryRecord.countDocuments(query),
      InventoryRecord.distinct('program', { active: true }),
      InventoryRecord.distinct('rack', { active: true }),
      InventoryRecord.distinct('bin', { active: true }),
      InventoryRecord.distinct('storageBox', { active: true }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.json({
      success: true,
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
      filters: {
        availablePrograms: distinctPrograms.length > 0 ? distinctPrograms : PREDEFINED_PROGRAMS,
        availableRacks: distinctRacks.filter(Boolean).sort(),
        availableBins: distinctBins.filter(Boolean).sort(),
        availableBoxes: distinctBoxes.filter(Boolean).sort(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single inventory record & its transaction history
// @route   GET /api/inventory/:id
// @access  Private
const getInventoryById = async (req, res, next) => {
  try {
    const item = await InventoryRecord.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!item || !item.active) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found',
      });
    }

    // Fetch related stock transactions
    const transactions = await StockTransaction.find({ inventoryRecord: item._id })
      .sort({ transactionDate: -1 })
      .limit(20)
      .populate('processedBy', 'name email');

    res.json({
      success: true,
      item,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Register a new component (Create Part)
// @route   POST /api/inventory
// @access  Private
const createPart = async (req, res, next) => {
  try {
    const {
      partNumber,
      mpn,
      trackingId,
      barcode,
      program,
      quantity,
      availableQuantity,
      minStockThreshold,
      rack,
      bin,
      storageBox,
      remarks,
      inwardDate,
      trackingMode,
    } = req.body;

    const initialQty = quantity !== undefined ? quantity : availableQuantity;

    // Validation
    if (!partNumber || !mpn || !trackingId || !program || initialQty === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Part Number, MPN, Tracking ID, Program, Quantity',
      });
    }

    // Parse Rack and Bin
    let cleanRack = rack ? rack.trim().toUpperCase() : '';
    let cleanBin = bin ? bin.trim().toUpperCase() : '';

    if ((!cleanRack || !cleanBin) && storageBox) {
      if (storageBox.includes('/')) {
        const parts = storageBox.split('/');
        cleanRack = cleanRack || parts[0].trim().toUpperCase() || 'RACK-01';
        cleanBin = cleanBin || parts[1].trim().toUpperCase() || 'BIN-01';
      } else {
        cleanRack = cleanRack || 'RACK-01';
        cleanBin = cleanBin || storageBox.trim().toUpperCase() || 'BIN-01';
      }
    }

    if (!cleanRack) cleanRack = 'RACK-01';
    if (!cleanBin) cleanBin = 'BIN-01';
    const combinedLocation = `${cleanRack} / ${cleanBin}`;

    const cleanPartNumber = partNumber.trim().toUpperCase();
    const cleanMpn = mpn.trim().toUpperCase();
    const cleanTrackingId = trackingId.trim().toUpperCase();
    const cleanBarcode = barcode ? barcode.trim().toUpperCase() : generateUniqueBarcode();
    const parsedQty = Number(initialQty);
    const parsedThreshold = minStockThreshold !== undefined && minStockThreshold !== '' 
      ? Number(minStockThreshold) 
      : 10;

    if (isNaN(parsedQty) || parsedQty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid non-negative number',
      });
    }

    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum Stock Threshold must be a non-negative number',
      });
    }

    // Check Tracking ID uniqueness
    const existingTracking = await InventoryRecord.findOne({ trackingId: cleanTrackingId });
    if (existingTracking) {
      return res.status(400).json({
        success: false,
        message: `Tracking ID '${cleanTrackingId}' is already registered in the system. Tracking IDs must be strictly unique.`,
      });
    }

    // Check Barcode uniqueness
    const existingBarcode = await InventoryRecord.findOne({ barcode: cleanBarcode });
    if (existingBarcode) {
      return res.status(400).json({
        success: false,
        message: `Barcode '${cleanBarcode}' is already assigned to part ${existingBarcode.partNumber}. Barcodes must be unique.`,
      });
    }

    const effectiveDate = inwardDate ? new Date(inwardDate) : new Date();

    // Create the inventory record
    const newRecord = await InventoryRecord.create({
      partNumber: cleanPartNumber,
      mpn: cleanMpn,
      trackingId: cleanTrackingId,
      barcode: cleanBarcode,
      program,
      trackingMode: trackingMode || 'QUANTITY',
      availableQuantity: parsedQty,
      minStockThreshold: parsedThreshold,
      rack: cleanRack,
      bin: cleanBin,
      storageBox: combinedLocation,
      remarks: remarks ? remarks.trim() : '',
      lastInwardDate: effectiveDate,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    // Create initial INWARD movement transaction if quantity > 0
    if (parsedQty > 0) {
      await StockTransaction.create({
        transactionId: generateTxnId(TRANSACTION_TYPES.INWARD),
        type: TRANSACTION_TYPES.INWARD,
        inventoryRecord: newRecord._id,
        partNumber: cleanPartNumber,
        mpn: cleanMpn,
        trackingId: cleanTrackingId,
        barcode: cleanBarcode,
        program,
        rack: cleanRack,
        bin: cleanBin,
        storageBox: combinedLocation,
        quantity: parsedQty,
        transactionDate: effectiveDate,
        remarks: remarks ? `Initial Registration: ${remarks.trim()}` : 'Initial Part Registration',
        processedBy: req.user?._id,
        processedByName: req.user?.name || 'System Operator',
      });
    }

    res.status(201).json({
      success: true,
      message: `Part ${cleanPartNumber} (${cleanTrackingId}) registered successfully with ${parsedQty} units. Barcode: ${cleanBarcode}`,
      item: newRecord,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update permitted metadata of inventory record (No silent stock editing allowed!)
// @route   PATCH /api/inventory/:id
// @access  Private
const updatePart = async (req, res, next) => {
  try {
    const item = await InventoryRecord.findById(req.params.id);
    if (!item || !item.active) {
      return res.status(404).json({ success: false, message: 'Inventory record not found' });
    }

    // Prevent silent stock modifications
    if (req.body.availableQuantity !== undefined && req.body.availableQuantity !== item.availableQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Direct stock quantity adjustment is prohibited. Use "Receive Stock" or "New Outward" workflows to maintain complete audit history.',
      });
    }

    const { rack, bin, storageBox, minStockThreshold, remarks, program } = req.body;

    if (rack) {
      item.rack = rack.trim().toUpperCase();
    }
    if (bin) {
      item.bin = bin.trim().toUpperCase();
    }
    if (storageBox && (!rack || !bin)) {
      if (storageBox.includes('/')) {
        const parts = storageBox.split('/');
        item.rack = parts[0].trim().toUpperCase() || item.rack;
        item.bin = parts[1].trim().toUpperCase() || item.bin;
      } else {
        item.bin = storageBox.trim().toUpperCase();
      }
    }
    item.storageBox = `${item.rack} / ${item.bin}`;

    if (minStockThreshold !== undefined && minStockThreshold !== '') {
      const parsedThresh = Number(minStockThreshold);
      if (!isNaN(parsedThresh) && parsedThresh >= 0) {
        item.minStockThreshold = parsedThresh;
      }
    }

    if (remarks !== undefined) {
      item.remarks = remarks.trim();
    }
    if (program) {
      item.program = program;
    }

    item.updatedBy = req.user?._id;
    await item.save();

    res.json({
      success: true,
      message: 'Inventory metadata updated successfully',
      item,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Deactivate / Delete part (Admin only)
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
const deletePart = async (req, res, next) => {
  try {
    const item = await InventoryRecord.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory record not found' });
    }

    item.active = false;
    item.updatedBy = req.user?._id;
    await item.save();

    res.json({
      success: true,
      message: `Part ${item.partNumber} (${item.trackingId}) deactivated successfully`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInventory,
  getInventoryById,
  createPart,
  updatePart,
  deletePart,
  generateTxnId,
  generateUniqueBarcode,
};
