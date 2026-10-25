const mongoose = require('mongoose');
const User = require('../models/User');
const InventoryRecord = require('../models/InventoryRecord');
const StockTransaction = require('../models/StockTransaction');
const Settings = require('../models/Settings');
const { PREDEFINED_PROGRAMS, TRANSACTION_TYPES } = require('../config/constants');

const seedDatabase = async () => {
  console.log('[Seed] Starting VISTEON Inventory Database Seeding...');

  // 1. Clear existing records to ensure fresh, clean state
  await Promise.all([
    User.deleteMany({}),
    InventoryRecord.deleteMany({}),
    StockTransaction.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  // 2. Create Default Settings
  const settings = await Settings.create({
    companyName: 'VISTEON',
    companyLogo: '',
    allowedPrograms: PREDEFINED_PROGRAMS,
    defaultBoxPrefix: 'BOX-',
    lowStockThreshold: 15,
  });

  // 3. Create Users
  const adminUser = await User.create({
    name: 'Visteon Operations Lead',
    email: 'admin@visteon.com',
    password: 'admin123',
    role: 'ADMIN',
  });

  const operatorUser = await User.create({
    name: 'Plant Operator',
    email: 'operator@visteon.com',
    password: 'operator123',
    role: 'OPERATOR',
  });

  console.log('[Seed] Users created: admin@visteon.com / admin123, operator@visteon.com / operator123');

  // 4. Create Sample Automotive Inventory Records
  const sampleParts = [
    {
      partNumber: 'VP-IC-8200-RN',
      mpn: '24810-7294R',
      trackingId: 'TRK-RN-9021',
      barcode: 'VIS-BC-109021',
      program: 'Renault Nissan',
      availableQuantity: 42,
      minStockThreshold: 20,
      rack: 'RACK-01',
      bin: 'BIN-04',
      remarks: 'Digital Cluster Module for CMF-A+ platform',
      daysAgo: 10,
    },
    {
      partNumber: 'VP-DHU-1025-MH',
      mpn: '0403BA0181N',
      trackingId: 'TRK-MH-4011',
      barcode: 'VIS-BC-104011',
      program: 'Mahindra',
      availableQuantity: 28,
      minStockThreshold: 15,
      rack: 'RACK-02',
      bin: 'BIN-12',
      remarks: '10.25 inch HD Infotainment Head Unit',
      daysAgo: 8,
    },
    {
      partNumber: 'VP-ECU-920-SK',
      mpn: '5E3920790A',
      trackingId: 'TRK-SK-1102',
      barcode: 'VIS-BC-101102',
      program: 'Skoda',
      availableQuantity: 18,
      minStockThreshold: 25, // Low stock: 18 <= 25!
      rack: 'RACK-02',
      bin: 'BIN-08',
      remarks: 'Cockpit Electronic Controller Unit',
      daysAgo: 12,
    },
    {
      partNumber: 'VP-TCG-4409-TT',
      mpn: '542454409901',
      trackingId: 'TRK-TT-5501',
      barcode: 'VIS-BC-105501',
      program: 'Tata',
      availableQuantity: 65,
      minStockThreshold: 30,
      rack: 'RACK-03',
      bin: 'BIN-01',
      remarks: 'Telematics Connectivity Gateway Module',
      daysAgo: 6,
    },
    {
      partNumber: 'VP-TFT-700-TV',
      mpn: 'N9220010',
      trackingId: 'TRK-TV-7080',
      barcode: 'VIS-BC-107080',
      program: 'TVS',
      availableQuantity: 80,
      minStockThreshold: 25,
      rack: 'RACK-03',
      bin: 'BIN-15',
      remarks: '7-inch Bluetooth SmartXonnect TFT Cluster',
      daysAgo: 14,
    },
    {
      partNumber: 'VP-TRP-202-RE',
      mpn: 'RAC00123/A',
      trackingId: 'TRK-RE-2022',
      barcode: 'VIS-BC-102022',
      program: 'Royal Enfield',
      availableQuantity: 55,
      minStockThreshold: 20,
      rack: 'RACK-04',
      bin: 'BIN-03',
      remarks: 'Turn-by-turn Tripper Navigation Pod',
      daysAgo: 5,
    },
    {
      partNumber: 'VP-ADI-3910-HN',
      mpn: '39100-TG1-T01',
      trackingId: 'TRK-HN-3309',
      barcode: 'VIS-BC-103309',
      program: 'Honda',
      availableQuantity: 36,
      minStockThreshold: 15,
      rack: 'RACK-04',
      bin: 'BIN-10',
      remarks: 'Audio Display Interface Controller',
      daysAgo: 9,
    },
    {
      partNumber: 'VP-SPP-68T0-MS',
      mpn: '39101M68T00',
      trackingId: 'TRK-MS-6012',
      barcode: 'VIS-BC-106012',
      program: 'Maruti Suzuki',
      availableQuantity: 92,
      minStockThreshold: 40,
      rack: 'RACK-05',
      bin: 'BIN-02',
      remarks: 'SmartPlay Pro Audio & Telematics Controller',
      daysAgo: 4,
    },
    {
      partNumber: 'VP-TCU-9831-PS',
      mpn: '9831245680',
      trackingId: 'TRK-PS-8820',
      barcode: 'VIS-BC-108820',
      program: 'PSA',
      availableQuantity: 30,
      minStockThreshold: 10,
      rack: 'RACK-05',
      bin: 'BIN-07',
      remarks: 'e-CMP Telematics Controller Unit',
      daysAgo: 7,
    },
    {
      partNumber: 'VP-HUD-500-TT',
      mpn: '542454508822',
      trackingId: 'TRK-TT-8833',
      barcode: 'VIS-BC-108833',
      program: 'Tata',
      availableQuantity: 6, // Low stock: 6 <= 15
      minStockThreshold: 15,
      rack: 'RACK-01',
      bin: 'BIN-09',
      remarks: 'Color Heads-Up Display Optical Unit',
      daysAgo: 15,
    },
  ];

  const createdParts = [];
  for (const p of sampleParts) {
    const inwardDate = new Date();
    inwardDate.setDate(inwardDate.getDate() - p.daysAgo);
    const combinedLoc = `${p.rack} / ${p.bin}`;

    const part = await InventoryRecord.create({
      partNumber: p.partNumber,
      mpn: p.mpn,
      trackingId: p.trackingId,
      barcode: p.barcode,
      program: p.program,
      trackingMode: 'QUANTITY',
      availableQuantity: p.availableQuantity,
      minStockThreshold: p.minStockThreshold,
      rack: p.rack,
      bin: p.bin,
      storageBox: combinedLoc,
      remarks: p.remarks,
      lastInwardDate: inwardDate,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    createdParts.push(part);

    // Initial inward transaction
    await StockTransaction.create({
      transactionId: `TXN-INW-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: TRANSACTION_TYPES.INWARD,
      inventoryRecord: part._id,
      partNumber: part.partNumber,
      mpn: part.mpn,
      trackingId: part.trackingId,
      barcode: part.barcode,
      program: part.program,
      rack: part.rack,
      bin: part.bin,
      storageBox: combinedLoc,
      quantity: p.availableQuantity + 15, // original initial inward
      transactionDate: inwardDate,
      referenceNumber: `PO-VISTEON-${Math.floor(10000 + Math.random() * 90000)}`,
      remarks: 'Initial Batch Receiving from Manufacturing Plant',
      processedBy: adminUser._id,
      processedByName: adminUser.name,
    });
  }

  // 5. Create Sample Outward Transactions
  const outwardMocks = [
    {
      partIndex: 0, // Renault
      quantity: 8,
      recipient: 'Assembly Line 2 - Instrument Panel Station',
      ref: 'WO-RN-2026-041',
      daysAgo: 3,
      remarks: 'Daily production issue for shift A',
    },
    {
      partIndex: 1, // Mahindra
      quantity: 5,
      recipient: 'QA & Testing Lab 4',
      ref: 'QA-MH-ENV-882',
      daysAgo: 2,
      remarks: 'Environmental vibration and thermal testing batch',
    },
    {
      partIndex: 3, // Tata
      quantity: 12,
      recipient: 'Assembly Line 1 - EV Dashboard Integration',
      ref: 'WO-TT-EV-901',
      daysAgo: 1,
      remarks: 'Nexon EV instrument assembly run',
    },
    {
      partIndex: 4, // TVS
      quantity: 20,
      recipient: 'Sub-Assembly Cell 3',
      ref: 'WO-TV-RR310-09',
      daysAgo: 2,
      remarks: 'Cluster firmware flashing and harness fitting',
    },
    {
      partIndex: 7, // Maruti
      quantity: 15,
      recipient: 'Final Dispatch Bay 2',
      ref: 'DISP-MS-8812',
      daysAgo: 0,
      remarks: 'Dispatched to OEM plant Gurugram',
    },
    {
      partIndex: 9, // Tata HUD
      quantity: 7,
      recipient: 'Pre-Delivery Inspection Bay',
      ref: 'WO-TT-HUD-334',
      daysAgo: 1,
      remarks: 'Harrier/Safari flagship cockpit fitment',
    },
  ];

  for (const out of outwardMocks) {
    const targetPart = createdParts[out.partIndex];
    const outDate = new Date();
    outDate.setDate(outDate.getDate() - out.daysAgo);
    outDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59));

    await StockTransaction.create({
      transactionId: `TXN-OUT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: TRANSACTION_TYPES.OUTWARD,
      inventoryRecord: targetPart._id,
      partNumber: targetPart.partNumber,
      mpn: targetPart.mpn,
      trackingId: targetPart.trackingId,
      barcode: targetPart.barcode,
      program: targetPart.program,
      rack: targetPart.rack,
      bin: targetPart.bin,
      storageBox: targetPart.storageBox,
      quantity: out.quantity,
      transactionDate: outDate,
      recipient: out.recipient,
      referenceNumber: out.ref,
      remarks: out.remarks,
      processedBy: operatorUser._id,
      processedByName: operatorUser.name,
    });
  }

  console.log('[Seed] VISTEON Database successfully seeded with enhanced parts and transactions!');
};

module.exports = seedDatabase;
