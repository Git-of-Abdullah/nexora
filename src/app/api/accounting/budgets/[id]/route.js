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

export const PATCH = requireAuth(async (request, { params }) => {
  try {
    const id = Number.parseInt((await params).id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    const { allocated, spent } = await request.json();

    const updateData = {};

    if (allocated !== undefined) {
      const parsedAllocated = Number.parseFloat(allocated);
      if (Number.isNaN(parsedAllocated) || parsedAllocated <= 0) {
        return NextResponse.json(
          { error: 'allocated must be a positive number' },
          { status: 400 }
        );
      }
      updateData.allocated = toMoney(parsedAllocated);
    }

    if (spent !== undefined) {
      const parsedSpent = Number.parseFloat(spent);
      if (Number.isNaN(parsedSpent) || parsedSpent < 0) {
        return NextResponse.json(
          { error: 'spent must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.spent = toMoney(parsedSpent);
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: { department: true },
    });

    const finalAllocated = toMoney(updated.allocated);
    const finalSpent = toMoney(updated.spent);

    return NextResponse.json(
      {
        ...updated,
        spent: finalSpent,
        allocated: finalAllocated,
        remaining: toMoney(finalAllocated - finalSpent),
        utilizationPct: toUtilization(finalSpent, finalAllocated),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /budgets/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
});
