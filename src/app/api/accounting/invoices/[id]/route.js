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

export const GET = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = invoice.status !== 'Paid' && new Date(invoice.dueDate) < today;

  return NextResponse.json({
    ...invoice,
    isOverdue,
    effectiveStatus: isOverdue ? 'Overdue' : invoice.status,
  });
}, 'super_admin', 'accounting_manager', 'accountant');

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
  }

  const body = await request.json();
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const updateData = {};

  if (body.clientName !== undefined) {
    const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
    if (!clientName) {
      return NextResponse.json({ error: 'clientName cannot be empty' }, { status: 400 });
    }
    updateData.clientName = clientName;
  }

  if (body.amount !== undefined) {
    const amount = parseAmount(body.amount);
    if (amount === null || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    updateData.amount = amount;
  }

  if (body.tax !== undefined) {
    const tax = parseAmount(body.tax);
    if (tax === null || tax < 0) {
      return NextResponse.json({ error: 'tax must be a non-negative number' }, { status: 400 });
    }
    updateData.tax = tax;
  }

  if (body.dueDate !== undefined) {
    const dueDate = parseDateInput(body.dueDate);
    if (!dueDate) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
    }
    updateData.dueDate = dueDate;
  }

  const nextStatus = body.status !== undefined ? String(body.status).trim() : existing.status;
  if (body.status !== undefined) {
    if (!INVOICE_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
    }
    updateData.status = nextStatus;
  }

  if (body.paidDate !== undefined) {
    if (body.paidDate === null) {
      updateData.paidDate = null;
    } else {
      const paidDate = parseDateInput(body.paidDate);
      if (!paidDate) {
        return NextResponse.json({ error: 'Invalid paidDate' }, { status: 400 });
      }
      updateData.paidDate = paidDate;
    }
  }

  if (nextStatus === 'Paid' && updateData.paidDate === undefined && !existing.paidDate) {
    updateData.paidDate = new Date();
  }

  if (nextStatus !== 'Paid' && updateData.paidDate === undefined && existing.paidDate) {
    updateData.paidDate = null;
  }

  if (updateData.paidDate && nextStatus !== 'Paid') {
    return NextResponse.json({ error: 'paidDate can only be set when status is Paid' }, { status: 400 });
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}, 'super_admin', 'accounting_manager', 'accountant');

export const DELETE = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
  }

  try {
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ message: 'Invoice deleted' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    throw error;
  }
}, 'super_admin', 'accounting_manager');
