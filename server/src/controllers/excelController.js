const ExcelJS = require('exceljs');
const InventoryRecord = require('../models/InventoryRecord');
const StockTransaction = require('../models/StockTransaction');
const { TRANSACTION_TYPES, PREDEFINED_PROGRAMS } = require('../config/constants');
const { generateTxnId, generateUniqueBarcode } = require('./inventoryController');

// Helper to parse location string into rack & bin
const parseLocation = (locStr) => {
  if (!locStr) return { rack: 'RACK-01', bin: 'BIN-01' };
  const str = String(locStr).trim();

  if (str.includes('/')) {
    const parts = str.split('/');
    const r = parts[0].trim().toUpperCase() || 'RACK-01';
    const b = parts[1].trim().toUpperCase() || 'BIN-01';
    return { rack: r, bin: b };
  }

  // If starts with RACK or BIN
  if (/^RACK/i.test(str)) {
    return { rack: str.toUpperCase(), bin: 'BIN-01' };
  }
  if (/^BIN/i.test(str)) {
    return { rack: 'RACK-01', bin: str.toUpperCase() };
  }

  return { rack: 'RACK-01', bin: str.toUpperCase() };
};

// Normalize header strings
const normalizeHeader = (h) => {
  if (!h) return '';
  return String(h).trim().toLowerCase().replace(/[\s._-]+/g, '');
};

// Parse workbook buffer from ExcelJS
const readRowsFromBuffer = async (buffer, mimetype = '') => {
  const workbook = new ExcelJS.Workbook();

  // Try loading as xlsx / csv
  try {
    await workbook.xlsx.load(buffer);
  } catch (xlsxErr) {
    // If not xlsx, try csv
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    await workbook.csv.read(bufferStream);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Workbook contains no readable worksheets.');
  }

  const rawRows = [];
  let headerRowIndex = 1;
  let headerMap = {};

  // Find header row (the first row with text)
  worksheet.eachRow((row, rowNumber) => {
    const values = row.values;
    if (Object.keys(headerMap).length === 0) {
      // Analyze potential header row
      const tempMap = {};
      row.eachCell((cell, colNumber) => {
        const val = String(cell.value || '').trim();
        const norm = normalizeHeader(val);
        if (norm) {
          tempMap[norm] = colNumber;
        }
      });

      if (tempMap['partnumber'] || tempMap['partno'] || tempMap['mpn'] || tempMap['tracking']) {
        headerRowIndex = rowNumber;
        headerMap = tempMap;
      }
    } else if (rowNumber > headerRowIndex) {
      // Data row
      const rowData = { _rowNumber: rowNumber };
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let cellVal = cell.value;
        if (cellVal !== null && typeof cellVal === 'object') {
          // Rich text or formula
          cellVal = cellVal.text || cellVal.result || '';
        }
        rowData[colNumber] = cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
      });
      rawRows.push(rowData);
    }
  });

  return { rawRows, headerMap, worksheetTitle: worksheet.name };
};

// Map row to standard inventory object
const mapRowToPart = (row, headerMap) => {
  const getVal = (...aliases) => {
    for (const a of aliases) {
      const colNum = headerMap[normalizeHeader(a)];
      if (colNum && row[colNum] !== undefined) {
        return row[colNum];
      }
    }
    return '';
  };

  const partNumber = getVal('partnumber', 'partno', 'part');
  const mpn = getVal('mpn', 'materialpartnumber', 'materialpartno');
  const trackingId = getVal('tracking', 'trackingid', 'trackingno', 'serial');
  const program = getVal('program', 'customerprogram', 'oem');
  const qtyStr = getVal('qty', 'quantity', 'availablequantity', 'availableqty');
  const locationStr = getVal('location', 'storagebox', 'storage');
  const rackVal = getVal('rack', 'racknumber', 'rackid');
  const binVal = getVal('bin', 'binnumber', 'binid');
  const thresholdStr = getVal('minimumstockthreshold', 'minthreshold', 'threshold', 'minstock');
  const barcode = getVal('barcode', 'barcodeid');
  const remarks = getVal('remark', 'remarks', 'notes', 'comment');

  let rack = rackVal;
  let bin = binVal;
  if (!rack || !bin) {
    const parsedLoc = parseLocation(locationStr);
    rack = rack || parsedLoc.rack;
    bin = bin || parsedLoc.bin;
  }

  return {
    rowNumber: row._rowNumber,
    partNumber: partNumber.trim().toUpperCase(),
    mpn: mpn.trim().toUpperCase(),
    trackingId: trackingId.trim().toUpperCase(),
    program: program.trim(),
    quantity: qtyStr !== '' ? Number(qtyStr) : 0,
    minStockThreshold: thresholdStr !== '' ? Number(thresholdStr) : 10,
    rack: rack.trim().toUpperCase(),
    bin: bin.trim().toUpperCase(),
    storageBox: `${rack.trim().toUpperCase()} / ${bin.trim().toUpperCase()}`,
    barcode: barcode ? barcode.trim().toUpperCase() : '',
    remarks: remarks.trim(),
  };
};

// @desc    Preview & Validate Excel/CSV file upload
// @route   POST /api/inventory/import/preview
// @access  Private
const previewImport = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    const { rawRows, headerMap, worksheetTitle } = await readRowsFromBuffer(req.file.buffer, req.file.mimetype);

    if (rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file contains no data rows or could not be recognized.',
      });
    }

    // Existing database identifiers for conflict detection
    const existingRecords = await InventoryRecord.find(
      { active: true },
      'trackingId barcode partNumber mpn availableQuantity minStockThreshold rack bin storageBox'
    );
    const existingTrackingMap = new Map();
    const existingBarcodeMap = new Map();

    existingRecords.forEach((r) => {
      existingTrackingMap.set(r.trackingId.toUpperCase(), r);
      if (r.barcode) existingBarcodeMap.set(r.barcode.toUpperCase(), r);
    });

    const fileTrackingSet = new Set();
    const fileBarcodeSet = new Set();

    const parsedRows = [];
    const errors = [];
    let validRowsCount = 0;
    let newRecordsCount = 0;
    let existingRecordsCount = 0;
    let duplicateRowsInFileCount = 0;

    for (const raw of rawRows) {
      const row = mapRowToPart(raw, headerMap);
      const rowErrors = [];

      // Required validations
      if (!row.partNumber) {
        rowErrors.push('Part Number is required');
      }
      if (!row.mpn) {
        rowErrors.push('MPN is required');
      }
      if (!row.trackingId) {
        rowErrors.push('Tracking ID is required');
      }

      // Program check
      let matchingProgram = PREDEFINED_PROGRAMS.find(
        (p) => p.toLowerCase() === (row.program || '').toLowerCase()
      );
      if (row.program && matchingProgram) {
        row.program = matchingProgram;
      } else if (!row.program) {
        row.program = 'Renault Nissan'; // sensible default if unstated
      } else {
        rowErrors.push(`Invalid Program '${row.program}'. Allowed: ${PREDEFINED_PROGRAMS.join(', ')}`);
      }

      // Quantity validation
      if (isNaN(row.quantity) || row.quantity < 0) {
        rowErrors.push(`Invalid quantity '${row.quantity}'. Must be non-negative number.`);
      }

      // Threshold validation
      if (isNaN(row.minStockThreshold) || row.minStockThreshold < 0) {
        rowErrors.push(`Invalid threshold '${row.minStockThreshold}'. Must be non-negative number.`);
      }

      // Duplicate Tracking ID within file check
      if (row.trackingId) {
        if (fileTrackingSet.has(row.trackingId)) {
          duplicateRowsInFileCount++;
          rowErrors.push(`Duplicate Tracking ID '${row.trackingId}' found multiple times in this uploaded file`);
        } else {
          fileTrackingSet.add(row.trackingId);
        }
      }

      // Duplicate Barcode within file check (if barcode given)
      if (row.barcode) {
        if (fileBarcodeSet.has(row.barcode)) {
          rowErrors.push(`Duplicate Barcode '${row.barcode}' appears multiple times in file`);
        } else {
          fileBarcodeSet.add(row.barcode);
        }
      }

      // Database Conflict / Existing check
      let status = 'NEW';
      if (row.trackingId && existingTrackingMap.has(row.trackingId)) {
        status = 'EXISTING_DB';
        existingRecordsCount++;
      } else if (rowErrors.length === 0) {
        newRecordsCount++;
      }

      if (rowErrors.length === 0) {
        validRowsCount++;
      } else {
        errors.push({
          rowNumber: row.rowNumber,
          trackingId: row.trackingId || 'N/A',
          partNumber: row.partNumber || 'N/A',
          reasons: rowErrors,
        });
      }

      parsedRows.push({
        ...row,
        status,
        errors: rowErrors,
        isValid: rowErrors.length === 0,
      });
    }

    res.json({
      success: true,
      worksheetTitle,
      summary: {
        totalRows: rawRows.length,
        validRows: validRowsCount,
        invalidRows: rawRows.length - validRowsCount,
        newRecords: newRecordsCount,
        existingRecords: existingRecordsCount,
        duplicateRowsInFile: duplicateRowsInFileCount,
      },
      previewRows: parsedRows.slice(0, 50), // Send first 50 for interactive UI preview
      allRows: parsedRows,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Execute validated import into MongoDB
// @route   POST /api/inventory/import/confirm
// @access  Private
const executeImport = async (req, res, next) => {
  try {
    const { rows, allRows, mode = 'SKIP_DUPLICATES', duplicatePolicy } = req.body;
    const targetRows = rows || allRows;

    let effectiveMode = mode || duplicatePolicy || 'SKIP_DUPLICATES';
    if (effectiveMode === 'INWARD_RECEIPT') effectiveMode = 'IMPORT_AS_INWARD_RECEIPT';

    if (!targetRows || !Array.isArray(targetRows) || targetRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided to import' });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failureDetails = [];

    for (const row of targetRows) {
      try {
        if (!row.partNumber || !row.mpn || !row.trackingId) {
          failedCount++;
          failureDetails.push({ rowNumber: row.rowNumber, trackingId: row.trackingId, reason: 'Missing required fields' });
          continue;
        }

        const cleanPartNumber = row.partNumber.trim().toUpperCase();
        const cleanMpn = row.mpn.trim().toUpperCase();
        const cleanTrackingId = row.trackingId.trim().toUpperCase();
        const cleanBarcode = row.barcode ? row.barcode.trim().toUpperCase() : generateUniqueBarcode();
        const cleanRack = row.rack ? row.rack.trim().toUpperCase() : 'RACK-01';
        const cleanBin = row.bin ? row.bin.trim().toUpperCase() : 'BIN-01';
        const combinedLoc = `${cleanRack} / ${cleanBin}`;
        const parsedQty = Number(row.quantity) >= 0 ? Number(row.quantity) : 0;
        const parsedThreshold = Number(row.minStockThreshold) >= 0 ? Number(row.minStockThreshold) : 10;
        const program = row.program || 'Renault Nissan';

        // Check existing
        const existing = await InventoryRecord.findOne({ trackingId: cleanTrackingId });

        if (existing) {
          if (effectiveMode === 'SKIP_DUPLICATES') {
            skippedCount++;
            continue;
          } else if (effectiveMode === 'UPDATE_METADATA') {
            // Update permitted metadata only — DO NOT ALTER STOCK!
            existing.rack = cleanRack;
            existing.bin = cleanBin;
            existing.storageBox = combinedLoc;
            existing.minStockThreshold = parsedThreshold;
            if (row.remarks) existing.remarks = row.remarks.trim();
            existing.updatedBy = req.user?._id;
            await existing.save();
            updatedCount++;
            continue;
          } else if (effectiveMode === 'IMPORT_AS_INWARD_RECEIPT') {
            // Record genuine inward receipt transaction if qty > 0
            if (parsedQty > 0) {
              const updated = await InventoryRecord.findOneAndUpdate(
                { _id: existing._id },
                {
                  $inc: { availableQuantity: parsedQty },
                  $set: {
                    rack: cleanRack,
                    bin: cleanBin,
                    storageBox: combinedLoc,
                    lastInwardDate: new Date(),
                    updatedBy: req.user?._id,
                  },
                },
                { new: true }
              );

              await StockTransaction.create({
                transactionId: generateTxnId(TRANSACTION_TYPES.INWARD),
                type: TRANSACTION_TYPES.INWARD,
                inventoryRecord: updated._id,
                partNumber: updated.partNumber,
                mpn: updated.mpn,
                trackingId: updated.trackingId,
                barcode: updated.barcode,
                program: updated.program,
                rack: cleanRack,
                bin: cleanBin,
                storageBox: combinedLoc,
                quantity: parsedQty,
                transactionDate: new Date(),
                referenceNumber: 'EXCEL-IMPORT-RECEIPT',
                remarks: `Stock Receipt imported via Excel: ${row.remarks || 'Batch inward'}`,
                processedBy: req.user?._id,
                processedByName: req.user?.name || 'System Operator',
              });

              updatedCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
        }

        // Create new record
        const newRecord = await InventoryRecord.create({
          partNumber: cleanPartNumber,
          mpn: cleanMpn,
          trackingId: cleanTrackingId,
          barcode: cleanBarcode,
          program,
          availableQuantity: parsedQty,
          minStockThreshold: parsedThreshold,
          rack: cleanRack,
          bin: cleanBin,
          storageBox: combinedLoc,
          remarks: row.remarks ? row.remarks.trim() : 'Imported via Excel Batch',
          lastInwardDate: new Date(),
          createdBy: req.user?._id,
          updatedBy: req.user?._id,
        });

        // Create initial INWARD movement if qty > 0
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
            storageBox: combinedLoc,
            quantity: parsedQty,
            transactionDate: new Date(),
            referenceNumber: 'EXCEL-INITIAL-IMPORT',
            remarks: 'Initial stock from Excel upload',
            processedBy: req.user?._id,
            processedByName: req.user?.name || 'System Operator',
          });
        }

        importedCount++;
      } catch (rowErr) {
        failedCount++;
        failureDetails.push({
          rowNumber: row.rowNumber,
          trackingId: row.trackingId,
          reason: rowErr.message,
        });
      }
    }

    res.json({
      success: true,
      summary: {
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      failureDetails,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export inventory matching VISTEON reference workbook (E-COMP MASTER)
// @route   GET /api/inventory/export/excel
// @access  Private
const exportPrimaryExcel = async (req, res, next) => {
  try {
    const { q, program, rack, bin, stockStatus } = req.query;
    const query = { active: true };

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [
        { partNumber: searchRegex },
        { mpn: searchRegex },
        { trackingId: searchRegex },
        { barcode: searchRegex },
        { rack: searchRegex },
        { bin: searchRegex },
      ];
    }
    if (program && program !== 'ALL') query.program = program;
    if (rack && rack !== 'ALL') query.rack = rack.toUpperCase().trim();
    if (bin && bin !== 'ALL') query.bin = bin.toUpperCase().trim();

    if (stockStatus === 'IN_STOCK') {
      query.availableQuantity = { $gt: 0 };
    } else if (stockStatus === 'LOW_STOCK') {
      query.$expr = {
        $and: [{ $gt: ['$availableQuantity', 0] }, { $lte: ['$availableQuantity', '$minStockThreshold'] }],
      };
    } else if (stockStatus === 'OUT_OF_STOCK') {
      query.availableQuantity = 0;
    }

    const items = await InventoryRecord.find(query).sort({ program: 1, partNumber: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VISTEON Inventory SaaS';
    workbook.lastModifiedBy = req.user?.name || 'Visteon Operations';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('E-COMP MASTER', {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { fitToPage: true, orientation: 'landscape' },
    });

    // Exact 8 columns as requested in user specification:
    // 1. S.no, 2. Part Number, 3. MPN, 4. Tracking, 5. Program, 6. Qty, 7. Location, 8. Remark
    worksheet.columns = [
      { header: 'S.no', key: 'sno', width: 8 },
      { header: 'Part Number', key: 'partNumber', width: 22 },
      { header: 'MPN', key: 'mpn', width: 20 },
      { header: 'Tracking', key: 'tracking', width: 20 },
      { header: 'Program', key: 'program', width: 18 },
      { header: 'Qty', key: 'qty', width: 12 },
      { header: 'Location', key: 'location', width: 22 },
      { header: 'Remark', key: 'remark', width: 35 },
    ];

    // Header styling - Visteon Corporate Orange #F58220
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF58220' }, // Visteon Orange
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cell.address === 'A1' || cell.address === 'F1' ? 'center' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'medium', color: { argb: 'FFD97706' } },
      };
    });

    // Populate data rows
    items.forEach((item, index) => {
      const row = worksheet.addRow({
        sno: index + 1,
        partNumber: item.partNumber,
        mpn: item.mpn,
        tracking: item.trackingId,
        program: item.program,
        qty: item.availableQuantity,
        location: item.storageBox || `${item.rack} / ${item.bin}`,
        remark: item.remarks || '',
      });

      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 6 ? 'center' : 'left',
        };
        // Explicit text formatting for alphanumeric columns to preserve leading zeros
        if (colNumber === 2 || colNumber === 3 || colNumber === 4) {
          cell.numFmt = '@';
        }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFF3F4F6' } },
        };
      });

      // Subtle alternate zebra row
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        });
      }
    });

    const filename = `Visteon_E-COMP_MASTER_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// @desc    Export enhanced inventory workbook with Barcode, Threshold, Rack, Bin
// @route   GET /api/inventory/export/enhanced
// @access  Private
const exportEnhancedExcel = async (req, res, next) => {
  try {
    const items = await InventoryRecord.find({ active: true }).sort({ program: 1, partNumber: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VISTEON Inventory SaaS';
    const worksheet = workbook.addWorksheet('ENHANCED MASTER');

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Part Number', key: 'partNumber', width: 22 },
      { header: 'MPN', key: 'mpn', width: 20 },
      { header: 'Tracking ID', key: 'trackingId', width: 20 },
      { header: 'Barcode (Code 128)', key: 'barcode', width: 22 },
      { header: 'Program', key: 'program', width: 18 },
      { header: 'Available Qty', key: 'availableQuantity', width: 14 },
      { header: 'Min Threshold', key: 'minStockThreshold', width: 14 },
      { header: 'Rack ID', key: 'rack', width: 14 },
      { header: 'Bin ID', key: 'bin', width: 14 },
      { header: 'Combined Location', key: 'storageBox', width: 22 },
      { header: 'Remarks', key: 'remarks', width: 30 },
      { header: 'Last Inward Date', key: 'lastInwardDate', width: 18 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF20252B' }, // Visteon Charcoal
      };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    items.forEach((item, index) => {
      worksheet.addRow({
        sno: index + 1,
        partNumber: item.partNumber,
        mpn: item.mpn,
        trackingId: item.trackingId,
        barcode: item.barcode,
        program: item.program,
        availableQuantity: item.availableQuantity,
        minStockThreshold: item.minStockThreshold,
        rack: item.rack,
        bin: item.bin,
        storageBox: item.storageBox,
        remarks: item.remarks,
        lastInwardDate: new Date(item.lastInwardDate).toLocaleDateString(),
      });
    });

    const filename = `Visteon_Enhanced_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  previewImport,
  executeImport,
  exportPrimaryExcel,
  exportEnhancedExcel,
};
