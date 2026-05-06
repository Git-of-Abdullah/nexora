import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const PATCH = requireAuth(async (request, { params }, user) => {
  const id = parseInt((await params).id);
  const body = await request.json();

  if (!body.status || !['Approved', 'Rejected'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be Approved or Rejected' }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.update({
    where: { id },
    data: { status: body.status, approvedBy: user.id },
    include: {
      employee: { include: { user: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(leaveRequest);
}, 'super_admin', 'hr_manager');
