import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const leads = await prisma.lead.findMany({
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(leads);
}, 'super_admin', 'marketing_manager', 'marketing_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { name, email, phone, source, assignedTo, campaignId } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      phone,
      source,
      assignedTo: assignedTo ? parseInt(assignedTo) : null,
      campaignId: campaignId ? parseInt(campaignId) : null,
      status: 'New',
    },
    include: {
      assignee: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(lead, { status: 201 });
}, 'super_admin', 'marketing_manager', 'marketing_staff');
