import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

const VALID_CAMPAIGN_STATUSES = new Set([
  'Planning',
  'Active',
  'Paused',
  'Completed',
  'Cancelled',
]);

function parseDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export const PATCH = requireAuth(async (request, { params }) => {
  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    }
    updateData.name = name;
  }

  if (body.type !== undefined) {
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    if (!type) {
      return NextResponse.json({ error: 'type cannot be empty' }, { status: 400 });
    }
    updateData.type = type;
  }

  if (body.status !== undefined) {
    if (!VALID_CAMPAIGN_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${Array.from(VALID_CAMPAIGN_STATUSES).join(', ')}` },
        { status: 400 }
      );
    }
    updateData.status = body.status;
  }

  if (body.budget !== undefined) {
    const budget = Number.parseFloat(body.budget);
    if (Number.isNaN(budget) || budget <= 0) {
      return NextResponse.json({ error: 'budget must be a positive number' }, { status: 400 });
    }
    updateData.budget = budget;
  }

  let startDate;
  if (body.startDate !== undefined) {
    startDate = parseDateInput(body.startDate);
    if (!startDate) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
    updateData.startDate = startDate;
  }

  let endDate;
  if (body.endDate !== undefined) {
    endDate = parseDateInput(body.endDate);
    if (!endDate) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }
    updateData.endDate = endDate;
  }

  const effectiveStart = startDate ?? existing.startDate;
  const effectiveEnd = endDate ?? existing.endDate;
  if (effectiveStart > effectiveEnd) {
    return NextResponse.json(
      { error: 'startDate cannot be after endDate' },
      { status: 400 }
    );
  }

  if (!Object.keys(updateData).length) {
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(campaign);
}, 'super_admin', 'marketing_manager');

export const DELETE = requireAuth(async (request, { params }) => {
  const id = Number.parseInt((await params).id, 10);
  if (Number.isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.updateMany({
      where: { campaignId: id },
      data: { campaignId: null },
    });
    await tx.campaignMetric.deleteMany({ where: { campaignId: id } });
    await tx.marketingBudget.deleteMany({ where: { campaignId: id } });
    await tx.campaign.delete({ where: { id } });
  });

  return NextResponse.json({ message: 'Campaign deleted' });
}, 'super_admin', 'marketing_manager');
