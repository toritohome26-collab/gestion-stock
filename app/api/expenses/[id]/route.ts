import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("finances.edit")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const body = await req.json();

  const existing = await prisma.expense.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  const expense = await prisma.expense.update({
    where: { id: params.id },
    data: {
      category: body.category,
      description: body.description,
      amount: parseFloat(body.amount),
      currency: body.currency || "ARS",
      date: body.date ? new Date(body.date) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      isPaid: body.isPaid,
      paidAt: body.isPaid ? (body.paidAt ? new Date(body.paidAt) : new Date()) : null,
      vendor: body.vendor || null,
      notes: body.notes || null,
    },
    include: { payments: true },
  });

  if (body.isPaid && body.registerPayment) {
    await prisma.payment.create({
      data: {
        expenseId: params.id,
        amount: expense.amount,
        method: body.paymentMethod || "CASH",
        notes: "Marcado como pagado",
        userId: (session.user as any).id,
      },
    });
  }

  return NextResponse.json(expense);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("finances.delete")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const existing = await prisma.expense.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
