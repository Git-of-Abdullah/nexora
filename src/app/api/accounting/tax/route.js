import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const VALID_TAX_TYPES = new Set(['VAT', 'GST', 'Income Tax', 'Corporate Tax', 'Payroll Tax', 'Sales Tax', 'Other']);
const VALID_STATUSES = new Set(['Pending', 'Calculated', 'Filed', 'Paid', 'Amended']);

function validatePeriod(period) {
  const pattern = /^\d{4}-\d{2}$/;
  if (!pattern.test(period)) return false;
  const [year, month] = period.split('-').map(Number);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

export const GET = requireAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const period = searchParams.get('period');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'period';
    const order = searchParams.get('order') || 'desc';

    const where = {};
    if (type) where.type = type;
    if (period) where.period = period;
    if (status) where.status = status;

    const orderBy = {};
    if (['amount', 'period', 'id', 'type', 'status'].includes(sortBy)) {
      orderBy[sortBy] = order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    }

    const taxes = await prisma.taxRecord.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { period: 'desc' },
    });

    const enriched = taxes.map(t => ({
      ...t,
      amount: parseFloat(t.amount),
    }));

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error('GET /tax error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax records' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request) => {
  try {
    const { type, amount, period, status = 'Pending' } = await request.json();

    if (!type || amount === undefined || !period) {
      return NextResponse.json(
        { error: 'Missing required fields: type, amount, period' },
        { status: 400 }
      );
    }

    if (!VALID_TAX_TYPES.has(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${Array.from(VALID_TAX_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json(
        { error: 'amount must be a non-negative number' },
        { status: 400 }
      );
    }

    if (!validatePeriod(period)) {
      return NextResponse.json(
        { error: 'period must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
        { status: 400 }
      );
    }

    const taxRecord = await prisma.taxRecord.create({
      data: {
        type,
        amount: parsedAmount,
        period,
        status,
      },
    });

    return NextResponse.json(
      {
        ...taxRecord,
        amount: parseFloat(taxRecord.amount),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /tax error:', error);
    return NextResponse.json(
      { error: 'Failed to create tax record' },
      { status: 500 }
    );
  }
});
