import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(lead);
}, 'super_admin', 'marketing_manager', 'marketing_staff');
