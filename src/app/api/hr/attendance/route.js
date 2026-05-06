import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const records = await prisma.attendance.findMany({
    where: {
      ...(employeeId && { employeeId: parseInt(employeeId) }),
      ...(from && to && { date: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: {
      employee: { include: { user: { select: { name: true } } } },
    },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(records);
});

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { employeeId, date, clockIn, clockOut, status } = body;

  if (!employeeId || !date) {
    return NextResponse.json({ error: 'employeeId and date are required' }, { status: 400 });
  }

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: parseInt(employeeId), date: new Date(date) } },
    update: {
      ...(clockIn && { clockIn: new Date(clockIn) }),
      ...(clockOut && { clockOut: new Date(clockOut) }),
      ...(status && { status }),
    },
    create: {
      employeeId: parseInt(employeeId),
      date: new Date(date),
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      status: status || 'Present',
    },
  });

  return NextResponse.json(record, { status: 201 });
});
