import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');

  const budgets = await prisma.marketingBudget.findMany({
    where: campaignId ? { campaignId: parseInt(campaignId) } : undefined,
    include: {
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { campaignId: 'desc' },
  });

  return NextResponse.json(budgets);
}, 'super_admin', 'marketing_manager', 'marketing_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { campaignId, allocated, spent } = body;

  if (!campaignId || !allocated) {
    return NextResponse.json({ error: 'campaignId and allocated are required' }, { status: 400 });
  }

  const budget = await prisma.marketingBudget.create({
    data: {
      campaignId: parseInt(campaignId),
      allocated: parseFloat(allocated),
      spent: spent ? parseFloat(spent) : 0,
      remaining: parseFloat(allocated) - (spent ? parseFloat(spent) : 0),
    },
    include: { campaign: true },
  });

  return NextResponse.json(budget, { status: 201 });
}, 'super_admin', 'marketing_manager');

