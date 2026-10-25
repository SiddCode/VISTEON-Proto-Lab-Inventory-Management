const BASE_URL = 'http://127.0.0.1:5000';

async function runVerification() {
  console.log('====================================================');
  console.log('🔍 VISTEON PRODUCTION DEPLOYMENT & AUTH VERIFICATION');
  console.log('====================================================\n');

  // 1. Test Root Service Probe (GET /)
  console.log('👉 [1/8] Testing Root Health Probe (GET /)...');
  const rootRes = await fetch(`${BASE_URL}/`);
  if (!rootRes.ok) {
    throw new Error(`Expected HTTP 200 from GET /, got ${rootRes.status}`);
  }
  const rootData = await rootRes.json();
  if (rootData.status !== 'ok' || !rootData.service.includes('Visteon Inventory API')) {
    throw new Error(`Unexpected GET / response: ${JSON.stringify(rootData)}`);
  }
  console.log('   ✅ GET / returned 200 OK:', rootData);

  // 2. Test Detailed Health Probe (GET /api/health)
  console.log('\n👉 [2/8] Testing MongoDB Connection Health Probe (GET /api/health)...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Expected HTTP 200 from /api/health, got ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  if (healthData.status !== 'healthy' || healthData.database?.readyState !== 1) {
    throw new Error(`Database connection unhealthy: ${JSON.stringify(healthData)}`);
  }
  console.log('   ✅ GET /api/health returned 200 OK (readyState = 1, connected):', healthData.database);

  // 3. Test Admin Login (POST /api/auth/login)
  console.log('\n👉 [3/8] Testing Admin Login (POST /api/auth/login)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@visteon.com', password: 'admin123' }),
  });
  if (!adminLoginRes.ok) {
    throw new Error(`Admin login failed with status ${adminLoginRes.status}`);
  }
  const adminData = await adminLoginRes.json();
  if (!adminData.success || !adminData.token || !adminData.user) {
    throw new Error(`Invalid login response structure: ${JSON.stringify(adminData)}`);
  }
  if (adminData.user.role !== 'ADMIN' || adminData.user.email !== 'admin@visteon.com') {
    throw new Error(`User object property mismatch: ${JSON.stringify(adminData.user)}`);
  }
  if (adminData.user.password || adminData.password) {
    throw new Error('Security violation: password was returned in API response!');
  }
  const adminToken = adminData.token;
  console.log(`   ✅ Admin logged in successfully.`);
  console.log(`   ✅ Token acquired (JWT format validated: ${adminToken.split('.').length === 3})`);
  console.log('   ✅ User object structure:', adminData.user);

  // 4. Test Operator Login (POST /api/auth/login)
  console.log('\n👉 [4/8] Testing Operator Login (POST /api/auth/login)...');
  const opLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator@visteon.com', password: 'operator123' }),
  });
  if (!opLoginRes.ok) {
    throw new Error(`Operator login failed with status ${opLoginRes.status}`);
  }
  const opData = await opLoginRes.json();
  if (!opData.success || opData.user.role !== 'OPERATOR') {
    throw new Error(`Operator role validation failed: ${JSON.stringify(opData)}`);
  }
  console.log(`   ✅ Operator logged in successfully: ${opData.user.email} (Role: ${opData.user.role})`);

  // 5. Test Invalid Credentials Rejection (POST /api/auth/login)
  console.log('\n👉 [5/8] Testing Invalid Password Rejection (POST /api/auth/login)...');
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@visteon.com', password: 'wrongpassword' }),
  });
  if (badLoginRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for bad password, got ${badLoginRes.status}`);
  }
  const badData = await badLoginRes.json();
  console.log(`   ✅ Invalid password rejected with HTTP 401: "${badData.message}"`);

  // 6. Test Session Verification Endpoint (GET /api/auth/me)
  console.log('\n👉 [6/8] Testing Session Verification (GET /api/auth/me with Bearer token)...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!meRes.ok) {
    throw new Error(`GET /api/auth/me failed with status ${meRes.status}`);
  }
  const meData = await meRes.json();
  if (!meData.success || meData.user.email !== 'admin@visteon.com') {
    throw new Error(`GET /api/auth/me returned invalid user: ${JSON.stringify(meData)}`);
  }
  console.log('   ✅ GET /api/auth/me successfully validated token and returned profile:', meData.user);

  // 7. Test Protected Route Access with Token (GET /api/dashboard/summary)
  console.log('\n👉 [7/8] Testing Protected Dashboard Route (GET /api/dashboard/summary)...');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!dashRes.ok) {
    throw new Error(`Dashboard request failed with status ${dashRes.status}`);
  }
  const dashData = await dashRes.json();
  if (!dashData.success || !dashData.kpis) {
    throw new Error('Dashboard response missing KPIs');
  }
  console.log('   ✅ Authenticated request succeeded. Dashboard KPIs loaded live:');
  console.log('      - Inventory Records:', dashData.kpis.inventoryRecords);
  console.log('      - Unique Part Numbers:', dashData.kpis.uniquePartNumbers);
  console.log('      - Total Quantity:', dashData.kpis.totalQuantity);
  console.log('      - Storage Boxes:', dashData.kpis.storageBoxes);

  // 8. Test Protected Route Rejection on Missing / Bad Token
  console.log('\n👉 [8/8] Testing Protected Route Guarding (No Token & Bogus Token)...');
  const noTokenRes = await fetch(`${BASE_URL}/api/dashboard/summary`);
  if (noTokenRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated request, got ${noTokenRes.status}`);
  }

  const badTokenRes = await fetch(`${BASE_URL}/api/dashboard/summary`, {
    headers: { Authorization: 'Bearer this.is.a.bogus.jwt.token' },
  });
  if (badTokenRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for bogus token, got ${badTokenRes.status}`);
  }
  console.log('   ✅ Protected routes correctly reject unauthenticated requests with HTTP 401.');

  console.log('\n====================================================');
  console.log('🎉 ALL 8 PRODUCTION DEPLOYMENT & AUTH TESTS PASSED!');
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
