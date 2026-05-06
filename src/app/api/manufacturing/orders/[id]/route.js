import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);
  const body = await request.json();

  const order = await prisma.productionOrder.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.workCentreId !== undefined && { workCentreId: body.workCentreId ? parseInt(body.workCentreId) : null }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.endDate && { endDate: new Date(body.endDate) }),
      ...(body.quantity && { quantity: parseInt(body.quantity) }),
    },
    include: { product: true, workCentre: true },
  });

  // When completed, update finished goods stock
  if (body.status === 'Completed') {
    await prisma.product.update({
      where: { id: order.productId },
      data: { currentStock: { increment: order.quantity } },
    });
  }

  return NextResponse.json(order);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const DELETE = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);

  await prisma.productionOrder.delete({ where: { id } });

  return NextResponse.json({ message: 'Deleted' });
}, 'super_admin', 'manufacturing_manager');
