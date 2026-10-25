const http = require('http');

const API_BASE = 'http://127.0.0.1:5000';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const postData = body ? JSON.stringify(body) : null;

    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
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

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('====================================================');
  console.log('VISTEON Full Auth & API Diagnostic Verification Test');
  console.log('Target: ' + API_BASE);
  console.log('====================================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(title, condition, extraInfo = '') {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${title} ${extraInfo}`);
      testsFailed++;
    }
  }

  try {
    // 1. GET / Root probe
    console.log('[Test 1] Testing GET / (Render root health check probe)...');
    const rootRes = await makeRequest('GET', '/');
    assert('GET / returns 200', rootRes.statusCode === 200);
    assert('GET / returns valid JSON', rootRes.body && rootRes.body.status === 'ok');
    assert('GET / service name matches', rootRes.body && rootRes.body.service === 'Visteon Inventory API');

    // 2. GET /api/health
    console.log('\n[Test 2] Testing GET /api/health (DB Connection state)...');
    const healthRes = await makeRequest('GET', '/api/health');
    assert('GET /api/health returns 200', healthRes.statusCode === 200);
    assert('GET /api/health db readyState is 1 (connected)', healthRes.body && healthRes.body.database && healthRes.body.database.readyState === 1);
    assert('GET /api/health db status is "connected"', healthRes.body && healthRes.body.database && healthRes.body.database.status === 'connected');

    // 3. POST /api/auth/login with empty body
    console.log('\n[Test 3] Testing POST /api/auth/login with missing email/password...');
    const emptyLoginRes = await makeRequest('POST', '/api/auth/login', {});
    assert('Missing credentials returns HTTP 400', emptyLoginRes.statusCode === 400);
    assert('Returns JSON success=false', emptyLoginRes.body && emptyLoginRes.body.success === false);
    assert('Non-zero response body', emptyLoginRes.bodyLength > 0, `Length was: ${emptyLoginRes.bodyLength}`);

    // 4. POST /api/auth/login with unknown user
    console.log('\n[Test 4] Testing POST /api/auth/login with non-existent user...');
    const unknownRes = await makeRequest('POST', '/api/auth/login', {
      email: 'nonexistent_user_99@visteon.com',
      password: 'SomePassword123!',
    });
    assert('Unknown user returns HTTP 401', unknownRes.statusCode === 401);
    assert('Returns JSON success=false', unknownRes.body && unknownRes.body.success === false);
    assert('Safe error message returned', unknownRes.body && unknownRes.body.message.includes('User not found'));

    // 5. POST /api/auth/login with incorrect password
    console.log('\n[Test 5] Testing POST /api/auth/login with incorrect password...');
    const wrongPassRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@visteon.com',
      password: 'wrong_password_attempt',
    });
    assert('Wrong password returns HTTP 401', wrongPassRes.statusCode === 401);
    assert('Returns JSON success=false', wrongPassRes.body && wrongPassRes.body.success === false);
    assert('Returns safe error message', wrongPassRes.body && wrongPassRes.body.message.includes('Invalid'));

    // 6. POST /api/auth/login with valid Admin credentials
    console.log('\n[Test 6] Testing POST /api/auth/login with valid Admin credentials...');
    const adminLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@visteon.com',
      password: 'admin123',
    });
    assert('Admin login returns HTTP 200', adminLoginRes.statusCode === 200);
    assert('Admin login bodyLength > 0 (NOT Content-Length: 0)', adminLoginRes.bodyLength > 0, `Length: ${adminLoginRes.bodyLength}`);
    assert('Admin login response has Content-Type application/json', adminLoginRes.headers['content-type'] && adminLoginRes.headers['content-type'].includes('application/json'));
    assert('Admin login returns success=true', adminLoginRes.body && adminLoginRes.body.success === true);
    assert('Admin login returns valid JWT token string', adminLoginRes.body && typeof adminLoginRes.body.token === 'string' && adminLoginRes.body.token.length > 20);
    assert('Admin login returns user object with role "ADMIN"', adminLoginRes.body && adminLoginRes.body.user && String(adminLoginRes.body.user.role).toUpperCase() === 'ADMIN');
    assert('Admin user email matches', adminLoginRes.body && adminLoginRes.body.user && adminLoginRes.body.user.email === 'admin@visteon.com');

    const adminToken = adminLoginRes.body ? adminLoginRes.body.token : null;

    // 7. POST /api/auth/login with valid Operator credentials
    console.log('\n[Test 7] Testing POST /api/auth/login with valid Operator credentials...');
    const opLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'operator@visteon.com',
      password: 'operator123',
    });
    assert('Operator login returns HTTP 200', opLoginRes.statusCode === 200);
    assert('Operator login returns success=true', opLoginRes.body && opLoginRes.body.success === true);
    assert('Operator user role is "OPERATOR"', opLoginRes.body && opLoginRes.body.user && String(opLoginRes.body.user.role).toUpperCase() === 'OPERATOR');

    // 8. GET /api/auth/me with Bearer token
    console.log('\n[Test 8] Testing GET /api/auth/me using Admin token...');
    const meRes = await makeRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert('GET /api/auth/me returns HTTP 200', meRes.statusCode === 200);
    assert('User profile matches authenticated user', meRes.body && meRes.body.user && meRes.body.user.email === 'admin@visteon.com');

    // 9. Protected route test: GET /api/dashboard/summary with Bearer token
    console.log('\n[Test 9] Testing protected endpoint GET /api/dashboard/summary with Admin token...');
    const dashboardRes = await makeRequest('GET', '/api/dashboard/summary', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert('GET /api/dashboard/summary returns HTTP 200', dashboardRes.statusCode === 200);
    assert('Summary KPIs returned', dashboardRes.body && dashboardRes.body.success === true && dashboardRes.body.kpis !== undefined);

    // 10. Protected route test without token
    console.log('\n[Test 10] Testing protected endpoint without token...');
    const unauthRes = await makeRequest('GET', '/api/dashboard/summary');
    assert('Request without token returns HTTP 401', unauthRes.statusCode === 401);
    assert('Returns unauthorized message', unauthRes.body && unauthRes.body.message && unauthRes.body.message.includes('Not authorized'));

    console.log('\n====================================================');
    console.log(`AUTH TEST MATRIX COMPLETE: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('====================================================\n');

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runAuthTests();
