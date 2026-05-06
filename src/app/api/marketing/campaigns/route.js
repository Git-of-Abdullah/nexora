import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(campaigns);
}, 'super_admin', 'marketing_manager', 'marketing_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { name, type, status, budget, startDate, endDate } = body;

  if (!name || !type || !budget || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      type,
      status: status || 'Planning',
      budget: parseFloat(budget),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}, 'super_admin', 'marketing_manager');
