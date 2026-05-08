import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const existing = await prisma.branch.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });

  const body = await req.json();

  if (body.isDefault) {
    await prisma.branch.updateMany({ where: { organizationId: orgId }, data: { isDefault: false } });
  }

  const branch = await prisma.branch.update({
    where: { id: params.id },
    data: {
      name: body.name ?? existing.name,
      address: body.address ?? existing.address,
      phone: body.phone ?? existing.phone,
      isActive: body.isActive ?? existing.isActive,
      isDefault: body.isDefault ?? existing.isDefault,
    },
  });

  return NextResponse.json(branch);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const existing = await prisma.branch.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  if (existing.isDefault) return NextResponse.json({ error: "No podés eliminar la sucursal principal" }, { status: 400 });

  await prisma.branch.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
