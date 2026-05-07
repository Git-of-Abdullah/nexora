import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

// GET /api/hr/me — returns the employee record for the currently logged-in user
export const GET = requireAuth(async (request, context, user) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
    include: {
      user:       { select: { id: true, name: true, email: true, role: true } },
      department: { select: { id: true, name: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: 'No employee record found for this user' }, { status: 404 });
  }

  return NextResponse.json(employee);
});
