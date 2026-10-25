const Settings = require('../models/Settings');
const InventoryRecord = require('../models/InventoryRecord');
const StockTransaction = require('../models/StockTransaction');
const User = require('../models/User');
const { PREDEFINED_PROGRAMS } = require('../config/constants');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        companyName: 'VISTEON',
        allowedPrograms: PREDEFINED_PROGRAMS,
        defaultBoxPrefix: 'BOX-',
        lowStockThreshold: 10,
      });
    }

    const [userCount, inventoryCount, txnCount] = await Promise.all([
      User.countDocuments({ active: true }),
      InventoryRecord.countDocuments({ active: true }),
      StockTransaction.countDocuments(),
    ]);

    res.json({
      success: true,
      settings,
      systemStats: {
        activeUsers: userCount,
        totalInventoryRecords: inventoryCount,
        totalTransactions: txnCount,
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update system settings
// @route   PATCH /api/settings
// @access  Private/Admin
const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const { companyName, companyLogo, defaultBoxPrefix, lowStockThreshold, allowedPrograms } = req.body;

    if (companyName) settings.companyName = companyName.trim();
    if (companyLogo !== undefined) settings.companyLogo = companyLogo;
    if (defaultBoxPrefix) settings.defaultBoxPrefix = defaultBoxPrefix.trim().toUpperCase();
    if (lowStockThreshold !== undefined) settings.lowStockThreshold = Number(lowStockThreshold);
    if (allowedPrograms && Array.isArray(allowedPrograms)) {
      settings.allowedPrograms = allowedPrograms;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
