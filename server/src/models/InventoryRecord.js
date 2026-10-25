const mongoose = require('mongoose');
const { PREDEFINED_PROGRAMS, TRACKING_MODES } = require('../config/constants');

const generateUniqueBarcode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `VIS-BC-${timestamp}-${random}`;
};

const inventoryRecordSchema = new mongoose.Schema(
  {
    partNumber: {
      type: String,
      required: [true, 'Part Number is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    mpn: {
      type: String,
      required: [true, 'MPN (Material Part Number) is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    trackingId: {
      type: String,
      required: [true, 'Tracking ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    barcode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    program: {
      type: String,
      required: [true, 'Program is required'],
      enum: PREDEFINED_PROGRAMS,
      index: true,
    },
    trackingMode: {
      type: String,
      enum: Object.values(TRACKING_MODES),
      default: TRACKING_MODES.QUANTITY,
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    minStockThreshold: {
      type: Number,
      required: [true, 'Minimum Stock Threshold is required'],
      min: [0, 'Threshold cannot be negative'],
      default: 10,
    },
    rack: {
      type: String,
      required: [true, 'Rack ID / Number is required'],
      trim: true,
      uppercase: true,
      index: true,
      default: 'RACK-01',
    },
    bin: {
      type: String,
      required: [true, 'Bin ID / Number is required'],
      trim: true,
      uppercase: true,
      index: true,
      default: 'BIN-01',
    },
    storageBox: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    lastInwardDate: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate barcode & synchronize storageBox before save
inventoryRecordSchema.pre('validate', function (next) {
  if (!this.barcode) {
    this.barcode = generateUniqueBarcode();
  }

  // Ensure rack and bin are populated
  if (!this.rack && this.storageBox) {
    if (this.storageBox.includes('/')) {
      const parts = this.storageBox.split('/');
      this.rack = parts[0].trim().toUpperCase() || 'RACK-01';
      this.bin = parts[1].trim().toUpperCase() || 'BIN-01';
    } else {
      this.rack = 'RACK-01';
      this.bin = this.storageBox.trim().toUpperCase() || 'BIN-01';
    }
  }

  if (!this.rack) this.rack = 'RACK-01';
  if (!this.bin) this.bin = 'BIN-01';

  // Always keep storageBox synced as "RACK / BIN"
  this.storageBox = `${this.rack} / ${this.bin}`;

  next();
});

// Compound indexes for common query combinations
inventoryRecordSchema.index({ program: 1, availableQuantity: 1 });
inventoryRecordSchema.index({ partNumber: 1, mpn: 1 });
inventoryRecordSchema.index({ rack: 1, bin: 1 });
inventoryRecordSchema.index({ active: 1, availableQuantity: 1, minStockThreshold: 1 });

module.exports = mongoose.model('InventoryRecord', inventoryRecordSchema);
