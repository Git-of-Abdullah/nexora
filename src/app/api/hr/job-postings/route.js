import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const postings = await prisma.jobPosting.findMany({
    where: status ? { status } : undefined,
    include: { department: { select: { id: true, name: true } } },
    orderBy: { postedDate: 'desc' },
  });

  return NextResponse.json(postings);
});

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { title, departmentId, description } = body;

  if (!title || !departmentId) {
    return NextResponse.json({ error: 'title and departmentId are required' }, { status: 400 });
  }

  const posting = await prisma.jobPosting.create({
    data: { title, departmentId: parseInt(departmentId), description, status: 'Open' },
    include: { department: true },
  });

  return NextResponse.json(posting, { status: 201 });
}, 'super_admin', 'hr_manager');
