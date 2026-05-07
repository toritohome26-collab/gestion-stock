import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") || undefined;
  const status = searchParams.get("status") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;

  const where = {
    organizationId: orgId,
    ...(channel && { channel }),
    ...(status && { status }),
    ...(from || to ? { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.sale.count({ where }),
  ]);

  return NextResponse.json({ sales, total, page, pages: Math.ceil(total / limit) });
}
