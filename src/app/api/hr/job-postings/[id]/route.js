import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);
  const body = await request.json();

  const posting = await prisma.jobPosting.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.status && { status: body.status }),
      ...(body.description !== undefined && { description: body.description }),
    },
    include: { department: true },
  });

  return NextResponse.json(posting);
}, 'super_admin', 'hr_manager');
