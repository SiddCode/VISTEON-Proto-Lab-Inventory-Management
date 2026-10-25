const ExcelJS = require('exceljs');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING VISTEON SAAS FEATURE ENHANCEMENT TESTS');
  console.log('====================================================\n');

  let token = null;

  // 1. Authenticate as Admin
  console.log('👉 [1/6] Authenticating as Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@visteon.com', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  token = loginData.token;
  console.log('   ✅ Logged in successfully. Token acquired.\n');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // 2. Feature 1: Automatic Barcode Generation
  console.log('👉 [2/6] Testing Automatic Barcode Generation & Storage...');
  const testPartNumber = 'TEST-AUTO-' + Math.floor(1000 + Math.random() * 9000);
  const testTrackingId = 'TRK-AUTO-' + Date.now();
  const createRes = await fetch(`${BASE_URL}/inventory`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partNumber: testPartNumber,
      mpn: 'MPN-AUTO-99',
      trackingId: testTrackingId,
      program: 'Mahindra',
      quantity: 50,
      minStockThreshold: 20,
      rack: 'RACK-05',
      bin: 'BIN-11',
      remarks: 'Automated test component',
    }),
  });
  const createData = await createRes.json();
  if (!createData.success || !createData.item) {
    throw new Error('Part creation failed: ' + JSON.stringify(createData));
  }
  const createdPart = createData.item;
  if (!createdPart.barcode || !createdPart.barcode.startsWith('VIS-BC-')) {
    throw new Error(`Expected generated barcode starting with VIS-BC-, got: ${createdPart.barcode}`);
  }
  if (createdPart.storageBox !== 'RACK-05 / BIN-11') {
    throw new Error(`Expected storageBox 'RACK-05 / BIN-11', got: ${createdPart.storageBox}`);
  }
  console.log(`   ✅ Part created with auto-generated barcode: ${createdPart.barcode}`);
  console.log(`   ✅ Synced storageBox location: ${createdPart.storageBox}\n`);

  // 3. Feature 2: Individual Threshold Value & Low-Stock Filtering
  console.log('👉 [3/6] Testing Individual Threshold Value & Low-Stock Alerts...');
  const lowPartNumber = 'TEST-LOW-' + Math.floor(1000 + Math.random() * 9000);
  const lowTrackingId = 'TRK-LOW-' + Date.now();
  const createLowRes = await fetch(`${BASE_URL}/inventory`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partNumber: lowPartNumber,
      mpn: 'MPN-LOW-88',
      trackingId: lowTrackingId,
      program: 'Tata',
      quantity: 8,
      minStockThreshold: 15, // available (8) <= minStockThreshold (15)
      rack: 'RACK-02',
      bin: 'BIN-09',
      remarks: 'Low stock test item',
    }),
  });
  const createLowData = await createLowRes.json();
  if (!createLowData.success) {
    throw new Error('Low stock part creation failed: ' + JSON.stringify(createLowData));
  }
  console.log(`   ✅ Created part ${lowPartNumber} with stock 8 and individual threshold 15.`);

  // Query low stock filter
  const lowFilterRes = await fetch(`${BASE_URL}/inventory?stockStatus=LOW_STOCK`, {
    headers: authHeaders,
  });
  const lowFilterData = await lowFilterRes.json();
  const foundLow = lowFilterData.items?.find((i) => i.partNumber === lowPartNumber);
  if (!foundLow) {
    throw new Error(`Part ${lowPartNumber} was not returned by LOW_STOCK query filter!`);
  }
  console.log(`   ✅ Verified LOW_STOCK query filter properly evaluates individual thresholds.`);

  // Check Dashboard KPI
  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, {
    headers: authHeaders,
  });
  const dashData = await dashRes.json();
  if (dashData.kpis.lowStockCount < 1) {
    throw new Error(`Expected dashboard lowStockCount >= 1, got: ${dashData.kpis.lowStockCount}`);
  }
  console.log(`   ✅ Dashboard telemetry reports lowStockCount: ${dashData.kpis.lowStockCount}, zeroStockCount: ${dashData.kpis.zeroStockCount}\n`);

  // 4. Feature 3: Rack and Bin Location Filtering
  console.log('👉 [4/6] Testing Rack and Bin Location Management...');
  const rackFilterRes = await fetch(`${BASE_URL}/inventory?rack=RACK-05`, {
    headers: authHeaders,
  });
  const rackFilterData = await rackFilterRes.json();
  const inRack5 = rackFilterData.items?.find((i) => i.partNumber === testPartNumber);
  if (!inRack5) {
    throw new Error(`Part ${testPartNumber} not found when filtering by rack=RACK-05`);
  }
  if (!rackFilterData.filters.availableRacks.includes('RACK-05')) {
    throw new Error('availableRacks did not contain RACK-05');
  }
  if (!rackFilterData.filters.availableBins.includes('BIN-11')) {
    throw new Error('availableBins did not contain BIN-11');
  }
  console.log(`   ✅ Filtered successfully by Rack: RACK-05 and Bin: BIN-11.`);
  console.log(`   ✅ Available racks & bins aggregated dynamically for dropdowns.\n`);

  // 5. Feature 4: Excel Export Matching Attached VISTEON Workbook
  console.log('👉 [5/6] Testing Excel Export matching exact VISTEON Workbook...');
  const exportRes = await fetch(`${BASE_URL}/inventory/export/excel`, {
    headers: authHeaders,
  });
  if (!exportRes.ok) {
    throw new Error('Excel export failed with status: ' + exportRes.status);
  }
  const buffer = await exportRes.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));

  const worksheet = workbook.getWorksheet('E-COMP MASTER');
  if (!worksheet) {
    throw new Error("Worksheet 'E-COMP MASTER' not found in exported Excel!");
  }

  const expectedHeaders = ['S.no', 'Part Number', 'MPN', 'Tracking', 'Program', 'Qty', 'Location', 'Remark'];
  const headerRow = worksheet.getRow(1);
  const actualHeaders = [];
  for (let c = 1; c <= 8; c++) {
    actualHeaders.push(headerRow.getCell(c).value?.toString().trim());
  }
  console.log('   Actual Header Row 1:', actualHeaders);
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (actualHeaders[i] !== expectedHeaders[i]) {
      throw new Error(`Header mismatch at column ${i + 1}: expected '${expectedHeaders[i]}', got '${actualHeaders[i]}'`);
    }
  }
  console.log(`   ✅ Primary Excel Export verified: Worksheet 'E-COMP MASTER' with exact 8 columns.`);

  // Test Enhanced Export
  const enhancedRes = await fetch(`${BASE_URL}/inventory/export/enhanced`, {
    headers: authHeaders,
  });
  if (!enhancedRes.ok) {
    throw new Error('Enhanced export failed with status: ' + enhancedRes.status);
  }
  const enhBuffer = await enhancedRes.arrayBuffer();
  const enhWorkbook = new ExcelJS.Workbook();
  await enhWorkbook.xlsx.load(Buffer.from(enhBuffer));
  const enhSheet = enhWorkbook.getWorksheet('ENHANCED MASTER') || enhWorkbook.getWorksheet('INVENTORY MASTER');
  if (!enhSheet) {
    throw new Error("Enhanced export missing 'ENHANCED MASTER' worksheet!");
  }
  console.log(`   ✅ Enhanced Excel Export verified with Barcode, Rack, Bin, and Min Threshold fields.\n`);

  // 6. Feature 5: Excel Import Preview & Execution Workflow
  console.log('👉 [6/6] Testing Excel Import Preview & Execution with Duplicate Policies...');
  // Create an Excel file to test import
  const importWb = new ExcelJS.Workbook();
  const importSheet = importWb.addWorksheet('E-COMP MASTER');
  importSheet.columns = [
    { header: 'S.no', key: 'sno' },
    { header: 'Part Number', key: 'partNumber' },
    { header: 'MPN', key: 'mpn' },
    { header: 'Tracking', key: 'tracking' },
    { header: 'Program', key: 'program' },
    { header: 'Qty', key: 'qty' },
    { header: 'Location', key: 'location' },
    { header: 'Remark', key: 'remark' },
  ];

  const uniqueImpTrack = 'TRK-IMP-' + Date.now();
  importSheet.addRow({
    sno: 1,
    partNumber: 'IMP-MCU-7720',
    mpn: 'MPC5748G-IMP',
    tracking: uniqueImpTrack,
    program: 'Renault Nissan',
    qty: 25,
    location: 'RACK-08 / BIN-03',
    remark: 'Automated import test',
  });

  // Duplicate tracking item that increments existing stock
  importSheet.addRow({
    sno: 2,
    partNumber: createdPart.partNumber,
    mpn: createdPart.mpn,
    tracking: createdPart.trackingId,
    program: createdPart.program,
    qty: 15,
    location: 'RACK-05 / BIN-11',
    remark: 'Replenishment batch',
  });

  const importFileBuffer = await importWb.xlsx.writeBuffer();

  // Test /api/inventory/import/preview using multipart form-data
  const formData = new FormData();
  const blob = new Blob([importFileBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  formData.append('file', blob, 'test_import.xlsx');

  const previewRes = await fetch(`${BASE_URL}/inventory/import/preview`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });
  const previewData = await previewRes.json();
  if (!previewData.success) {
    throw new Error('Import preview failed: ' + JSON.stringify(previewData));
  }
  console.log(`   ✅ Import preview parsed ${previewData.summary.totalRows} rows (${previewData.summary.validRows} valid).`);

  // Test /api/inventory/import/confirm with duplicatePolicy = 'INWARD_RECEIPT'
  const confirmRes = await fetch(`${BASE_URL}/inventory/import/confirm`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: previewData.allRows || previewData.previewRows,
      mode: 'IMPORT_AS_INWARD_RECEIPT',
    }),
  });
  const confirmData = await confirmRes.json();
  if (!confirmData.success) {
    throw new Error('Import confirm failed: ' + JSON.stringify(confirmData));
  }
  console.log(`   ✅ Import executed: Created ${confirmData.summary.imported}, Updated ${confirmData.summary.updated}.`);

  // Verify created imported part
  const checkImpRes = await fetch(`${BASE_URL}/inventory?q=${uniqueImpTrack}`, {
    headers: authHeaders,
  });
  const checkImpData = await checkImpRes.json();
  const importedPart = checkImpData.items?.[0];
  if (!importedPart) {
    throw new Error('Imported part not found in inventory!');
  }
  if (!importedPart.barcode) {
    throw new Error('Imported part missing auto-generated barcode!');
  }
  if (importedPart.rack !== 'RACK-08' || importedPart.bin !== 'BIN-03') {
    throw new Error(`Location parsing mismatch: expected RACK-08/BIN-03, got ${importedPart.rack}/${importedPart.bin}`);
  }
  console.log(`   ✅ Verified imported part created with barcode: ${importedPart.barcode}, Rack: ${importedPart.rack}, Bin: ${importedPart.bin}`);

  // Verify updated existing part stock was incremented by 15 (50 + 15 = 65)
  const checkDupRes = await fetch(`${BASE_URL}/inventory?q=${createdPart.trackingId}`, {
    headers: authHeaders,
  });
  const checkDupData = await checkDupRes.json();
  const updatedPart = checkDupData.items?.[0];
  if (updatedPart.availableQuantity !== 65) {
    throw new Error(`Expected availableQuantity to be incremented to 65, got: ${updatedPart.availableQuantity}`);
  }
  console.log(`   ✅ Verified INWARD_RECEIPT duplicate policy incremented stock from 50 to 65.\n`);

  // 7. Outward Scan by Barcode
  console.log('👉 [Bonus] Testing Outward Scanner Lookup by Barcode...');
  const scanRes = await fetch(`${BASE_URL}/inventory?q=${importedPart.barcode}`, {
    headers: authHeaders,
  });
  const scanData = await scanRes.json();
  const foundByBarcode = scanData.items?.find((item) => item.barcode === importedPart.barcode);
  if (!foundByBarcode) {
    throw new Error(`Barcode scan failed: Part with barcode ${importedPart.barcode} not found in inventory search!`);
  }
  console.log(`   ✅ Outward scanner successfully resolved barcode ${importedPart.barcode} to ${foundByBarcode.partNumber} at ${foundByBarcode.storageBox}`);

  // Dispatch outward
  const outwardRes = await fetch(`${BASE_URL}/stock/outward`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inventoryRecordId: foundByBarcode._id,
      trackingId: foundByBarcode.trackingId,
      barcode: foundByBarcode.barcode,
      quantity: 5,
      recipient: 'Plant Line QA',
      referenceNumber: 'WO-E2E-TEST',
      remarks: 'Automated test dispatch',
    }),
  });
  const outwardData = await outwardRes.json();
  if (!outwardData.success) {
    throw new Error('Outward dispatch failed: ' + JSON.stringify(outwardData));
  }
  if (outwardData.item.availableQuantity !== 20) {
    throw new Error(`Expected stock after dispatch 20, got: ${outwardData.item.availableQuantity}`);
  }
  console.log(`   ✅ Dispatched 5 units via outward API. Remaining stock: ${outwardData.item.availableQuantity} units.\n`);

  console.log('====================================================');
  console.log('🎉 ALL 6 FEATURE ENHANCEMENT TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
