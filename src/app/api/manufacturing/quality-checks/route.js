import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  const checks = await prisma.qualityCheck.findMany({
    where: orderId ? { orderId: parseInt(orderId) } : undefined,
    include: {
      order: { include: { product: true } },
      inspector: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(checks);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const POST = requireAuth(async (request, context, user) => {
  const body = await request.json();
  const { orderId, result, notes } = body;

  if (!orderId || !result) {
    return NextResponse.json({ error: 'orderId and result are required' }, { status: 400 });
  }

  const check = await prisma.qualityCheck.create({
    data: {
      orderId: parseInt(orderId),
      inspectorId: user.id,
      result,
      notes,
    },
    include: { order: { include: { product: true } }, inspector: { select: { id: true, name: true } } },
  });

  // Auto-advance order status to Completed if passed
  if (result === 'Pass') {
    await prisma.productionOrder.update({
      where: { id: parseInt(orderId) },
      data: { status: 'Completed' },
    });
  }

  return NextResponse.json(check, { status: 201 });
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');
