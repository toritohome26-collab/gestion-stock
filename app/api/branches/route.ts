import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { users: true, products: true, officeSales: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(branches);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("users.create")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

  const existing = await prisma.branch.findFirst({ where: { name: body.name, organizationId: orgId } });
  if (existing) return NextResponse.json({ error: "Ya existe una sucursal con ese nombre" }, { status: 400 });

  const branch = await prisma.branch.create({
    data: {
      organizationId: orgId,
      name: body.name,
      address: body.address || null,
      phone: body.phone || null,
      isDefault: body.isDefault || false,
    },
  });

  return NextResponse.json(branch, { status: 201 });
}
