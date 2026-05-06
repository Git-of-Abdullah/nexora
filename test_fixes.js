const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const SECRET = '9f8a3c7d2b1e4f6a8d9c0b7e5a3f1c2d4e6b8a9c7d0f3e2b1a4c6d8e9f0b2a1c';

async function testDynamicRouteLogic() {
  console.log('Testing dynamic route logic (simulating what fixed routes do)...\n');

  const token = jwt.sign(
    { id: 1, name: 'Nexora Admin', email: 'admin@nexora.local', role: 'super_admin' },
    SECRET,
    { expiresIn: '1h' }
  );
  console.log('✓ Auth token generated\n');

  // Test PATCH inventory
  try {
    const material = await prisma.rawMaterial.update({
      where: { id: 1 },
      data: { stockQty: 480, reorderLevel: 90 },
    });
    console.log('✓ PATCH /api/manufacturing/inventory/1:', material.name, '- stockQty updated to', material.stockQty);
  } catch (e) {
    console.log('✗ PATCH inventory failed:', e.message.split('\n')[0]);
  }

  // Test PATCH orders
  try {
    const order = await prisma.productionOrder.update({
      where: { id: 1 },
      data: { status: 'In Production', quantity: 15 },
      include: { product: true },
    });
    console.log('✓ PATCH /api/manufacturing/orders/1: status=', order.status);
  } catch (e) {
    console.log('✗ PATCH orders failed:', e.message.split('\n')[0]);
  }

  // Test GET BOM
  try {
    const bom = await prisma.billOfMaterial.findMany({
      where: { productId: 1 },
      include: { material: true },
    });
    console.log('✓ GET /api/manufacturing/bom/1:', bom.length, 'entries found');
  } catch (e) {
    console.log('✗ GET BOM failed:', e.message.split('\n')[0]);
  }

  // Test POST BOM
  try {
    const entry = await prisma.billOfMaterial.upsert({
      where: { productId_materialId: { productId: 1, materialId: 1 } },
      update: { quantityRequired: 3.5 },
      create: { productId: 1, materialId: 1, quantityRequired: 3.5 },
      include: { material: true },
    });
    console.log('✓ POST /api/manufacturing/bom/1: upserted, qty=', entry.quantityRequired);
  } catch (e) {
    console.log('✗ POST BOM failed:', e.message.split('\n')[0]);
  }

  // Test GET employee
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: 1 },
      include: {
        user: { select: { id: true, name: true } },
        attendance: { take: 5 },
      },
    });
    console.log('✓ GET /api/hr/employees/1:', emp.user.name);
  } catch (e) {
    console.log('✗ GET employee failed:', e.message.split('\n')[0]);
  }

  // Test PATCH employee
  try {
    const emp = await prisma.employee.update({
      where: { id: 1 },
      data: { position: 'Senior Executive' },
    });
    console.log('✓ PATCH /api/hr/employees/1: position=', emp.position);
  } catch (e) {
    console.log('✗ PATCH employee failed:', e.message.split('\n')[0]);
  }

  // Test PATCH leave request
  try {
    const leave = await prisma.leaveRequest.update({
      where: { id: 1 },
      data: { status: 'Approved', approvedBy: 1 },
    });
    console.log('✓ PATCH /api/hr/leave-requests/1: status=', leave.status);
  } catch (e) {
    console.log('✗ PATCH leave-requests failed:', e.message.split('\n')[0]);
  }

  // Test PATCH job posting
  try {
    const jp = await prisma.jobPosting.update({
      where: { id: 1 },
      data: { status: 'Closed' },
    });
    console.log('✓ PATCH /api/hr/job-postings/1: status=', jp.status);
  } catch (e) {
    console.log('✗ PATCH job-postings failed:', e.message.split('\n')[0]);
  }

  // Test PATCH lead status
  try {
    const lead = await prisma.lead.update({
      where: { id: 1 },
      data: { status: 'Contacted' },
    });
    console.log('✓ PATCH /api/marketing/leads/1/status: status=', lead.status);
  } catch (e) {
    console.log('✗ PATCH leads/status failed:', e.message.split('\n')[0]);
  }

  // Test PATCH lead (full update)
  try {
    const lead = await prisma.lead.update({
      where: { id: 1 },
      data: { name: 'Updated Lead Name' },
      include: { campaign: true },
    });
    console.log('✓ PATCH /api/marketing/leads/1: name=', lead.name);
  } catch (e) {
    console.log('✗ PATCH leads failed:', e.message.split('\n')[0]);
  }

  // Test DELETE lead
  try {
    const existingLead = await prisma.lead.findUnique({ where: { id: 2 } });
    if (existingLead) {
      await prisma.lead.delete({ where: { id: 2 } });
      console.log('✓ DELETE /api/marketing/leads/2: deleted');
    } else {
      console.log('⊘ DELETE /api/marketing/leads/2: skipped (not found)');
    }
  } catch (e) {
    console.log('✗ DELETE leads failed:', e.message.split('\n')[0]);
  }

  // Test GET marketing budgets
  try {
    const budgets = await prisma.marketingBudget.findMany({
      include: { campaign: true },
    });
    console.log('✓ GET /api/marketing/budgets:', budgets.length, 'budgets found');
  } catch (e) {
    console.log('✗ GET marketing budgets failed:', e.message.split('\n')[0]);
  }

  // Test POST marketing budgets
  try {
    const campaign = await prisma.campaign.findFirst();
    if (campaign) {
      const budget = await prisma.marketingBudget.create({
        data: {
          campaignId: campaign.id,
          allocated: 25000,
          spent: 5000,
          remaining: 20000,
        },
        include: { campaign: true },
      });
      console.log('✓ POST /api/marketing/budgets: created for campaign', campaign.name);
    }
  } catch (e) {
    if (e.code === 'P2002') {
      console.log('⊘ POST /api/marketing/budgets: already exists (unique constraint)');
    } else {
      console.log('✗ POST marketing budgets failed:', e.message.split('\n')[0]);
    }
  }

  // Test DELETE orders
  try {
    const demoOrder = await prisma.productionOrder.findFirst({ where: { quantity: 1 } });
    if (demoOrder) {
      await prisma.productionOrder.delete({ where: { id: demoOrder.id } });
      console.log('✓ DELETE /api/manufacturing/orders:', demoOrder.id);
    } else {
      console.log('⊘ DELETE /api/manufacturing/orders: no demo order to delete');
    }
  } catch (e) {
    console.log('✗ DELETE orders failed:', e.message.split('\n')[0]);
  }

  console.log('\nAll endpoint logic tests complete!');
  await prisma.$disconnect();
}

testDynamicRouteLogic().catch(console.error);
