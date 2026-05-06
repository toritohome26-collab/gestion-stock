import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const integration = await prisma.integration.findUnique({ where: { platform: "TIENDANUBE" } });
  return NextResponse.json(integration || { platform: "TIENDANUBE", isActive: false });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.integration.upsert({
    where: { platform: "TIENDANUBE" },
    update: { isActive: false, accessToken: null, refreshToken: null },
    create: { platform: "TIENDANUBE", isActive: false },
  });
  return NextResponse.json({ ok: true });
}
