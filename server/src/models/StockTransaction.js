const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('../config/constants');

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true,
      index: true,
    },
    inventoryRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryRecord',
      required: true,
      index: true,
    },
    // Immutable snapshot fields at time of transaction
    partNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    mpn: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    trackingId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    program: {
      type: String,
      required: true,
      index: true,
    },
    rack: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'RACK-01',
    },
    bin: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'BIN-01',
    },
    storageBox: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recipient: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    processedByName: {
      type: String,
      default: 'System',
    },
  },
  {
    timestamps: true,
  }
);

stockTransactionSchema.index({ type: 1, transactionDate: -1 });
stockTransactionSchema.index({ type: 1, program: 1 });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
