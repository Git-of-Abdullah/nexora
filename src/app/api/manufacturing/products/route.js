import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async () => {
  const products = await prisma.product.findMany({
    include: { bom: { include: { material: true } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(products);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { name, sku, category, unitPrice, currentStock } = body;

  if (!name || !sku || !unitPrice) {
    return NextResponse.json({ error: 'name, sku and unitPrice are required' }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: { name, sku, category, unitPrice: parseFloat(unitPrice), currentStock: parseInt(currentStock || 0) },
  });

  return NextResponse.json(product, { status: 201 });
}, 'super_admin', 'manufacturing_manager');
