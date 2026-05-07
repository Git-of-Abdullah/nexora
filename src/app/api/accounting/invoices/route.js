import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const INVOICE_STATUSES = new Set(['Draft', 'Sent', 'Partial', 'Paid', 'Overdue']);

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
    if (!INVOICE_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
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

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const withFlags = invoices.map((invoice) => {
    const isOverdue = invoice.status !== 'Paid' && new Date(invoice.dueDate) < today;
    return {
      ...invoice,
      isOverdue,
      effectiveStatus: isOverdue ? 'Overdue' : invoice.status,
    };
  });

  return NextResponse.json(withFlags);
}, 'super_admin', 'accounting_manager', 'accountant');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
  const amount = parseAmount(body.amount);
  const tax = body.tax === undefined ? 0 : parseAmount(body.tax);
  const dueDate = parseDateInput(body.dueDate);

  if (!clientName || amount === null || tax === null || !dueDate) {
    return NextResponse.json({ error: 'clientName, amount, and dueDate are required' }, { status: 400 });
  }
  if (amount <= 0 || tax < 0) {
    return NextResponse.json({ error: 'amount must be > 0 and tax must be >= 0' }, { status: 400 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      clientName,
      amount,
      tax,
      dueDate,
      status: 'Draft',
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}, 'super_admin', 'accounting_manager', 'accountant');
