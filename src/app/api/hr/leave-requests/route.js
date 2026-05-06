import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const employeeId = searchParams.get('employeeId');

  const requests = await prisma.leaveRequest.findMany({
    where: {
      ...(status && { status }),
      ...(employeeId && { employeeId: parseInt(employeeId) }),
    },
    include: {
      employee: { include: { user: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(requests);
});

export const POST = requireAuth(async (request, context, user) => {
  const body = await request.json();
  const { employeeId, type, fromDate, toDate, reason } = body;

  if (!employeeId || !type || !fromDate || !toDate) {
    return NextResponse.json({ error: 'employeeId, type, fromDate and toDate are required' }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: parseInt(employeeId),
      type,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      status: 'Pending',
    },
    include: { employee: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json(leaveRequest, { status: 201 });
});
