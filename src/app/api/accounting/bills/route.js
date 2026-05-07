import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const BILL_STATUSES = new Set(['Unpaid', 'Partial', 'Paid', 'Overdue']);

function parseDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(2));
}

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const dueFromParam = searchParams.get('dueFrom');
  const dueToParam = searchParams.get('dueTo');
  const overdueParam = searchParams.get('overdue');

  const dueFrom = dueFromParam ? parseDateInput(dueFromParam) : null;
  const dueTo = dueToParam ? parseDateInput(dueToParam) : null;

  if (dueFromParam && !dueFrom) {
    return NextResponse.json({ error: 'Invalid dueFrom date' }, { status: 400 });
  }
  if (dueToParam && !dueTo) {
    return NextResponse.json({ error: 'Invalid dueTo date' }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {};
  if (dueFrom || dueTo) {
    where.dueDate = {
      ...(dueFrom && { gte: dueFrom }),
      ...(dueTo && { lte: dueTo }),
    };
  }

  const status = statusParam ? statusParam.trim() : null;
  if (status === 'Overdue') {
    where.dueDate = {
      ...(where.dueDate || {}),
      lt: today,
    };
    where.status = { not: 'Paid' };
  } else if (status) {
    if (!BILL_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid bill status' }, { status: 400 });
    }
    where.status = status;
  }

  if (overdueParam === 'true') {
    where.dueDate = {
      ...(where.dueDate || {}),
      lt: today,
    };
    where.status = { not: 'Paid' };
  } else if (overdueParam && overdueParam !== 'false') {
    return NextResponse.json({ error: 'overdue must be true or false' }, { status: 400 });
  }

  const bills = await prisma.bill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const withFlags = bills.map((bill) => {
    const isOverdue = bill.status !== 'Paid' && new Date(bill.dueDate) < today;
    return {
      ...bill,
      isOverdue,
      effectiveStatus: isOverdue ? 'Overdue' : bill.status,
    };
  });

  return NextResponse.json(withFlags);
}, 'super_admin', 'accounting_manager', 'accountant');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const supplierName = typeof body.supplierName === 'string' ? body.supplierName.trim() : '';
  const amount = parseAmount(body.amount);
  const dueDate = parseDateInput(body.dueDate);
  const status = body.status ? String(body.status).trim() : 'Unpaid';

  if (!supplierName || amount === null || !dueDate) {
    return NextResponse.json({ error: 'supplierName, amount, and dueDate are required' }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
  }
  if (!BILL_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid bill status' }, { status: 400 });
  }

  const bill = await prisma.bill.create({
    data: {
      supplierName,
      amount,
      dueDate,
      status,
    },
  });

  return NextResponse.json(bill, { status: 201 });
}, 'super_admin', 'accounting_manager', 'accountant');
