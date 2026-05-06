import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request, { params }) => {
  const type = (await params).type;

  if (type === 'pl') {
    const revenueAccounts = await prisma.chartOfAccount.findMany({ where: { type: 'Revenue' }, include: { journalLines: true } });
    const expenseAccounts = await prisma.chartOfAccount.findMany({ where: { type: 'Expense' }, include: { journalLines: true } });
    return NextResponse.json({ reportType: 'Profit and Loss', data: { revenues: revenueAccounts, expenses: expenseAccounts } });
  } else if (type === 'balance-sheet') {
    const assets = await prisma.chartOfAccount.findMany({ where: { type: 'Asset' }, include: { journalLines: true } });
    const liabilities = await prisma.chartOfAccount.findMany({ where: { type: 'Liability' }, include: { journalLines: true } });
    const equity = await prisma.chartOfAccount.findMany({ where: { type: 'Equity' }, include: { journalLines: true } });
    return NextResponse.json({ reportType: 'Balance Sheet', data: { assets, liabilities, equity } });
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
}, 'super_admin', 'accounting_manager', 'accountant');
