import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);
  const body = await request.json();

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.email && { email: body.email }),
      ...(body.phone && { phone: body.phone }),
      ...(body.source && { source: body.source }),
      ...(body.status && { status: body.status }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo ? parseInt(body.assignedTo) : null }),
      ...(body.campaignId !== undefined && { campaignId: body.campaignId ? parseInt(body.campaignId) : null }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(lead);
}, 'super_admin', 'marketing_manager', 'marketing_staff');

export const DELETE = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);

  await prisma.lead.delete({ where: { id } });

  return NextResponse.json({ message: 'Lead deleted' });
}, 'super_admin', 'marketing_manager');

