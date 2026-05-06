import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const employeeId = searchParams.get('employeeId');

  const records = await prisma.payroll.findMany({
    where: {
      ...(month && { month: parseInt(month) }),
      ...(year && { year: parseInt(year) }),
      ...(employeeId && { employeeId: parseInt(employeeId) }),
    },
    include: {
      employee: { include: { user: { select: { name: true } }, department: { select: { name: true } } } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return NextResponse.json(records);
}, 'super_admin', 'hr_manager', 'accountant');
