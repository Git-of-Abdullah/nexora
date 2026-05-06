import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      department: true,
      attendance: { orderBy: { date: 'desc' }, take: 30 },
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
      payrolls: { orderBy: { year: 'desc' }, take: 12 },
      performanceReviews: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  return NextResponse.json(employee);
});

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);
  const body = await request.json();

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(body.position && { position: body.position }),
      ...(body.departmentId && { departmentId: parseInt(body.departmentId) }),
      ...(body.salary && { salary: parseFloat(body.salary) }),
      ...(body.status && { status: body.status }),
      ...(body.hireDate && { hireDate: new Date(body.hireDate) }),
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      department: true,
    },
  });

  return NextResponse.json(employee);
}, 'super_admin', 'hr_manager');
