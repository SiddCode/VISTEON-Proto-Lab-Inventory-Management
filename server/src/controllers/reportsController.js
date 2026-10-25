const StockTransaction = require('../models/StockTransaction');
const { TRANSACTION_TYPES, PREDEFINED_PROGRAMS } = require('../config/constants');

// Helper to build outward transaction query from request params
const buildOutwardQuery = (params) => {
  const { q, program, recipient, startDate, endDate } = params;
  const query = { type: TRANSACTION_TYPES.OUTWARD };

  if (q && q.trim()) {
    const searchRegex = new RegExp(q.trim(), 'i');
    query.$or = [
      { transactionId: searchRegex },
      { partNumber: searchRegex },
      { mpn: searchRegex },
      { trackingId: searchRegex },
      { referenceNumber: searchRegex },
      { recipient: searchRegex },
      { storageBox: searchRegex },
    ];
  }

  if (program && program !== 'ALL') {
    query.program = program;
  }

  if (recipient && recipient !== 'ALL') {
    query.recipient = new RegExp(recipient.trim(), 'i');
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

  return query;
};

// @desc    Get outward transactions report with filters & metrics
// @route   GET /api/reports/outward
// @access  Private
const getOutwardReport = async (req, res, next) => {
  try {
    const {
      sortBy = 'transactionDate',
      sortOrder = 'desc',
      page = 1,
      limit = 15,
    } = req.query;

    const query = buildOutwardQuery(req.query);

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch transactions, count, and summary metrics for current filter
    const [transactions, totalCount, summaryAgg, distinctRecipients] = await Promise.all([
      StockTransaction.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('processedBy', 'name email'),
      StockTransaction.countDocuments(query),
      StockTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalQuantityIssued: { $sum: '$quantity' },
            distinctPartsIssued: { $addToSet: '$partNumber' },
          },
        },
      ]),
      StockTransaction.distinct('recipient', { type: TRANSACTION_TYPES.OUTWARD }),
    ]);

    const totalQuantityIssued = summaryAgg.length > 0 ? summaryAgg[0].totalQuantityIssued : 0;
    const distinctPartsCount = summaryAgg.length > 0 ? summaryAgg[0].distinctPartsIssued.length : 0;

    res.json({
      success: true,
      transactions,
      summary: {
        totalTransactions: totalCount,
        totalQuantityIssued,
        distinctPartsCount,
      },
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      },
      filters: {
        availablePrograms: PREDEFINED_PROGRAMS,
        availableRecipients: distinctRecipients.filter(Boolean).sort(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export outward report to CSV
// @route   GET /api/reports/outward/export
// @access  Private
const exportOutwardCsv = async (req, res, next) => {
  try {
    const query = buildOutwardQuery(req.query);
    const transactions = await StockTransaction.find(query)
      .sort({ transactionDate: -1 })
      .populate('processedBy', 'name email');

    // Build CSV Headers
    const headers = [
      'Transaction ID',
      'Outward Date & Time',
      'Part Number',
      'MPN',
      'Tracking ID',
      'Program',
      'Outward Quantity',
      'Storage Box Location',
      'Recipient / Destination',
      'Reference Number',
      'Processed By',
      'Remarks',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = transactions.map((t) => [
      escapeCsv(t.transactionId),
      escapeCsv(new Date(t.transactionDate).toISOString().replace('T', ' ').substring(0, 19)),
      escapeCsv(t.partNumber),
      escapeCsv(t.mpn),
      escapeCsv(t.trackingId),
      escapeCsv(t.program),
      t.quantity,
      escapeCsv(t.storageBox),
      escapeCsv(t.recipient || 'N/A'),
      escapeCsv(t.referenceNumber || 'N/A'),
      escapeCsv(t.processedByName || (t.processedBy ? t.processedBy.name : 'System')),
      escapeCsv(t.remarks || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const filename = `Visteon_Outward_Report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOutwardReport,
  exportOutwardCsv,
};
