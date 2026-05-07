import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

function parseAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(2));
}

function parseDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const createdBy = searchParams.get('createdBy');
  const reference = searchParams.get('reference');
  const fromDate = from ? parseDateInput(from) : null;
  const toDate = to ? parseDateInput(to) : null;

  if (from && !fromDate) {
    return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
  }
  if (to && !toDate) {
    return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
  }

  const createdById = createdBy ? parseInt(createdBy, 10) : null;
  if (createdBy && (!Number.isInteger(createdById) || createdById <= 0)) {
    return NextResponse.json({ error: 'Invalid createdBy value' }, { status: 400 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
      ...(createdById && { createdBy: createdById }),
      ...(reference && { reference: { contains: reference, mode: 'insensitive' } }),
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          account: { select: { id: true, code: true, name: true, type: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  });

  return NextResponse.json(entries);
}, 'super_admin', 'accounting_manager', 'accountant');

export const POST = requireAuth(async (request, context, user) => {
  const body = await request.json();
  const date = parseDateInput(body.date);
  const reference = typeof body.reference === 'string' ? body.reference.trim() : null;
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!date) {
    return NextResponse.json({ error: 'Valid date is required' }, { status: 400 });
  }

  if (lines.length < 2) {
    return NextResponse.json({ error: 'At least two journal lines are required' }, { status: 400 });
  }

  const normalizedLines = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const accountId = parseInt(line?.accountId, 10);
    const debit = parseAmount(line?.debit ?? 0);
    const credit = parseAmount(line?.credit ?? 0);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'Each line must have a valid accountId' }, { status: 400 });
    }

    if (debit === null || credit === null) {
      return NextResponse.json({ error: 'Debit and credit must be valid numbers' }, { status: 400 });
    }

    if (debit < 0 || credit < 0) {
      return NextResponse.json({ error: 'Debit and credit must be non-negative' }, { status: 400 });
    }

    if ((debit === 0 && credit === 0) || (debit > 0 && credit > 0)) {
      return NextResponse.json(
        { error: 'Each line must have either debit or credit (not both)' },
        { status: 400 }
      );
    }

    totalDebit += debit;
    totalCredit += credit;
    normalizedLines.push({ accountId, debit, credit });
  }

  totalDebit = Number(totalDebit.toFixed(2));
  totalCredit = Number(totalCredit.toFixed(2));

  if (totalDebit !== totalCredit) {
    return NextResponse.json(
      { error: 'Journal entry is not balanced', totals: { debit: totalDebit, credit: totalCredit } },
      { status: 400 }
    );
  }

  const accountIds = [...new Set(normalizedLines.map((line) => line.accountId))];
  const existingAccounts = await prisma.chartOfAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true },
  });
  if (existingAccounts.length !== accountIds.length) {
    return NextResponse.json({ error: 'One or more accountIds are invalid' }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    return tx.journalEntry.create({
      data: {
        date,
        reference: reference || null,
        description: description || null,
        createdBy: user.id,
        lines: {
          create: normalizedLines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
          })),
        },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
  });

  return NextResponse.json(created, { status: 201 });
}, 'super_admin', 'accounting_manager', 'accountant');
