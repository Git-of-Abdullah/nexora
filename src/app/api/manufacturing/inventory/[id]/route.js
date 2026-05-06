import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const PATCH = requireAuth(async (request, { params }) => {
  const id = parseInt((await params).id);
  const body = await request.json();

  const material = await prisma.rawMaterial.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.unit && { unit: body.unit }),
      ...(body.stockQty !== undefined && { stockQty: parseFloat(body.stockQty) }),
      ...(body.reorderLevel !== undefined && { reorderLevel: parseFloat(body.reorderLevel) }),
      ...(body.costPerUnit !== undefined && { costPerUnit: parseFloat(body.costPerUnit) }),
    },
  });

  return NextResponse.json(material);
}, 'super_admin', 'manufacturing_manager');
