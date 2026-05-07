import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const integration = await prisma.integration.findFirst({ where: { platform: "MERCADOLIBRE", organizationId: orgId } });
  return NextResponse.json(integration || { platform: "MERCADOLIBRE", isActive: false });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const existing = await prisma.integration.findFirst({ where: { platform: "MERCADOLIBRE", organizationId: orgId } });
  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { isActive: false, accessToken: null, refreshToken: null },
    });
  }
  return NextResponse.json({ ok: true });
}
