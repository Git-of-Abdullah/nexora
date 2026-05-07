import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

function toMoney(value) {
  return Number.parseFloat(Number(value).toFixed(2));
}

function toUtilization(spent, allocated) {
  if (allocated <= 0) return 0;
  return Number.parseFloat(((spent / allocated) * 100).toFixed(2));
}

export const GET = requireAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const fiscalYear = searchParams.get('fiscalYear');
    const sortBy = searchParams.get('sortBy') || 'allocated';
    const order = searchParams.get('order') || 'desc';

    const where = {};

    if (departmentId) {
      const parsedDepartmentId = Number.parseInt(departmentId, 10);
      if (Number.isNaN(parsedDepartmentId)) {
        return NextResponse.json({ error: 'Invalid departmentId' }, { status: 400 });
      }
      where.departmentId = parsedDepartmentId;
    }

    if (fiscalYear) {
      const parsedFiscalYear = Number.parseInt(fiscalYear, 10);
      if (Number.isNaN(parsedFiscalYear)) {
        return NextResponse.json({ error: 'Invalid fiscalYear' }, { status: 400 });
      }
      where.fiscalYear = parsedFiscalYear;
    }

    const orderBy = {};
    if (['allocated', 'spent', 'fiscalYear', 'id'].includes(sortBy)) {
      orderBy[sortBy] = order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    }

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: Object.keys(orderBy).length ? orderBy : { id: 'asc' },
      include: { department: true },
    });

    const enriched = budgets.map((budget) => {
      const allocated = toMoney(budget.allocated);
      const spent = toMoney(budget.spent);
      return {
        ...budget,
        spent,
        allocated,
        remaining: toMoney(allocated - spent),
        utilizationPct: toUtilization(spent, allocated),
      };
    });

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error('GET /budgets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request) => {
  try {
    const { departmentId, fiscalYear, allocated } = await request.json();

    if (!departmentId || !fiscalYear || allocated === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: departmentId, fiscalYear, allocated' },
        { status: 400 }
      );
    }

    const parsedAllocated = Number.parseFloat(allocated);
    if (Number.isNaN(parsedAllocated) || parsedAllocated <= 0) {
      return NextResponse.json(
        { error: 'allocated must be a positive number' },
        { status: 400 }
      );
    }

    const parsedYear = Number.parseInt(fiscalYear, 10);
    if (Number.isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return NextResponse.json(
        { error: 'fiscalYear must be a valid year between 2000 and 2100' },
        { status: 400 }
      );
    }

    const dept = await prisma.department.findUnique({
      where: { id: Number.parseInt(departmentId, 10) },
    });

    if (!dept) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    const existing = await prisma.budget.findUnique({
      where: {
        departmentId_fiscalYear: {
          departmentId: Number.parseInt(departmentId, 10),
          fiscalYear: parsedYear,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Budget already exists for this department and fiscal year' },
        { status: 409 }
      );
    }

    const budget = await prisma.budget.create({
      data: {
        departmentId: Number.parseInt(departmentId, 10),
        fiscalYear: parsedYear,
        allocated: toMoney(parsedAllocated),
        spent: 0,
      },
      include: { department: true },
    });

    return NextResponse.json(
      {
        ...budget,
        spent: toMoney(budget.spent),
        allocated: toMoney(budget.allocated),
        remaining: toMoney(budget.allocated),
        utilizationPct: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /budgets error:', error);
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
});
