import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      stockMovements: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });

  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("stock.edit")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  const current = await prisma.product.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const newStock = parseInt(body.stock) ?? current.stock;
  const stockDiff = newStock - current.stock;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: body.name,
      sku: body.sku,
      description: body.description,
      categoryId: body.categoryId || null,
      costPrice: parseFloat(body.costPrice) || 0,
      salePrice: parseFloat(body.salePrice) || 0,
      stock: newStock,
      minStock: parseInt(body.minStock) || 5,
    },
    include: { category: true },
  });

  if (stockDiff !== 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: stockDiff > 0 ? "IN" : "OUT",
        quantity: Math.abs(stockDiff),
        reason: body.stockReason || "Ajuste manual",
        referenceType: "MANUAL",
        userId: (session.user as any).id,
      },
    });
  }

  return NextResponse.json(product);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("stock.delete")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
