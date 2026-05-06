import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const lowStock = searchParams.get('lowStock') === 'true';

  const materials = await prisma.rawMaterial.findMany({
    where: lowStock ? { stockQty: { lte: prisma.rawMaterial.fields.reorderLevel } } : undefined,
    orderBy: { name: 'asc' },
  });

  // Tag each material with stock status
  const tagged = materials.map((m) => ({
    ...m,
    stockStatus:
      Number(m.stockQty) === 0
        ? 'out'
        : Number(m.stockQty) <= Number(m.reorderLevel)
        ? 'low'
        : 'ok',
  }));

  return NextResponse.json(tagged);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const POST = requireAuth(async (request) => {
  const body = await request.json();
  const { name, unit, stockQty, reorderLevel, costPerUnit } = body;

  if (!name || !unit || stockQty === undefined || !reorderLevel || !costPerUnit) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const material = await prisma.rawMaterial.create({
    data: { name, unit, stockQty: parseFloat(stockQty), reorderLevel: parseFloat(reorderLevel), costPerUnit: parseFloat(costPerUnit) },
  });

  return NextResponse.json(material, { status: 201 });
}, 'super_admin', 'manufacturing_manager');
