import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const sales = await prisma.officeSale.findMany({
    where: {
      organizationId: orgId,
      ...(from || to ? { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    },
    include: {
      items: { include: { product: { select: { name: true, sku: true } } } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("office.create")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  const { items, paymentMethod, discount, notes } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Debe incluir al menos un producto" }, { status: 400 });
  }

  for (const item of items) {
    const product = await prisma.product.findFirst({ where: { id: item.productId, organizationId: orgId } });
    if (!product) return NextResponse.json({ error: `Producto no encontrado: ${item.productId}` }, { status: 400 });
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Stock insuficiente para: ${product.name} (disponible: ${product.stock})` }, { status: 400 });
    }
  }

  const lastSale = await prisma.officeSale.findFirst({ where: { organizationId: orgId }, orderBy: { saleNumber: "desc" } });
  const saleNumber = (lastSale?.saleNumber || 0) + 1;

  const subtotal = items.reduce((acc: number, item: any) => acc + (item.unitPrice * item.quantity), 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = subtotal - discountAmount;

  const sale = await prisma.officeSale.create({
    data: {
      organizationId: orgId,
      saleNumber,
      paymentMethod: paymentMethod || "CASH",
      subtotal,
      discount: discountAmount,
      total,
      notes: notes || null,
      userId: (session.user as any).id,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
      },
    },
    include: { items: true, user: { select: { name: true } } },
  });

  for (const item of items) {
    await prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
    await prisma.stockMovement.create({
      data: {
        organizationId: orgId,
        productId: item.productId,
        type: "OUT",
        quantity: item.quantity,
        reason: `Venta oficina #${saleNumber}`,
        referenceId: sale.id,
        referenceType: "OFFICE_SALE",
        userId: (session.user as any).id,
      },
    });
  }

  return NextResponse.json(sale, { status: 201 });
}
