import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  const reviews = await prisma.performanceReview.findMany({
    where: employeeId ? { employeeId: parseInt(employeeId) } : undefined,
    include: {
      employee: { include: { user: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(reviews);
}, 'super_admin', 'hr_manager');

export const POST = requireAuth(async (request, context, user) => {
  const body = await request.json();
  const { employeeId, period, score, comments } = body;

  if (!employeeId || !period || score === undefined) {
    return NextResponse.json({ error: 'employeeId, period and score are required' }, { status: 400 });
  }

  const review = await prisma.performanceReview.create({
    data: {
      employeeId: parseInt(employeeId),
      reviewerId: user.id,
      period,
      score: parseInt(score),
      comments,
    },
    include: {
      employee: { include: { user: { select: { name: true } } } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(review, { status: 201 });
}, 'super_admin', 'hr_manager');
