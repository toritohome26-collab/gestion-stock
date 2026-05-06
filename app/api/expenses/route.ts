import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isPaid = searchParams.get("isPaid");
  const category = searchParams.get("category") || undefined;

  const expenses = await prisma.expense.findMany({
    where: {
      ...(isPaid !== null && isPaid !== undefined ? { isPaid: isPaid === "true" } : {}),
      ...(category && { category }),
    },
    include: {
      payments: true,
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("finances.create")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();

  const expense = await prisma.expense.create({
    data: {
      category: body.category || "GENERAL",
      description: body.description,
      amount: parseFloat(body.amount),
      currency: body.currency || "ARS",
      date: body.date ? new Date(body.date) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      isPaid: body.isPaid || false,
      vendor: body.vendor || null,
      notes: body.notes || null,
      userId: (session.user as any).id,
    },
    include: { payments: true },
  });

  return NextResponse.json(expense, { status: 201 });
}
