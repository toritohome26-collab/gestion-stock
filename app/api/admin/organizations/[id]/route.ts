import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function requireSuperAdmin(session: any) {
  if (!session || !(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const body = await req.json();
  const data: any = {};

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.plan) data.plan = body.plan;
  if (body.name) data.name = body.name;
  if ("alertMessage" in body) {
    data.alertMessage = body.alertMessage || null;
    data.alertSentAt = body.alertMessage ? new Date() : null;
  }

  const org = await prisma.organization.update({ where: { id: params.id }, data });
  return NextResponse.json(org);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  await prisma.organization.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
