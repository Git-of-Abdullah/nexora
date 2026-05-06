import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async () => {
  const centres = await prisma.workCentre.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(centres);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const POST = requireAuth(async (request) => {
  const { name, capacity } = await request.json();

  if (!name || !capacity) {
    return NextResponse.json({ error: 'name and capacity are required' }, { status: 400 });
  }

  const centre = await prisma.workCentre.create({ data: { name, capacity: parseInt(capacity) } });
  return NextResponse.json(centre, { status: 201 });
}, 'super_admin', 'manufacturing_manager');
