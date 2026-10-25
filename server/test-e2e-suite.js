const http = require('http');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed, raw: responseBody });
        } catch {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
};

async function runTests() {
  console.log('=== VISTEON INVENTORY SAAS E2E VERIFICATION SUITE ===\n');
  let token = null;

  // 1. Health Check
  console.log('Test 1: Health Check GET /api/health');
  const health = await request('GET', '/api/health');
  console.log('Status:', health.status, 'Response:', health.data.status, health.data.service);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Auth Login (Admin)
  console.log('\nTest 2: Auth Login POST /api/auth/login');
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@visteon.com',
    password: 'admin123',
  });
  console.log('Status:', loginRes.status, 'User:', loginRes.data.user.name, 'Role:', loginRes.data.user.role);
  if (loginRes.status !== 200 || !loginRes.data.token) throw new Error('Login failed');
  token = loginRes.data.token;

  // 3. Dashboard Summary (KPIs)
  console.log('\nTest 3: Live Dashboard KPIs GET /api/dashboard/summary');
  const dash = await request('GET', '/api/dashboard/summary', null, token);
  console.log('Status:', dash.status);
  console.log('KPI A (Inventory Records):', dash.data.kpis.inventoryRecords);
  console.log('KPI B (Unique Part Numbers):', dash.data.kpis.uniquePartNumbers);
  console.log('KPI C (Total Available Quantity):', dash.data.kpis.totalQuantity);
  console.log('KPI D (Storage Location in Boxes):', dash.data.kpis.storageBoxes);
  console.log('Stock by Programs Count:', dash.data.stockByProgram.length);
  if (dash.data.kpis.inventoryRecords <= 0 || dash.data.kpis.totalQuantity <= 0) {
    throw new Error('Dashboard KPI calculation failed');
  }

  // 4. Create Part (Inward Registration)
  console.log('\nTest 4: Register New Part (Inward) POST /api/inventory');
  const testTrackingId = `TRK-TEST-${Date.now().toString().slice(-4)}`;
  const createPartRes = await request(
    'POST',
    '/api/inventory',
    {
      partNumber: 'VP-TCU-TEST-99',
      mpn: '9844001199',
      trackingId: testTrackingId,
      program: 'Mahindra',
      quantity: 50,
      storageBox: 'BOX-TEST-01',
      remarks: 'Automated E2E Test Part',
    },
    token
  );
  console.log('Status:', createPartRes.status, 'Message:', createPartRes.data.message);
  if (createPartRes.status !== 201) throw new Error('Create Part failed: ' + JSON.stringify(createPartRes.data));
  const newPartId = createPartRes.data.item._id;

  // 5. Duplicate Tracking ID Prevention
  console.log('\nTest 5: Duplicate Tracking ID Validation');
  const dupRes = await request(
    'POST',
    '/api/inventory',
    {
      partNumber: 'VP-ANOTHER-01',
      mpn: '00000000',
      trackingId: testTrackingId, // same tracking ID!
      program: 'Tata',
      quantity: 10,
      storageBox: 'BOX-01',
    },
    token
  );
  console.log('Status:', dupRes.status, 'Rejected as expected:', dupRes.data.message);
  if (dupRes.status !== 400) throw new Error('Duplicate Tracking ID was not blocked!');

  // 6. Stock Inward Receipt (Receive Additional Stock)
  console.log('\nTest 6: Receive Stock Inward POST /api/stock/inward');
  const inwardRes = await request(
    'POST',
    '/api/stock/inward',
    {
      inventoryRecordId: newPartId,
      quantity: 25,
      referenceNumber: 'PO-TEST-8812',
      remarks: 'Test batch restock',
    },
    token
  );
  console.log('Status:', inwardRes.status, 'Message:', inwardRes.data.message);
  console.log('Updated Stock (should be 50 + 25 = 75):', inwardRes.data.item.availableQuantity);
  if (inwardRes.data.item.availableQuantity !== 75) throw new Error('Stock inward addition mismatch');

  // 7. Prevent Silent Stock Editing
  console.log('\nTest 7: Direct Stock Modification Prohibition PATCH /api/inventory/:id');
  const silentEditRes = await request(
    'PATCH',
    `/api/inventory/${newPartId}`,
    {
      availableQuantity: 9999, // trying to silently change quantity without transaction
    },
    token
  );
  console.log('Status:', silentEditRes.status, 'Blocked as expected:', silentEditRes.data.message);
  if (silentEditRes.status !== 400) throw new Error('Silent stock modification was not blocked!');

  // 8. Outward Dispatch (Stock-Out)
  console.log('\nTest 8: Outward Dispatch POST /api/stock/outward');
  const outwardRes = await request(
    'POST',
    '/api/stock/outward',
    {
      inventoryRecordId: newPartId,
      quantity: 20,
      recipient: 'Assembly Line 1 - Test Station',
      referenceNumber: 'WO-TEST-4001',
      remarks: 'E2E Outward Verification',
    },
    token
  );
  console.log('Status:', outwardRes.status, 'Message:', outwardRes.data.message);
  console.log('Remaining stock (75 - 20 = 55):', outwardRes.data.item.availableQuantity);
  if (outwardRes.data.item.availableQuantity !== 55) throw new Error('Stock outward decrement mismatch');

  // 9. Insufficient Stock Error
  console.log('\nTest 9: Insufficient Stock Handling');
  const overIssueRes = await request(
    'POST',
    '/api/stock/outward',
    {
      inventoryRecordId: newPartId,
      quantity: 9999, // far exceeding available 55
      recipient: 'Line 2',
    },
    token
  );
  console.log('Status:', overIssueRes.status, 'Blocked with clear message:', overIssueRes.data.message);
  if (overIssueRes.status !== 400) throw new Error('Over-issue was not blocked!');

  // 10. Outward Reports & Summary
  console.log('\nTest 10: Outward Reports GET /api/reports/outward');
  const reportsRes = await request('GET', '/api/reports/outward?program=Mahindra', null, token);
  console.log('Status:', reportsRes.status);
  console.log('Total Matching Outward Records:', reportsRes.data.summary.totalTransactions);
  console.log('Total Quantity Issued in Filter:', reportsRes.data.summary.totalQuantityIssued);
  if (reportsRes.status !== 200) throw new Error('Reports fetch failed');

  // 11. CSV Export Test
  console.log('\nTest 11: Export Outward CSV GET /api/reports/outward/export');
  const csvRes = await request('GET', '/api/reports/outward/export', null, token);
  console.log('Status:', csvRes.status, 'CSV Length bytes:', csvRes.raw.length);
  const firstLine = csvRes.raw.split('\r\n')[0];
  console.log('CSV Headers:', firstLine);
  if (!firstLine.includes('Transaction ID') || !firstLine.includes('Part Number')) {
    throw new Error('CSV headers format invalid');
  }

  // 12. Settings GET
  console.log('\nTest 12: System Settings GET /api/settings');
  const settingsRes = await request('GET', '/api/settings', null, token);
  console.log('Status:', settingsRes.status, 'Company:', settingsRes.data.settings.companyName);
  console.log('Telemetry active users:', settingsRes.data.systemStats.activeUsers);

  console.log('\n======================================================');
  console.log('>>> ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
