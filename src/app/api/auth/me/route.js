import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request, context, user) => {
  const found = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, department: true, isActive: true, createdAt: true },
  });

  if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user: found });
});
