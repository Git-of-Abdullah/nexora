import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const employeeIdParam = searchParams.get('employeeId');

  const month = monthParam ? Number.parseInt(monthParam, 10) : null;
  const year = yearParam ? Number.parseInt(yearParam, 10) : null;
  const employeeId = employeeIdParam ? Number.parseInt(employeeIdParam, 10) : null;

  if (monthParam && (Number.isNaN(month) || month < 1 || month > 12)) {
    return NextResponse.json({ error: 'month must be an integer between 1 and 12' }, { status: 400 });
  }
  if (yearParam && (Number.isNaN(year) || year < 2000 || year > 2100)) {
    return NextResponse.json({ error: 'year must be an integer between 2000 and 2100' }, { status: 400 });
  }
  if (employeeIdParam && (Number.isNaN(employeeId) || employeeId <= 0)) {
    return NextResponse.json({ error: 'employeeId must be a positive integer' }, { status: 400 });
  }

  const records = await prisma.payroll.findMany({
    where: {
      ...(month !== null ? { month } : {}),
      ...(year !== null ? { year } : {}),
      ...(employeeId !== null ? { employeeId } : {}),
    },
    include: {
      employee: { include: { user: { select: { name: true } }, department: { select: { name: true } } } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return NextResponse.json(records);
}, 'super_admin', 'hr_manager', 'accountant');
