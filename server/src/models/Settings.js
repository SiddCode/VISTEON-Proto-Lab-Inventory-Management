const mongoose = require('mongoose');
const { PREDEFINED_PROGRAMS, USER_ROLES } = require('../config/constants');

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'VISTEON',
      trim: true,
    },
    companyLogo: {
      type: String,
      default: '',
    },
    allowedPrograms: {
      type: [String],
      default: PREDEFINED_PROGRAMS,
    },
    defaultBoxPrefix: {
      type: String,
      default: 'BOX-',
      trim: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 1,
    },
    permittedRoles: {
      type: [String],
      default: USER_ROLES,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
