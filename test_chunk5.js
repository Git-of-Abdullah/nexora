#!/usr/bin/env node
const http = require('http');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;

function apiPath(path) {
  return path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
}

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(apiPath(path), API_BASE);
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
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );

    req.on('error', (error) => resolve({ status: 0, body: { error: error.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function token() {
  return jwt.sign(
    { id: 1, name: 'Chunk5 Tester', email: 'chunk5@example.com', role: 'super_admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function money(value) {
  return Number.parseFloat(Number(value ?? 0).toFixed(2));
}

async function run() {
  if (!JWT_SECRET) {
    console.error('Missing JWT_SECRET');
    process.exit(1);
  }

  const auth = token();
  let pass = 0;
  let fail = 0;
  const failures = [];

  const ts = Math.floor(Date.now() / 1000);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const mm = String(month).padStart(2, '0');
  const payrollRef = `PAYROLL-${year}-${mm}`;
  const campaignName = `Chunk5 Campaign ${ts}`;

  console.log('\n=== CHUNK 5 TESTS ===\n');

  const badPayrollFilter = await request('GET', '/hr/payroll?month=13', null, auth);
  {
    const ok = badPayrollFilter.status === 400;
    console.log(`${ok ? '✓' : '✗'} GET /hr/payroll invalid month [${badPayrollFilter.status}]`);
    ok ? pass++ : (fail++, failures.push('Payroll GET invalid month should be 400'));
  }

  const badPayrollRun = await request('POST', '/hr/payroll/run', { month: 0, year }, auth);
  {
    const ok = badPayrollRun.status === 400;
    console.log(`${ok ? '✓' : '✗'} POST /hr/payroll/run invalid month [${badPayrollRun.status}]`);
    ok ? pass++ : (fail++, failures.push('Payroll run invalid month should be 400'));
  }

  const createdCampaign = await request(
    'POST',
    '/marketing/campaigns',
    {
      name: campaignName,
      type: 'Digital',
      status: 'Planning',
      budget: 12000,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    },
    auth
  );
  let campaignId = null;
  {
    const ok = createdCampaign.status === 201 && createdCampaign.body?.id;
    campaignId = createdCampaign.body?.id ?? null;
    console.log(`${ok ? '✓' : '✗'} POST /marketing/campaigns [${createdCampaign.status}]`);
    ok ? pass++ : (fail++, failures.push('Create campaign failed'));
  }

  const patchedCampaign = await request(
    'PATCH',
    `/marketing/campaigns/${campaignId}`,
    { status: 'Active', budget: 15000 },
    auth
  );
  {
    const ok = patchedCampaign.status === 200 && patchedCampaign.body?.status === 'Active';
    console.log(`${ok ? '✓' : '✗'} PATCH /marketing/campaigns/[id] [${patchedCampaign.status}]`);
    ok ? pass++ : (fail++, failures.push('Patch campaign failed'));
  }

  const badMetric = await request(
    'POST',
    `/marketing/metrics/${campaignId}`,
    { impressions: 100, clicks: 20, conversions: 30, revenue: 99 },
    auth
  );
  {
    const ok = badMetric.status === 400;
    console.log(`${ok ? '✓' : '✗'} POST /marketing/metrics/[campaignId] invalid [${badMetric.status}]`);
    ok ? pass++ : (fail++, failures.push('Bad metric should return 400'));
  }

  const goodMetric = await request(
    'POST',
    `/marketing/metrics/${campaignId}`,
    { impressions: 1000, clicks: 120, conversions: 30, revenue: 3500 },
    auth
  );
  {
    const ok = goodMetric.status === 201 && goodMetric.body?.metric?.id;
    console.log(`${ok ? '✓' : '✗'} POST /marketing/metrics/[campaignId] valid [${goodMetric.status}]`);
    ok ? pass++ : (fail++, failures.push('Valid metric creation failed'));
  }

  const metricsGet = await request('GET', `/marketing/metrics/${campaignId}`, null, auth);
  {
    const summary = metricsGet.body?.summary || {};
    const ok =
      metricsGet.status === 200 &&
      summary.impressions >= 1000 &&
      summary.clicks >= 120 &&
      summary.conversions >= 30;
    console.log(`${ok ? '✓' : '✗'} GET /marketing/metrics/[campaignId] [${metricsGet.status}]`);
    ok ? pass++ : (fail++, failures.push('Metrics GET failed'));
  }

  const customersGet = await request('GET', '/marketing/customers', null, auth);
  {
    const ok = customersGet.status === 200 && Array.isArray(customersGet.body);
    console.log(`${ok ? '✓' : '✗'} GET /marketing/customers [${customersGet.status}]`);
    ok ? pass++ : (fail++, failures.push('Customers GET failed'));
  }

  const payrollRun = await request('POST', '/hr/payroll/run', { month, year, postToJournal: true }, auth);
  let expectJournal = false;
  {
    const ok = payrollRun.status === 200 && typeof payrollRun.body?.records === 'number';
    expectJournal = ok && payrollRun.body.records > 0;
    console.log(`${ok ? '✓' : '✗'} POST /hr/payroll/run valid [${payrollRun.status}]`);
    ok ? pass++ : (fail++, failures.push('Payroll run valid failed'));
  }

  const payrollJournal = await request(
    'GET',
    `/accounting/journal?reference=${encodeURIComponent(payrollRef)}`,
    null,
    auth
  );
  {
    let ok = payrollJournal.status === 200 && Array.isArray(payrollJournal.body);
    if (ok && expectJournal) {
      const entry = payrollJournal.body[0];
      if (!entry || !Array.isArray(entry.lines) || !entry.lines.length) {
        ok = false;
      } else {
        const debit = money(entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
        const credit = money(entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
        ok = Math.abs(debit - credit) < 0.01;
      }
    }
    console.log(`${ok ? '✓' : '✗'} GET /accounting/journal payroll ref [${payrollJournal.status}]`);
    ok ? pass++ : (fail++, failures.push('Payroll journal validation failed'));
  }

  const deletedCampaign = await request('DELETE', `/marketing/campaigns/${campaignId}`, null, auth);
  {
    const ok = deletedCampaign.status === 200;
    console.log(`${ok ? '✓' : '✗'} DELETE /marketing/campaigns/[id] [${deletedCampaign.status}]`);
    ok ? pass++ : (fail++, failures.push('Campaign delete failed'));
  }

  const metricsAfterDelete = await request('GET', `/marketing/metrics/${campaignId}`, null, auth);
  {
    const ok = metricsAfterDelete.status === 404;
    console.log(`${ok ? '✓' : '✗'} GET /marketing/metrics/[campaignId] after delete [${metricsAfterDelete.status}]`);
    ok ? pass++ : (fail++, failures.push('Metrics after campaign delete should be 404'));
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${pass}`);
  console.log(`Failed: ${fail}`);
  if (failures.length) failures.forEach((item) => console.log(`- ${item}`));
  else console.log('All chunk 5 tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
