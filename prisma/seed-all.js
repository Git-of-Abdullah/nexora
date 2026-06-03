/**
 * Comprehensive seed script — runs users + data + multi-month payroll.
 * Safe to re-run: uses upsert/findFirst guards throughout.
 *
 * Usage:
 *   node prisma/seed-all.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Users ────────────────────────────────────────────────────────────────────
const USERS = [
  { name: 'Nexora Admin',          email: 'admin@nexora.com',       password: 'Admin@123',       role: 'super_admin' },
  { name: 'HR Manager',            email: 'hr.manager@nexora.com',  password: 'HRManager@123',   role: 'hr_manager' },
  { name: 'HR Staff',              email: 'hr.staff@nexora.com',    password: 'HRStaff@123',     role: 'hr_staff' },
  { name: 'Accounting Manager',    email: 'acc.manager@nexora.com', password: 'AccManager@123',  role: 'accounting_manager' },
  { name: 'Accountant',            email: 'accountant@nexora.com',  password: 'Accountant@123',  role: 'accountant' },
  { name: 'Mfg Manager',           email: 'mfg.manager@nexora.com', password: 'MfgManager@123',  role: 'manufacturing_manager' },
  { name: 'Mfg Staff',             email: 'mfg.staff@nexora.com',   password: 'MfgStaff@123',    role: 'manufacturing_staff' },
  { name: 'Marketing Manager',     email: 'mkt.manager@nexora.com', password: 'MktManager@123',  role: 'marketing_manager' },
  { name: 'Marketing Staff',       email: 'mkt.staff@nexora.com',   password: 'MktStaff@123',    role: 'marketing_staff' },
  { name: 'General Employee',      email: 'employee@nexora.com',    password: 'Employee@123',    role: 'general_employee' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toMoney(v) { return parseFloat(Number(v).toFixed(2)); }

function deptFor(role) {
  if (role.includes('manufacturing')) return 'Manufacturing';
  if (role.includes('hr'))            return 'Human Resources';
  if (role.includes('account'))       return 'Accounting';
  if (role.includes('marketing'))     return 'Marketing';
  return 'Operations';
}

const TITLES = {
  super_admin: 'CEO', hr_manager: 'HR Director', hr_staff: 'HR Coordinator',
  accounting_manager: 'Accounting Manager', accountant: 'Senior Accountant',
  manufacturing_manager: 'Production Manager', manufacturing_staff: 'Line Supervisor',
  marketing_manager: 'Marketing Director', marketing_staff: 'Marketing Specialist',
  general_employee: 'Operations Analyst',
};

const SALARIES = {
  super_admin: 15000, hr_manager: 9000, hr_staff: 5500,
  accounting_manager: 10000, accountant: 7500,
  manufacturing_manager: 9500, manufacturing_staff: 5800,
  marketing_manager: 8800, marketing_staff: 5300,
  general_employee: 4800,
};

async function main() {
  console.log('\n🌱 Seeding Nexora — full dataset\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('👤 Users');
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, isActive: true },
      create: { name: u.name, email: u.email, role: u.role, passwordHash, isActive: true },
    });
    console.log(`  ✓  [${u.role.padEnd(22)}]  ${u.email.padEnd(38)}  pw: ${u.password}`);
  }

  // ── Departments ────────────────────────────────────────────────────────────
  console.log('\n🏢 Departments');
  const deptNames = ['Manufacturing', 'Human Resources', 'Accounting', 'Marketing', 'Operations'];
  for (const name of deptNames) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }
  const depts = {};
  for (const name of deptNames) {
    depts[name] = await prisma.department.findFirst({ where: { name } });
  }
  console.log(`  ✓  ${deptNames.length} departments`);

  // ── Employees ──────────────────────────────────────────────────────────────
  console.log('\n👷 Employees');
  const users = await prisma.user.findMany({ select: { id: true, role: true, name: true, email: true } });
  for (const u of users) {
    const exists = await prisma.employee.findFirst({ where: { userId: u.id } });
    if (!exists) {
      await prisma.employee.create({
        data: {
          userId: u.id,
          departmentId: depts[deptFor(u.role)].id,
          empNo: `EMP-${String(u.id).padStart(3, '0')}`,
          position: TITLES[u.role] || 'Staff',
          hireDate: new Date('2023-01-15'),
          salary: SALARIES[u.role] || 5000,
          status: 'Active',
        },
      });
    }
  }
  const employees = await prisma.employee.findMany({
    include: { user: { select: { name: true, role: true } } },
  });
  console.log(`  ✓  ${employees.length} employees`);

  // ── Work Centres ───────────────────────────────────────────────────────────
  console.log('\n🏭 Work Centres');
  const wcData = [
    { name: 'Assembly Line A', capacity: 100 },
    { name: 'CNC Machining',   capacity: 50 },
    { name: 'Quality Control', capacity: 30 },
    { name: 'Packaging',       capacity: 80 },
  ];
  for (const w of wcData) {
    const ex = await prisma.workCentre.findFirst({ where: { name: w.name } });
    if (!ex) await prisma.workCentre.create({ data: w });
  }
  const wcs = await prisma.workCentre.findMany();
  console.log(`  ✓  ${wcs.length} work centres`);

  // ── Products ───────────────────────────────────────────────────────────────
  console.log('\n📦 Products');
  const prodData = [
    { name: 'Industrial Widget A',    sku: 'WDGT-001', category: 'Widgets',    unitPrice: 149.99, currentStock: 250  },
    { name: 'Premium Widget B',       sku: 'WDGT-002', category: 'Widgets',    unitPrice: 299.99, currentStock: 80   },
    { name: 'Electronic Component X', sku: 'COMP-001', category: 'Components', unitPrice: 49.99,  currentStock: 1200 },
    { name: 'Motor Assembly Y',       sku: 'ASSY-001', category: 'Assemblies', unitPrice: 599.99, currentStock: 35   },
    { name: 'Precision Part Z',       sku: 'PART-001', category: 'Parts',      unitPrice: 89.99,  currentStock: 500  },
    { name: 'Control Unit W',         sku: 'UNIT-001', category: 'Units',      unitPrice: 999.99, currentStock: 20   },
  ];
  for (const p of prodData) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
  }
  const products = await prisma.product.findMany();
  console.log(`  ✓  ${products.length} products`);

  // ── Raw Materials ──────────────────────────────────────────────────────────
  console.log('\n🪨 Raw Materials');
  const matData = [
    { name: 'Steel Rod',       unit: 'kg',  stockQty: 850,  reorderLevel: 200,  costPerUnit: 2.50  },
    { name: 'Copper Wire',     unit: 'm',   stockQty: 120,  reorderLevel: 150,  costPerUnit: 1.80  },
    { name: 'Aluminum Sheet',  unit: 'kg',  stockQty: 0,    reorderLevel: 100,  costPerUnit: 4.20  },
    { name: 'Plastic Pellets', unit: 'kg',  stockQty: 2400, reorderLevel: 500,  costPerUnit: 0.95  },
    { name: 'Circuit Board',   unit: 'pcs', stockQty: 340,  reorderLevel: 100,  costPerUnit: 12.00 },
    { name: 'Rubber Seal',     unit: 'pcs', stockQty: 80,   reorderLevel: 200,  costPerUnit: 0.45  },
    { name: 'Titanium Bolt',   unit: 'pcs', stockQty: 5000, reorderLevel: 1000, costPerUnit: 0.30  },
    { name: 'Glass Fibre',     unit: 'kg',  stockQty: 60,   reorderLevel: 80,   costPerUnit: 8.75  },
    { name: 'Epoxy Resin',     unit: 'L',   stockQty: 190,  reorderLevel: 50,   costPerUnit: 22.00 },
    { name: 'LED Module',      unit: 'pcs', stockQty: 700,  reorderLevel: 200,  costPerUnit: 3.60  },
  ];
  for (const m of matData) {
    const ex = await prisma.rawMaterial.findFirst({ where: { name: m.name } });
    if (!ex) await prisma.rawMaterial.create({ data: m });
  }
  console.log(`  ✓  ${matData.length} raw materials`);

  // ── Production Orders ──────────────────────────────────────────────────────
  console.log('\n🔧 Production Orders');
  const orderExisting = await prisma.productionOrder.count();
  if (orderExisting === 0) {
    const orderData = [
      { pi: 0, qty: 500,  wi: 0, start: '2026-04-01', end: '2026-04-20', status: 'Completed'     },
      { pi: 1, qty: 120,  wi: 1, start: '2026-04-10', end: '2026-04-30', status: 'Completed'     },
      { pi: 2, qty: 2000, wi: 0, start: '2026-04-15', end: '2026-05-10', status: 'In Production' },
      { pi: 3, qty: 80,   wi: 2, start: '2026-04-20', end: '2026-05-15', status: 'Quality Check' },
      { pi: 4, qty: 1000, wi: 1, start: '2026-04-22', end: '2026-05-20', status: 'In Production' },
      { pi: 5, qty: 30,   wi: 0, start: '2026-05-01', end: '2026-05-25', status: 'Scheduled'     },
      { pi: 0, qty: 300,  wi: 3, start: '2026-05-05', end: '2026-06-01', status: 'Draft'         },
      { pi: 2, qty: 500,  wi: 0, start: '2026-03-01', end: '2026-03-20', status: 'Completed'     },
      { pi: 1, qty: 60,   wi: 1, start: '2026-03-10', end: '2026-03-25', status: 'Completed'     },
      { pi: 4, qty: 800,  wi: 3, start: '2026-05-10', end: '2026-06-05', status: 'Scheduled'     },
    ];
    for (const o of orderData) {
      await prisma.productionOrder.create({
        data: {
          productId:    products[o.pi].id,
          quantity:     o.qty,
          workCentreId: wcs[o.wi].id,
          startDate:    new Date(o.start),
          endDate:      new Date(o.end),
          status:       o.status,
        },
      });
    }
  }
  const orders = await prisma.productionOrder.findMany({ include: { product: true } });
  console.log(`  ✓  ${orders.length} production orders`);

  // ── Quality Checks ─────────────────────────────────────────────────────────
  console.log('\n✅ Quality Checks');
  const inspectorId = employees[0]?.id;
  if (inspectorId) {
    for (const ord of orders.filter(o => ['Completed', 'Quality Check'].includes(o.status))) {
      const ex = await prisma.qualityCheck.findFirst({ where: { orderId: ord.id } });
      if (!ex) {
        await prisma.qualityCheck.create({
          data: {
            orderId:     ord.id,
            inspectorId,
            result:      ord.status === 'Completed' ? 'Pass' : 'Fail',
            notes:       ord.status === 'Completed' ? 'All dimensions within tolerance.' : 'Surface defects found — rework required.',
            date:        new Date(),
          },
        });
      }
    }
  }
  console.log('  ✓  Quality checks seeded');

  // ── Invoices ───────────────────────────────────────────────────────────────
  console.log('\n🧾 Invoices');
  const invCount = await prisma.invoice.count();
  if (invCount === 0) {
    const invData = [
      { client: 'Apex Technologies Ltd',    amount: 15400, tax: 1848, due: '2026-03-15', status: 'Paid',    paid: '2026-03-10' },
      { client: 'Meridian Solutions Inc',   amount: 8750,  tax: 1050, due: '2026-03-30', status: 'Paid',    paid: '2026-03-28' },
      { client: 'GlobalTech Industries',    amount: 22000, tax: 2640, due: '2026-04-15', status: 'Overdue', paid: null },
      { client: 'Sunrise Manufacturing Co', amount: 5600,  tax: 672,  due: '2026-04-30', status: 'Sent',    paid: null },
      { client: 'Vector Systems LLC',       amount: 31500, tax: 3780, due: '2026-05-10', status: 'Sent',    paid: null },
      { client: 'Kronos Dynamics GmbH',     amount: 9200,  tax: 1104, due: '2026-05-20', status: 'Sent',    paid: null },
      { client: 'NovaTech Enterprises',     amount: 47800, tax: 5736, due: '2026-04-01', status: 'Overdue', paid: null },
      { client: 'Delta Components AG',      amount: 3400,  tax: 408,  due: '2026-05-31', status: 'Sent',    paid: null },
      { client: 'Pinnacle Group',           amount: 18900, tax: 2268, due: '2026-02-28', status: 'Paid',    paid: '2026-02-25' },
      { client: 'Horizon Robotics Inc',     amount: 62000, tax: 7440, due: '2026-03-20', status: 'Paid',    paid: '2026-03-18' },
      { client: 'BlueStar Electronics',     amount: 7800,  tax: 936,  due: '2026-06-10', status: 'Draft',   paid: null },
      { client: 'Titan Logistics Ltd',      amount: 4500,  tax: 540,  due: '2026-06-15', status: 'Partial', paid: null },
    ];
    await prisma.invoice.createMany({
      data: invData.map(i => ({
        clientName: i.client,
        amount:     i.amount,
        tax:        i.tax,
        dueDate:    new Date(i.due),
        status:     i.status,
        paidDate:   i.paid ? new Date(i.paid) : null,
      })),
    });
  }
  console.log(`  ✓  Invoices seeded`);

  // ── Bills ──────────────────────────────────────────────────────────────────
  console.log('\n📄 Bills');
  const billCount = await prisma.bill.count();
  if (billCount === 0) {
    const billData = [
      { supplier: 'SteelMart Supplies',      amount: 12400, due: '2026-03-20', status: 'Paid'    },
      { supplier: 'ElectroParts Global',      amount: 8900,  due: '2026-03-31', status: 'Paid'    },
      { supplier: 'Precision Tooling Co',     amount: 5600,  due: '2026-04-10', status: 'Overdue' },
      { supplier: 'ChemSource International', amount: 3200,  due: '2026-04-20', status: 'Unpaid'  },
      { supplier: 'LogiFreight Solutions',    amount: 2100,  due: '2026-05-05', status: 'Unpaid'  },
      { supplier: 'PowerGrid Energy',         amount: 4800,  due: '2026-04-01', status: 'Overdue' },
      { supplier: 'Office Essentials Ltd',    amount: 890,   due: '2026-05-15', status: 'Unpaid'  },
      { supplier: 'Industrial Lubricants Co', amount: 1650,  due: '2026-05-20', status: 'Partial' },
      { supplier: 'CloudHost Technologies',   amount: 2400,  due: '2026-03-15', status: 'Paid'    },
      { supplier: 'SafeGuard Insurance',      amount: 9600,  due: '2026-06-01', status: 'Unpaid'  },
    ];
    await prisma.bill.createMany({
      data: billData.map(b => ({
        supplierName: b.supplier,
        amount:       b.amount,
        dueDate:      new Date(b.due),
        status:       b.status,
      })),
    });
  }
  console.log(`  ✓  Bills seeded`);

  // ── Campaigns ──────────────────────────────────────────────────────────────
  console.log('\n📣 Campaigns');
  const campCount = await prisma.campaign.count();
  let campaigns = [];
  if (campCount === 0) {
    const campData = [
      { name: 'Q2 Product Launch',      type: 'Email',        status: 'Active',   budget: 15000, start: '2026-04-01', end: '2026-06-30' },
      { name: 'Summer Social Blitz',    type: 'Social Media', status: 'Active',   budget: 8500,  start: '2026-05-01', end: '2026-07-31' },
      { name: 'SEO Authority Drive',    type: 'SEO',          status: 'Active',   budget: 5000,  start: '2026-01-01', end: '2026-12-31' },
      { name: 'PPC Revenue Boost',      type: 'PPC',          status: 'Paused',   budget: 12000, start: '2026-03-01', end: '2026-05-31' },
      { name: 'Trade Show 2026',        type: 'Event',        status: 'Planning', budget: 25000, start: '2026-09-15', end: '2026-09-17' },
      { name: 'Influencer Partnership', type: 'Influencer',   status: 'Active',   budget: 18000, start: '2026-04-15', end: '2026-07-15' },
      { name: 'Brand Awareness Print',  type: 'Print',        status: 'Ended',    budget: 6000,  start: '2026-01-01', end: '2026-03-31' },
      { name: 'Year-End Sale Push',     type: 'Email',        status: 'Planning', budget: 9500,  start: '2026-11-01', end: '2026-12-31' },
    ];
    for (const c of campData) {
      const camp = await prisma.campaign.create({
        data: { name: c.name, type: c.type, status: c.status, budget: c.budget, startDate: new Date(c.start), endDate: new Date(c.end) },
      });
      campaigns.push(camp);
    }
  } else {
    campaigns = await prisma.campaign.findMany();
  }
  console.log(`  ✓  ${campaigns.length} campaigns`);

  // ── Campaign Metrics ───────────────────────────────────────────────────────
  for (const camp of campaigns.filter(c => c.status !== 'Planning')) {
    const ex = await prisma.campaignMetric.findFirst({ where: { campaignId: camp.id } });
    if (!ex) {
      await prisma.campaignMetric.create({
        data: {
          campaignId:  camp.id,
          impressions: Math.floor(Math.random() * 80000) + 20000,
          clicks:      Math.floor(Math.random() * 3000)  + 500,
          conversions: Math.floor(Math.random() * 200)   + 20,
          revenue:     parseFloat((Math.random() * 40000 + 5000).toFixed(2)),
        },
      });
    }
  }
  console.log('  ✓  Campaign metrics');

  // ── Leads ──────────────────────────────────────────────────────────────────
  console.log('\n🎯 Leads');
  const leadCount = await prisma.lead.count();
  if (leadCount === 0) {
    const leadData = [
      { name: 'James Harrington',  email: 'j.harrington@apex.com',   phone: '+1-312-555-0101', source: 'Website',      status: 'Won',           ci: 0 },
      { name: 'Sandra Kowalski',   email: 's.kowalski@meridian.com', phone: '+1-415-555-0142', source: 'Referral',     status: 'Proposal Sent', ci: 1 },
      { name: 'David Chen',        email: 'd.chen@globaltech.com',   phone: '+1-650-555-0187', source: 'Cold Call',    status: 'Qualified',     ci: 0 },
      { name: 'Maria Rodriguez',   email: 'm.rodriguez@vector.com',  phone: '+1-214-555-0193', source: 'Social Media', status: 'Contacted',     ci: 2 },
      { name: 'Thomas Weber',      email: 't.weber@kronos.de',       phone: '+49-89-555-0201', source: 'Trade Show',   status: 'Won',           ci: 3 },
      { name: 'Priya Sharma',      email: 'p.sharma@nova.in',        phone: '+91-22-555-0232', source: 'Email',        status: 'Lost',          ci: 1 },
      { name: 'Robert Kim',        email: 'r.kim@delta.co',          phone: '+1-408-555-0245', source: 'Partner',      status: 'Qualified',     ci: 0 },
      { name: 'Emily Walsh',       email: 'e.walsh@horizon.io',      phone: '+1-617-555-0256', source: 'Website',      status: 'Proposal Sent', ci: 2 },
      { name: 'Carlos Mendoza',    email: 'c.mendoza@bluestar.mx',   phone: '+52-55-555-0267', source: 'Referral',     status: 'New',           ci: 1 },
      { name: 'Fatima Al-Hassan',  email: 'f.alhassan@titan.ae',     phone: '+971-4-555-0278', source: 'Website',      status: 'New',           ci: 0 },
      { name: 'Lucas Brennan',     email: 'l.brennan@pinnacle.ie',   phone: '+353-1-555-0289', source: 'Cold Call',    status: 'Contacted',     ci: 3 },
      { name: 'Yuki Tanaka',       email: 'y.tanaka@nexgen.jp',      phone: '+81-3-555-0290',  source: 'Trade Show',   status: 'Won',           ci: 2 },
      { name: 'Aleksei Volkov',    email: 'a.volkov@tech.ru',        phone: '+7-495-555-0301', source: 'Social Media', status: 'New',           ci: 1 },
      { name: 'Isabella Ferreira', email: 'i.ferreira@sol.br',       phone: '+55-11-555-0312', source: 'Email',        status: 'Qualified',     ci: 0 },
      { name: 'Ahmed Khalil',      email: 'a.khalil@arabia.sa',      phone: '+966-1-555-0323', source: 'Partner',      status: 'Contacted',     ci: 3 },
    ];
    for (const l of leadData) {
      const camp = campaigns[l.ci] || campaigns[0];
      if (!camp) continue;
      await prisma.lead.create({
        data: { name: l.name, email: l.email, phone: l.phone, source: l.source, status: l.status, campaignId: camp.id },
      });
    }
  }
  console.log(`  ✓  Leads seeded`);

  // ── Attendance (last 7 weekdays) ───────────────────────────────────────────
  console.log('\n🕐 Attendance');
  const activeEmps     = employees.slice(0, 6);
  const attendStatuses = ['Present', 'Present', 'Present', 'Present', 'Late', 'Absent'];
  for (let d = 6; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    for (let i = 0; i < activeEmps.length; i++) {
      const emp      = activeEmps[i];
      const stat     = attendStatuses[i % attendStatuses.length];
      const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const ex = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: emp.id, date: dateOnly } },
      });
      if (!ex) {
        const clockIn  = stat !== 'Absent' ? new Date(dateOnly.getTime() + (stat === 'Late' ? 9.5 : 9) * 3600000) : null;
        const clockOut = stat !== 'Absent' ? new Date(dateOnly.getTime() + 18 * 3600000) : null;
        await prisma.attendance.create({
          data: { employeeId: emp.id, date: dateOnly, clockIn, clockOut, status: stat },
        });
      }
    }
  }
  console.log('  ✓  Attendance records');

  // ── Leave Requests ─────────────────────────────────────────────────────────
  console.log('\n🏖  Leave Requests');
  const leaveCount = await prisma.leaveRequest.count();
  if (leaveCount === 0) {
    const leaveData = [
      { ei: 0, type: 'Annual',    from: '2026-05-20', to: '2026-05-24', status: 'Pending',  notes: 'Family vacation'       },
      { ei: 1, type: 'Sick',      from: '2026-05-08', to: '2026-05-09', status: 'Approved', notes: 'Doctor appointment'    },
      { ei: 2, type: 'Casual',    from: '2026-05-12', to: '2026-05-12', status: 'Approved', notes: 'Personal errand'       },
      { ei: 3, type: 'Annual',    from: '2026-06-01', to: '2026-06-07', status: 'Pending',  notes: 'Summer holiday'        },
      { ei: 4, type: 'Maternity', from: '2026-07-01', to: '2026-09-30', status: 'Approved', notes: 'Maternity leave'       },
      { ei: 0, type: 'Unpaid',    from: '2026-04-01', to: '2026-04-05', status: 'Rejected', notes: 'Extended leave request'},
    ];
    for (const l of leaveData) {
      const emp = employees[l.ei];
      if (emp) {
        await prisma.leaveRequest.create({
          data: { employeeId: emp.id, type: l.type, fromDate: new Date(l.from), toDate: new Date(l.to), status: l.status, notes: l.notes },
        });
      }
    }
  }
  console.log('  ✓  Leave requests');

  // ── Payroll — multiple months (Jan–Jun 2026) ───────────────────────────────
  console.log('\n💰 Payroll (Jan–Jun 2026)');
  const TAX_RATE = 0.10; // must match run/route.js
  const payrollMonths = [
    { month: 1, year: 2026 },
    { month: 2, year: 2026 },
    { month: 3, year: 2026 },
    { month: 4, year: 2026 },
    { month: 5, year: 2026 },
    { month: 6, year: 2026 },
  ];

  for (const period of payrollMonths) {
    for (const emp of employees) {
      const base       = Number(emp.salary);
      const deductions = toMoney(base * TAX_RATE);
      const netPay     = toMoney(base - deductions);
      await prisma.payroll.upsert({
        where:  { employeeId_month_year: { employeeId: emp.id, month: period.month, year: period.year } },
        update: { baseSalary: base, deductions, netPay },
        create: { employeeId: emp.id, month: period.month, year: period.year, baseSalary: base, deductions, netPay },
      });
    }
    console.log(`  ✓  ${employees.length} records — ${period.year}-${String(period.month).padStart(2, '0')}`);
  }

  // ── Chart of Accounts (for payroll journal posting) ────────────────────────
  console.log('\n📊 Chart of Accounts');
  const coa = [
    { code: '1000', name: 'Cash and Bank',              type: 'Asset'     },
    { code: '1100', name: 'Accounts Receivable',        type: 'Asset'     },
    { code: '2000', name: 'Accounts Payable',           type: 'Liability' },
    { code: '2100', name: 'Salaries Payable',           type: 'Liability' },
    { code: '2105', name: 'Payroll Deductions Payable', type: 'Liability' },
    { code: '3000', name: 'Owner Equity',               type: 'Equity'    },
    { code: '4000', name: 'Revenue',                    type: 'Revenue'   },
    { code: '5000', name: 'Payroll Expense',            type: 'Expense'   },
    { code: '5100', name: 'Rent Expense',               type: 'Expense'   },
    { code: '5200', name: 'Utilities Expense',          type: 'Expense'   },
  ];
  for (const account of coa) {
    const ex = await prisma.chartOfAccount.findUnique({ where: { code: account.code } });
    if (!ex) await prisma.chartOfAccount.create({ data: account });
  }
  console.log(`  ✓  ${coa.length} chart of accounts`);

  console.log('\n✅  All data seeded successfully!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log('  Login credentials:');
  for (const u of USERS) {
    console.log(`  ${u.email.padEnd(38)} pw: ${u.password}`);
  }
  console.log('─────────────────────────────────────────────────────\n');
}

main()
  .catch(e => { console.error('❌ Seed error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
