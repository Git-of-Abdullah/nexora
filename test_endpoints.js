const jwt = require('jsonwebtoken');

const SECRET = '9f8a3c7d2b1e4f6a8d9c0b7e5a3f1c2d4e6b8a9c7d0f3e2b1a4c6d8e9f0b2a1c';
const token = jwt.sign(
  { id: 1, name: 'Test User', email: 'test@example.com', role: 'super_admin' },
  SECRET,
  { expiresIn: '1h' }
);

async function testEndpoints() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const baseUrl = 'http://localhost:3000';
  const fetchOptions = { headers };

  async function makeReq(method, path, body) {
    console.log(`\nTesting ${method} ${path}`);
    const res = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      method,
      body: body ? JSON.stringify(body) : undefined
    });
    console.log('Status:', res.status);
    const text = await res.text();
    try {
      console.log('Data:', JSON.parse(text));
      return JSON.parse(text);
    } catch {
      console.log('Data:', text.substring(0, 200) + '...');
      return null;
    }
  }

  await makeReq('GET', '/api/accounting/invoices');
  await makeReq('POST', '/api/accounting/invoices', {
    clientName: 'Acme Corp',
    amount: 1500,
    dueDate: '2026-12-31'
  });
  
  await makeReq('GET', '/api/marketing/campaigns');
  
  const createdLead = await makeReq('POST', '/api/marketing/leads', {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123456789'
  });

  if (createdLead && createdLead.id) {
    await makeReq('PATCH', `/api/marketing/leads/${createdLead.id}/status`, { status: 'Contacted' });
  }

  await makeReq('GET', '/api/accounting/reports/pl');
}

testEndpoints().catch(console.error);
