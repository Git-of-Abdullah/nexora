import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export const GET = requireAuth(async (request, { params }) => {
  const productId = parseInt((await params).productId);

  const bom = await prisma.billOfMaterial.findMany({
    where: { productId },
    include: { material: true },
  });

  return NextResponse.json(bom);
}, 'super_admin', 'manufacturing_manager', 'manufacturing_staff');

export const POST = requireAuth(async (request, { params }) => {
  const productId = parseInt((await params).productId);
  const body = await request.json();
  const { materialId, quantityRequired } = body;

  if (!materialId || !quantityRequired) {
    return NextResponse.json({ error: 'materialId and quantityRequired are required' }, { status: 400 });
  }

  const entry = await prisma.billOfMaterial.upsert({
    where: { productId_materialId: { productId, materialId: parseInt(materialId) } },
    update: { quantityRequired: parseFloat(quantityRequired) },
    create: { productId, materialId: parseInt(materialId), quantityRequired: parseFloat(quantityRequired) },
    include: { material: true },
  });

  return NextResponse.json(entry, { status: 201 });
}, 'super_admin', 'manufacturing_manager');
