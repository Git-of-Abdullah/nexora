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

export const GET = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid bill id' }, { status: 400 });
  }

  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = bill.status !== 'Paid' && new Date(bill.dueDate) < today;

  return NextResponse.json({
    ...bill,
    isOverdue,
    effectiveStatus: isOverdue ? 'Overdue' : bill.status,
  });
}, 'super_admin', 'accounting_manager', 'accountant');

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid bill id' }, { status: 400 });
  }

  const body = await request.json();
  const existing = await prisma.bill.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  }

  const updateData = {};

  if (body.supplierName !== undefined) {
    const supplierName = typeof body.supplierName === 'string' ? body.supplierName.trim() : '';
    if (!supplierName) {
      return NextResponse.json({ error: 'supplierName cannot be empty' }, { status: 400 });
    }
    updateData.supplierName = supplierName;
  }

  if (body.amount !== undefined) {
    const amount = parseAmount(body.amount);
    if (amount === null || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    updateData.amount = amount;
  }

  if (body.dueDate !== undefined) {
    const dueDate = parseDateInput(body.dueDate);
    if (!dueDate) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
    }
    updateData.dueDate = dueDate;
  }

  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!BILL_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid bill status' }, { status: 400 });
    }
    updateData.status = status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
  }

  const updated = await prisma.bill.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}, 'super_admin', 'accounting_manager', 'accountant');

export const DELETE = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid bill id' }, { status: 400 });
  }

  try {
    await prisma.bill.delete({ where: { id } });
    return NextResponse.json({ message: 'Bill deleted' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }
    throw error;
  }
}, 'super_admin', 'accounting_manager', 'accountant');
