#!/usr/bin/env node
/**
 * Chunk 3 Test: Budgets + Tax APIs
 * Tests GET/POST budgets, PATCH budgets/[id], GET/POST tax records
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const roles = ['super_admin', 'accounting_manager', 'accounting_staff', 'finance_manager'];

// Create a JWT token
function createToken(role = 'super_admin') {
  return jwt.sign(
    { userId: 1, email: 'test@example.com', role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper to make HTTP requests
function makeRequest(method, path, data = null, token) {
  return new Promise((resolve) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            rawBody: body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: { error: 'Failed to parse JSON' },
            rawBody: body,
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message, body: {} });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  const token = createToken('super_admin');
  let testsPassed = 0;
  let testsFailed = 0;
  const results = [];

  console.log('\n=== CHUNK 3: BUDGETS + TAX APIS ===\n');

  // Test 1: GET /budgets (empty list initially)
  {
    const test = 'GET /api/accounting/budgets (empty list)';
    const res = await makeRequest('GET', `${API_BASE}/accounting/budgets`, null, token);
    const pass = res.status === 200 && Array.isArray(res.body);
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 2: POST /budgets (create first budget)
  let budgetId1;
  {
    const test = 'POST /api/accounting/budgets (create budget)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/budgets`, {
      departmentId: 1,
      fiscalYear: 2024,
      allocated: 100000,
    }, token);
    const pass = res.status === 201 && res.body.id && res.body.remaining === 100000 && res.body.utilizationPct === 0;
    budgetId1 = res.body.id;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] ${pass ? '(ID: ' + budgetId1 + ')' : ''}`);
  }

  // Test 3: POST /budgets (duplicate: should return 409)
  {
    const test = 'POST /api/accounting/budgets (duplicate, expect 409)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/budgets`, {
      departmentId: 1,
      fiscalYear: 2024,
      allocated: 150000,
    }, token);
    const pass = res.status === 409;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 4: POST /budgets (invalid allocated: should return 400)
  {
    const test = 'POST /api/accounting/budgets (negative allocated, expect 400)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/budgets`, {
      departmentId: 2,
      fiscalYear: 2024,
      allocated: -5000,
    }, token);
    const pass = res.status === 400;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 5: POST /budgets (create second budget for different dept/year)
  let budgetId2;
  {
    const test = 'POST /api/accounting/budgets (create budget 2)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/budgets`, {
      departmentId: 2,
      fiscalYear: 2024,
      allocated: 50000,
    }, token);
    const pass = res.status === 201 && res.body.id;
    budgetId2 = res.body.id;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] ${pass ? '(ID: ' + budgetId2 + ')' : ''}`);
  }

  // Test 6: GET /budgets with filters
  {
    const test = 'GET /api/accounting/budgets?departmentId=1 (filtered)';
    const res = await makeRequest('GET', `${API_BASE}/accounting/budgets?departmentId=1`, null, token);
    const pass = res.status === 200 && Array.isArray(res.body) && res.body.length >= 1;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] Count: ${res.body.length || 0}`);
  }

  // Test 7: PATCH /budgets/[id] (update allocated and spent)
  {
    const test = `PATCH /api/accounting/budgets/${budgetId1} (update allocated)`;
    const res = await makeRequest('PATCH', `${API_BASE}/accounting/budgets/${budgetId1}`, {
      allocated: 120000,
      spent: 30000,
    }, token);
    const pass = res.status === 200 && res.body.allocated === 120000 && res.body.spent === 30000 && res.body.remaining === 90000 && res.body.utilizationPct === 25;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] Remaining: ${res.body.remaining}, Util%: ${res.body.utilizationPct}`);
  }

  // Test 8: PATCH /budgets/[id] (invalid spent: should return 400)
  {
    const test = `PATCH /api/accounting/budgets/${budgetId1} (negative spent, expect 400)`;
    const res = await makeRequest('PATCH', `${API_BASE}/accounting/budgets/${budgetId1}`, {
      spent: -5000,
    }, token);
    const pass = res.status === 400;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 9: PATCH /budgets/[id] (invalid ID: should return 404)
  {
    const test = 'PATCH /api/accounting/budgets/99999 (not found, expect 404)';
    const res = await makeRequest('PATCH', `${API_BASE}/accounting/budgets/99999`, {
      allocated: 100000,
    }, token);
    const pass = res.status === 404;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  console.log('\n--- TAX RECORDS ---\n');

  // Test 10: GET /tax (empty list initially)
  {
    const test = 'GET /api/accounting/tax (empty list)';
    const res = await makeRequest('GET', `${API_BASE}/accounting/tax`, null, token);
    const pass = res.status === 200 && Array.isArray(res.body);
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 11: POST /tax (create tax record)
  let taxId1;
  {
    const test = 'POST /api/accounting/tax (create tax record)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/tax`, {
      type: 'VAT',
      amount: 5000,
      period: '2024-01',
      status: 'Pending',
    }, token);
    const pass = res.status === 201 && res.body.id && res.body.type === 'VAT' && res.body.period === '2024-01';
    taxId1 = res.body.id;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] ${pass ? '(ID: ' + taxId1 + ')' : ''}`);
  }

  // Test 12: POST /tax (invalid type: should return 400)
  {
    const test = 'POST /api/accounting/tax (invalid type, expect 400)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/tax`, {
      type: 'InvalidType',
      amount: 1000,
      period: '2024-01',
    }, token);
    const pass = res.status === 400;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 13: POST /tax (invalid period format: should return 400)
  {
    const test = 'POST /api/accounting/tax (invalid period format, expect 400)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/tax`, {
      type: 'GST',
      amount: 2000,
      period: 'invalid-period',
    }, token);
    const pass = res.status === 400;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 14: POST /tax (negative amount: should return 400)
  {
    const test = 'POST /api/accounting/tax (negative amount, expect 400)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/tax`, {
      type: 'Income Tax',
      amount: -1000,
      period: '2024-01',
    }, token);
    const pass = res.status === 400;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 15: POST /tax (create multiple records)
  {
    const test = 'POST /api/accounting/tax (create tax record 2)';
    const res = await makeRequest('POST', `${API_BASE}/accounting/tax`, {
      type: 'Income Tax',
      amount: 15000,
      period: '2024-02',
      status: 'Calculated',
    }, token);
    const pass = res.status === 201 && res.body.id;
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}]`);
  }

  // Test 16: GET /tax with filters
  {
    const test = 'GET /api/accounting/tax?type=VAT (filtered)';
    const res = await makeRequest('GET', `${API_BASE}/accounting/tax?type=VAT`, null, token);
    const pass = res.status === 200 && Array.isArray(res.body) && res.body.some(t => t.type === 'VAT');
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] Records: ${res.body.length}`);
  }

  // Test 17: GET /tax with period filter
  {
    const test = 'GET /api/accounting/tax?period=2024-01 (filtered by period)';
    const res = await makeRequest('GET', `${API_BASE}/accounting/tax?period=2024-01`, null, token);
    const pass = res.status === 200 && Array.isArray(res.body) && res.body.some(t => t.period === '2024-01');
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] Records: ${res.body.length}`);
  }

  // Test 18: GET /tax with status filter
  {
    const test = 'GET /api/accounting/tax?status=Pending (filtered by status)';
    const res = await makeRequest('GET', `${API_BASE}/accounting/tax?status=Pending`, null, token);
    const pass = res.status === 200 && Array.isArray(res.body);
    results.push({ test, status: res.status, pass });
    pass ? testsPassed++ : testsFailed++;
    console.log(`${pass ? '✓' : '✗'} ${test} [${res.status}] Records: ${res.body.length}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${testsPassed}/${results.length}`);
  console.log(`Failed: ${testsFailed}/${results.length}`);
  
  if (testsFailed === 0) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log('\n✗ Some tests failed:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  - ${r.test} [${r.status}]`);
    });
  }
}

runTests().catch(console.error);
