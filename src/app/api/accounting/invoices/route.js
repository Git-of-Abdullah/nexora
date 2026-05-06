import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(invoices);
}, 'super_admin', 'accounting_manager', 'accountant');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { clientName, amount, tax, dueDate } = body;

  if (!clientName || !amount || !dueDate) {
    return NextResponse.json({ error: 'clientName, amount, and dueDate are required' }, { status: 400 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      clientName,
      amount: parseFloat(amount),
      tax: tax ? parseFloat(tax) : 0,
      dueDate: new Date(dueDate),
      status: 'Draft',
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}, 'super_admin', 'accounting_manager', 'accountant');
