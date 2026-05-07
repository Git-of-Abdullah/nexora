import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const VALID_ACCOUNT_TYPES = new Set(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']);

function normalizeAccountType(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  const mapped = {
    asset: 'Asset',
    liability: 'Liability',
    equity: 'Equity',
    revenue: 'Revenue',
    income: 'Revenue',
    expense: 'Expense',
  }[normalized];
  return mapped || null;
}

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get('type');
  const q = searchParams.get('q');
  const normalizedType = typeParam ? normalizeAccountType(typeParam) : null;

  if (typeParam && !normalizedType) {
    return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
  }

  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      ...(normalizedType && { type: normalizedType }),
      ...(q && {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: [{ code: 'asc' }],
  });

  return NextResponse.json(accounts);
}, 'super_admin', 'accounting_manager', 'accountant');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const type = normalizeAccountType(body.type);

  if (!code || !name || !type) {
    return NextResponse.json({ error: 'code, name, and valid type are required' }, { status: 400 });
  }

  if (!VALID_ACCOUNT_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
  }

  try {
    const account = await prisma.chartOfAccount.create({
      data: { code, name, type },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 409 });
    }
    throw error;
  }
}, 'super_admin', 'accounting_manager', 'accountant');
