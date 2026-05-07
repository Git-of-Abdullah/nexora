import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  const company = searchParams.get('company');
  const q = searchParams.get('q');
  const minValue = searchParams.get('minValue');

  const parsedLeadId = leadId ? Number.parseInt(leadId, 10) : null;
  if (leadId && (Number.isNaN(parsedLeadId) || parsedLeadId <= 0)) {
    return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
  }

  const parsedMinValue = minValue ? Number.parseFloat(minValue) : null;
  if (minValue && (Number.isNaN(parsedMinValue) || parsedMinValue < 0)) {
    return NextResponse.json({ error: 'minValue must be a non-negative number' }, { status: 400 });
  }

  const customers = await prisma.customer.findMany({
    where: {
      ...(parsedLeadId ? { leadId: parsedLeadId } : {}),
      ...(company ? { company: { contains: company, mode: 'insensitive' } } : {}),
      ...(parsedMinValue !== null ? { totalOrdersValue: { gte: parsedMinValue } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { company: { contains: q, mode: 'insensitive' } },
              { lead: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          source: true,
          status: true,
          campaign: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ id: 'desc' }],
  });

  const normalized = customers.map((customer) => ({
    ...customer,
    totalOrdersValue: Number.parseFloat(Number(customer.totalOrdersValue).toFixed(2)),
  }));

  return NextResponse.json(normalized);
}, 'super_admin', 'marketing_manager', 'marketing_staff');
