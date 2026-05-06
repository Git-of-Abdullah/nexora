import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');

  const employees = await prisma.employee.findMany({
    where: {
      ...(departmentId && { departmentId: parseInt(departmentId) }),
      ...(status && { status }),
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { empNo: 'asc' },
  });

  return NextResponse.json(employees);
}, 'super_admin', 'hr_manager', 'hr_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { name, email, password, role, departmentId, position, hireDate, salary, empNo } = body;

  if (!name || !email || !password || !departmentId || !position || !hireDate || !salary || !empNo) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: role || 'general_employee', department: null },
    });

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        empNo,
        departmentId: parseInt(departmentId),
        position,
        hireDate: new Date(hireDate),
        salary: parseFloat(salary),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        department: true,
      },
    });

    return employee;
  });

  return NextResponse.json(result, { status: 201 });
}, 'super_admin', 'hr_manager');
