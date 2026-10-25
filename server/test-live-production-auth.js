const https = require('https');

const BACKEND_URL = 'https://visteon-proto-lab-inventory-management-l0rc.onrender.com';
const FRONTEND_URL = 'https://visteon-proto-lab-inventory-management.onrender.com';

function httpRequest(urlStr, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: data,
          bodyLength: Buffer.byteLength(data),
          body: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runLiveRegressionTests() {
  console.log('===============================================================');
  console.log('VISTEON LIVE PRODUCTION ENDPOINT & AUTHENTICATION REGRESSION TEST');
  console.log('Backend Web Service : ' + BACKEND_URL);
  console.log('Frontend Static Site: ' + FRONTEND_URL);
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${title} ${extra}`);
      failed++;
    }
  }

  // 1. Root Probe on Backend
  console.log('[Test 1] Backend GET / root probe...');
  const rootRes = await httpRequest(`${BACKEND_URL}/`);
  assert('Root probe returns HTTP 200', rootRes.statusCode === 200);
  assert('Root probe returns valid JSON with service name', rootRes.body && rootRes.body.service === 'Visteon Inventory API');

  // 2. Health Endpoint on Backend
  console.log('\n[Test 2] Backend GET /api/health (MongoDB state)...');
  const healthRes = await httpRequest(`${BACKEND_URL}/api/health`);
  assert('Health endpoint returns HTTP 200', healthRes.statusCode === 200);
  assert('Database status is connected', healthRes.body && healthRes.body.database && healthRes.body.database.status === 'connected');
  assert('Database readyState is 1', healthRes.body && healthRes.body.database && healthRes.body.database.readyState === 1);

  // 3. Negative test: Wrong password on live backend
  console.log('\n[Test 3] Backend POST /api/auth/login with incorrect credentials...');
  const wrongPassRes = await httpRequest(`${BACKEND_URL}/api/auth/login`, 'POST', {
    email: 'admin@visteon.com',
    password: 'incorrect_password_attempt',
  });
  assert('Wrong password returns HTTP 401', wrongPassRes.statusCode === 401);
  assert('Non-empty JSON body returned', wrongPassRes.bodyLength > 0);
  assert('Safe error message returned', wrongPassRes.body && wrongPassRes.body.message.includes('Invalid'));

  // 4. Positive test: Valid Admin login on live backend
  console.log('\n[Test 4] Backend POST /api/auth/login with valid Admin credentials...');
  const adminLoginRes = await httpRequest(`${BACKEND_URL}/api/auth/login`, 'POST', {
    email: 'admin@visteon.com',
    password: 'admin123',
  });
  assert('Admin login returns HTTP 200', adminLoginRes.statusCode === 200);
  assert('Admin login bodyLength > 0 (NOT Content-Length: 0)', adminLoginRes.bodyLength > 0, `Length: ${adminLoginRes.bodyLength}`);
  assert('Response has Content-Type application/json', adminLoginRes.headers['content-type'] && adminLoginRes.headers['content-type'].includes('application/json'));
  assert('Admin login returns success=true', adminLoginRes.body && adminLoginRes.body.success === true);
  assert('Valid JWT token received', adminLoginRes.body && typeof adminLoginRes.body.token === 'string' && adminLoginRes.body.token.length > 20);
  assert('Admin role returned', adminLoginRes.body && adminLoginRes.body.user && String(adminLoginRes.body.user.role).toUpperCase() === 'ADMIN');

  const adminToken = adminLoginRes.body?.token;

  // 5. Positive test: Valid Operator login on live backend
  console.log('\n[Test 5] Backend POST /api/auth/login with valid Operator credentials...');
  const opLoginRes = await httpRequest(`${BACKEND_URL}/api/auth/login`, 'POST', {
    email: 'operator@visteon.com',
    password: 'operator123',
  });
  assert('Operator login returns HTTP 200', opLoginRes.statusCode === 200);
  assert('Operator role returned', opLoginRes.body && opLoginRes.body.user && String(opLoginRes.body.user.role).toUpperCase() === 'OPERATOR');

  // 6. Token verification on live backend
  console.log('\n[Test 6] Backend GET /api/auth/me with Bearer token...');
  const meRes = await httpRequest(`${BACKEND_URL}/api/auth/me`, 'GET', null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert('GET /api/auth/me returns HTTP 200', meRes.statusCode === 200);
  assert('Authenticated profile email matches admin', meRes.body && meRes.body.user && meRes.body.user.email === 'admin@visteon.com');

  // 7. Protected route on live backend
  console.log('\n[Test 7] Backend GET /api/dashboard/summary with Bearer token...');
  const dashRes = await httpRequest(`${BACKEND_URL}/api/dashboard/summary`, 'GET', null, {
    Authorization: `Bearer ${adminToken}`,
  });
  assert('GET /api/dashboard/summary returns HTTP 200', dashRes.statusCode === 200);
  assert('KPIs returned from MongoDB Atlas', dashRes.body && dashRes.body.success === true && dashRes.body.kpis !== undefined);

  // 8. Contrast demonstration: Probing the Static CDN URL to show root cause
  console.log('\n[Test 8] Probing the Frontend Static Site CDN directly at /api/auth/login (Root Cause Demonstration)...');
  const cdnPostRes = await httpRequest(`${FRONTEND_URL}/api/auth/login`, 'POST', {
    email: 'admin@visteon.com',
    password: 'any',
  });
  assert('Static CDN returns HTTP 200 with Content-Length: 0', cdnPostRes.statusCode === 200 && cdnPostRes.bodyLength === 0);
  console.log(`ℹ️ Root cause confirmed: Cloudflare/Render Static CDN served rewritten static HTML header (Content-Length: ${cdnPostRes.headers['content-length'] || 0})`);

  console.log('\n===============================================================');
  console.log(`LIVE REGRESSION TESTS FINISHED: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runLiveRegressionTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
