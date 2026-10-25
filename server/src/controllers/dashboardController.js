const InventoryRecord = require('../models/InventoryRecord');
const StockTransaction = require('../models/StockTransaction');
const { TRANSACTION_TYPES } = require('../config/constants');

// @desc    Get live dashboard summary KPIs & chart data
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    // 1. KPI A: Inventory Records - count of distinct active inventory records
    const inventoryRecordsCount = await InventoryRecord.countDocuments({ active: true });

    // 2. KPI B: Unique Part Numbers - count distinct part numbers currently represented in active stock (availableQuantity > 0)
    const uniquePartNumbers = await InventoryRecord.distinct('partNumber', {
      active: true,
      availableQuantity: { $gt: 0 },
    });
    const uniquePartsCount = uniquePartNumbers.length;

    // 3. KPI C: Total Quantity - sum of currently available component quantities
    const totalQuantityAgg = await InventoryRecord.aggregate([
      { $match: { active: true } },
      { $group: { _id: null, totalQty: { $sum: '$availableQuantity' } } },
    ]);
    const totalQuantity = totalQuantityAgg.length > 0 ? totalQuantityAgg[0].totalQty : 0;

    // 4. KPI D: Storage Location in Boxes / Bins - count distinct non-empty rack/bin identifiers containing available stock
    const uniqueBoxes = await InventoryRecord.distinct('storageBox', {
      active: true,
      availableQuantity: { $gt: 0 },
    });
    const storageBoxesCount = uniqueBoxes.length;

    // 5. Low Stock Count (availableQuantity <= minStockThreshold AND availableQuantity > 0)
    const lowStockCount = await InventoryRecord.countDocuments({
      active: true,
      $expr: {
        $and: [
          { $gt: ['$availableQuantity', 0] },
          { $lte: ['$availableQuantity', '$minStockThreshold'] },
        ],
      },
    });

    // 6. Zero Stock / Critical Count (availableQuantity == 0)
    const zeroStockCount = await InventoryRecord.countDocuments({
      active: true,
      availableQuantity: 0,
    });

    // 7. Stock breakdown by Program
    const stockByProgram = await InventoryRecord.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$program',
          totalQuantity: { $sum: '$availableQuantity' },
          partCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    // 8. Inward vs Outward Movement Data (Last 7 days daily trend)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const transactionTrends = await StockTransaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
            type: '$type',
          },
          totalQty: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build complete daily timeline for last 7 days
    const chartMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chartMap[dateStr] = {
        date: dateStr,
        displayDate: displayStr,
        inward: 0,
        outward: 0,
      };
    }

    transactionTrends.forEach((item) => {
      const dateKey = item._id.date;
      if (chartMap[dateKey]) {
        if (item._id.type === TRANSACTION_TYPES.INWARD) {
          chartMap[dateKey].inward += item.totalQty;
        } else if (item._id.type === TRANSACTION_TYPES.OUTWARD) {
          chartMap[dateKey].outward += item.totalQty;
        }
      }
    });

    const movementChartData = Object.values(chartMap);

    // 9. Recent Inward Activity (last 5)
    const recentInward = await StockTransaction.find({ type: TRANSACTION_TYPES.INWARD })
      .sort({ transactionDate: -1 })
      .limit(5)
      .populate('processedBy', 'name');

    // 10. Recent Outward Activity (last 5)
    const recentOutward = await StockTransaction.find({ type: TRANSACTION_TYPES.OUTWARD })
      .sort({ transactionDate: -1 })
      .limit(5)
      .populate('processedBy', 'name');

    // 11. Low stock items (where availableQuantity <= minStockThreshold)
    const lowStockItems = await InventoryRecord.find({
      active: true,
      $expr: {
        $lte: ['$availableQuantity', '$minStockThreshold'],
      },
    })
      .sort({ availableQuantity: 1 })
      .limit(8);

    res.json({
      success: true,
      kpis: {
        inventoryRecords: inventoryRecordsCount,
        uniquePartNumbers: uniquePartsCount,
        totalQuantity,
        storageBoxes: storageBoxesCount,
        lowStockCount,
        zeroStockCount,
      },
      stockByProgram,
      movementChartData,
      recentInward,
      recentOutward,
      lowStockItems,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get recent transactions feed
// @route   GET /api/dashboard/recent-transactions
// @access  Private
const getRecentTransactions = async (req, res, next) => {
  try {
    const transactions = await StockTransaction.find()
      .sort({ transactionDate: -1 })
      .limit(10)
      .populate('processedBy', 'name email');

    res.json({
      success: true,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardSummary,
  getRecentTransactions,
};
