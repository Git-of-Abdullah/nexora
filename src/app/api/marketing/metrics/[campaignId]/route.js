import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

function normalizeCurrency(value) {
  return Number.parseFloat(Number(value ?? 0).toFixed(2));
}

function buildSummary(metrics) {
  const totals = metrics.reduce(
    (acc, item) => {
      acc.impressions += item.impressions;
      acc.clicks += item.clicks;
      acc.conversions += item.conversions;
      acc.revenue += normalizeCurrency(item.revenue);
      return acc;
    },
    { impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  const ctrPct = totals.impressions > 0
    ? Number.parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2))
    : 0;
  const conversionRatePct = totals.clicks > 0
    ? Number.parseFloat(((totals.conversions / totals.clicks) * 100).toFixed(2))
    : 0;

  return {
    ...totals,
    ctrPct,
    conversionRatePct,
  };
}

export const GET = requireAuth(async (request, { params }) => {
  const campaignId = Number.parseInt((await params).campaignId, 10);
  if (Number.isNaN(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: 'Invalid campaignId' }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, status: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const metrics = await prisma.campaignMetric.findMany({
    where: { campaignId },
    orderBy: [{ id: 'desc' }],
  });

  const normalizedMetrics = metrics.map((metric) => ({
    ...metric,
    revenue: normalizeCurrency(metric.revenue),
  }));

  return NextResponse.json({
    campaign,
    metrics: normalizedMetrics,
    summary: buildSummary(normalizedMetrics),
  });
}, 'super_admin', 'marketing_manager', 'marketing_staff');

export const POST = requireAuth(async (request, { params }) => {
  const campaignId = Number.parseInt((await params).campaignId, 10);
  if (Number.isNaN(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: 'Invalid campaignId' }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const body = await request.json();
  const impressions = Number.parseInt(body.impressions ?? 0, 10);
  const clicks = Number.parseInt(body.clicks ?? 0, 10);
  const conversions = Number.parseInt(body.conversions ?? 0, 10);
  const revenue = Number.parseFloat(body.revenue ?? 0);

  if ([impressions, clicks, conversions].some((value) => Number.isNaN(value) || value < 0)) {
    return NextResponse.json(
      { error: 'impressions, clicks and conversions must be non-negative integers' },
      { status: 400 }
    );
  }

  if (Number.isNaN(revenue) || revenue < 0) {
    return NextResponse.json({ error: 'revenue must be a non-negative number' }, { status: 400 });
  }

  if (clicks > impressions) {
    return NextResponse.json({ error: 'clicks cannot exceed impressions' }, { status: 400 });
  }
  if (conversions > clicks) {
    return NextResponse.json({ error: 'conversions cannot exceed clicks' }, { status: 400 });
  }

  const metric = await prisma.campaignMetric.create({
    data: {
      campaignId,
      impressions,
      clicks,
      conversions,
      revenue: normalizeCurrency(revenue),
    },
  });

  const metrics = await prisma.campaignMetric.findMany({ where: { campaignId } });
  const normalizedMetrics = metrics.map((item) => ({
    ...item,
    revenue: normalizeCurrency(item.revenue),
  }));

  return NextResponse.json(
    {
      campaign,
      metric: { ...metric, revenue: normalizeCurrency(metric.revenue) },
      summary: buildSummary(normalizedMetrics),
    },
    { status: 201 }
  );
}, 'super_admin', 'marketing_manager', 'marketing_staff');
