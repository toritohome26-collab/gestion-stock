import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || undefined;
  const lowStock = searchParams.get("lowStock") === "true";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const filtered = lowStock ? products.filter((p) => p.stock <= p.minStock) : products;
  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("stock.create")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();

  if (!body.name || !body.sku) {
    return NextResponse.json({ error: "Nombre y SKU son requeridos" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name: body.name,
      sku: body.sku,
      description: body.description,
      categoryId: body.categoryId || null,
      costPrice: parseFloat(body.costPrice) || 0,
      salePrice: parseFloat(body.salePrice) || 0,
      stock: parseInt(body.stock) || 0,
      minStock: parseInt(body.minStock) || 5,
    },
    include: { category: true },
  });

  if (product.stock > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: "IN",
        quantity: product.stock,
        reason: "Stock inicial",
        referenceType: "MANUAL",
        userId: (session.user as any).id,
      },
    });
  }

  return NextResponse.json(product, { status: 201 });
}
