#!/usr/bin/env node
const http = require('http');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;

function makeRequest(method, path, data = null, token) {
  return new Promise((resolve) => {
    const normalizedPath = path.startsWith('/api/')
      ? path
      : `/api${path.startsWith('/') ? path : `/${path}`}`;
    const url = new URL(normalizedPath, API_BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
          } catch {
            resolve({ status: res.statusCode, body: body || null });
          }
        });
      }
    );

    req.on('error', (error) => resolve({ status: 0, body: { error: error.message } }));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function fmt2(value) {
  return Number.parseFloat(Number(value).toFixed(2));
}

function sameMoney(actual, expected) {
  return Math.abs(fmt2(actual) - fmt2(expected)) < 0.01;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function createToken() {
  return jwt.sign(
    { id: 1, name: 'Chunk4 Tester', email: 'chunk4@example.com', role: 'super_admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function ensureAccount(token, { code, name, type }) {
  const existing = await makeRequest('GET', `/accounting/accounts?q=${encodeURIComponent(code)}`, null, token);
  if (existing.status !== 200 || !Array.isArray(existing.body)) {
    throw new Error(`Failed to fetch accounts for ${code}`);
  }

  const exact = existing.body.find((item) => item.code === code);
  if (exact) return exact.id;

  const created = await makeRequest('POST', '/accounting/accounts', { code, name, type }, token);
  if (created.status !== 201) {
    throw new Error(`Failed to create account ${code} (${created.status})`);
  }
  return created.body.id;
}

async function createJournal(token, payload) {
  const created = await makeRequest('POST', '/accounting/journal', payload, token);
  if (created.status !== 201) {
    throw new Error(`Failed to create journal (${created.status}): ${JSON.stringify(created.body)}`);
  }
  return created.body;
}

async function run() {
  if (!JWT_SECRET) {
    console.error('Missing JWT_SECRET in environment');
    process.exit(1);
  }

  const token = createToken();
  let passed = 0;
  let failed = 0;
  const failures = [];

  const slot = Math.floor(Date.now() / 1000);
  const year = 2050 + (slot % 40);
  const month = 1 + (Math.floor(slot / 40) % 12);
  const from = `${year}-${pad2(month)}-01`;
  const to = `${year}-${pad2(month)}-28`;
  const d1 = `${year}-${pad2(month)}-10`;
  const d2 = `${year}-${pad2(month)}-12`;
  const d3 = `${year}-${pad2(month)}-15`;
  const d4 = `${year}-${pad2(month)}-18`;
  const runRef = `CH4-${slot}`;

  console.log(`\n=== CHUNK 4 REPORT ENGINE TEST (${year}-${pad2(month)}) ===\n`);

  const cashId = await ensureAccount(token, { code: '1000', name: 'Cash on Hand', type: 'Asset' });
  const equipmentId = await ensureAccount(token, { code: '1500', name: 'Equipment', type: 'Asset' });
  const loanPayableId = await ensureAccount(token, { code: '2100', name: 'Loan Payable', type: 'Liability' });
  const revenueId = await ensureAccount(token, { code: '4100', name: 'Service Revenue', type: 'Revenue' });
  const rentExpenseId = await ensureAccount(token, { code: '5100', name: 'Rent Expense', type: 'Expense' });

  await createJournal(token, {
    date: d1,
    reference: `${runRef}-OP-IN`,
    description: 'Cash sale',
    lines: [
      { accountId: cashId, debit: 1000, credit: 0 },
      { accountId: revenueId, debit: 0, credit: 1000 },
    ],
  });
  await createJournal(token, {
    date: d2,
    reference: `${runRef}-OP-OUT`,
    description: 'Rent payment',
    lines: [
      { accountId: rentExpenseId, debit: 300, credit: 0 },
      { accountId: cashId, debit: 0, credit: 300 },
    ],
  });
  await createJournal(token, {
    date: d3,
    reference: `${runRef}-INV-OUT`,
    description: 'Equipment purchase',
    lines: [
      { accountId: equipmentId, debit: 500, credit: 0 },
      { accountId: cashId, debit: 0, credit: 500 },
    ],
  });
  await createJournal(token, {
    date: d4,
    reference: `${runRef}-FIN-IN`,
    description: 'Loan drawdown',
    lines: [
      { accountId: cashId, debit: 800, credit: 0 },
      { accountId: loanPayableId, debit: 0, credit: 800 },
    ],
  });

  const reportQuery = `/accounting/reports`;

  const pl = await makeRequest('GET', `${reportQuery}/pl?from=${from}&to=${to}`, null, token);
  {
    const ok =
      pl.status === 200 &&
      sameMoney(pl.body?.data?.summary?.totalRevenue, 1000) &&
      sameMoney(pl.body?.data?.summary?.totalExpense, 300) &&
      sameMoney(pl.body?.data?.summary?.netProfitLoss, 700);
    if (ok) passed++;
    else {
      failed++;
      failures.push(`P&L failed [${pl.status}]`);
    }
    console.log(`${ok ? '✓' : '✗'} GET /reports/pl [${pl.status}]`);
  }

  const bs = await makeRequest('GET', `${reportQuery}/balance-sheet?from=${from}&to=${to}`, null, token);
  {
    const summary = bs.body?.data?.summary || {};
    const ok =
      bs.status === 200 &&
      sameMoney(summary.totalAssets, 1500) &&
      sameMoney(summary.totalLiabilities, 800) &&
      sameMoney(summary.retainedEarnings, 700) &&
      sameMoney(summary.totalEquity, 700) &&
      sameMoney(summary.liabilitiesAndEquity, 1500) &&
      summary.isBalanced === true;
    if (ok) passed++;
    else {
      failed++;
      failures.push(`Balance Sheet failed [${bs.status}]`);
    }
    console.log(`${ok ? '✓' : '✗'} GET /reports/balance-sheet [${bs.status}]`);
  }

  const trial = await makeRequest('GET', `${reportQuery}/trial-balance?from=${from}&to=${to}`, null, token);
  {
    const summary = trial.body?.data?.summary || {};
    const ok =
      trial.status === 200 &&
      sameMoney(summary.totalDebits, 2600) &&
      sameMoney(summary.totalCredits, 2600) &&
      summary.isBalanced === true;
    if (ok) passed++;
    else {
      failed++;
      failures.push(`Trial Balance failed [${trial.status}]`);
    }
    console.log(`${ok ? '✓' : '✗'} GET /reports/trial-balance [${trial.status}]`);
  }

  const cashFlow = await makeRequest('GET', `${reportQuery}/cash-flow?from=${from}&to=${to}`, null, token);
  {
    const summary = cashFlow.body?.data?.summary || {};
    const ok =
      cashFlow.status === 200 &&
      sameMoney(summary.operatingNet, 700) &&
      sameMoney(summary.investingNet, -500) &&
      sameMoney(summary.financingNet, 800) &&
      sameMoney(summary.netCashChange, 1000);
    if (ok) passed++;
    else {
      failed++;
      failures.push(`Cash Flow failed [${cashFlow.status}]`);
    }
    console.log(`${ok ? '✓' : '✗'} GET /reports/cash-flow [${cashFlow.status}]`);
  }

  const invalidType = await makeRequest('GET', `${reportQuery}/unknown?from=${from}&to=${to}`, null, token);
  {
    const ok = invalidType.status === 400;
    if (ok) passed++;
    else {
      failed++;
      failures.push(`Invalid type should be 400 [${invalidType.status}]`);
    }
    console.log(`${ok ? '✓' : '✗'} GET /reports/unknown [${invalidType.status}]`);
  }

  const invalidDateRange = await makeRequest('GET', `${reportQuery}/pl?from=${to}&to=${from}`, null, token);
  {
    const ok = invalidDateRange.status === 400;
    if (ok) passed++;
    else {
      failed++;
      failures.push(`Invalid date range should be 400 [${invalidDateRange.status}]`);
    }
    console.log(`${ok ? '✓' : '✗'} GET /reports/pl invalid range [${invalidDateRange.status}]`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    for (const failure of failures) console.log(`- ${failure}`);
  } else {
    console.log('All chunk 4 tests passed.');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
