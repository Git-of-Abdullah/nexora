import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const productId = searchParams.get('productId');

  const orders = await prisma.productionOrder.findMany({
    where: {
      ...(status && { status }),
      ...(productId && { productId: parseInt(productId) }),
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      workCentre: { select: { id: true, name: true } },
      qualityChecks: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(orders);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { productId, quantity, workCentreId, startDate, endDate } = body;

  if (!productId || !quantity) {
    return NextResponse.json({ error: 'productId and quantity are required' }, { status: 400 });
  }

  const order = await prisma.productionOrder.create({
    data: {
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      workCentreId: workCentreId ? parseInt(workCentreId) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: 'Draft',
    },
    include: { product: true, workCentre: true },
  });

  return NextResponse.json(order, { status: 201 });
}, 'super_admin', 'manufacturing_manager');
