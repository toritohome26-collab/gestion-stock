import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("users.edit")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const body = await req.json();

  const target = await prisma.user.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const updateData: any = {
    name: body.name,
    role: body.role,
    isActive: body.isActive,
    permissions: JSON.stringify(body.extraPermissions || []),
  };

  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("users.delete")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const target = await prisma.user.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
