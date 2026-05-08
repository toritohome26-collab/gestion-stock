import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ alertMessage: null });

  const orgId = (session.user as any).organizationId;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { alertMessage: true },
  });

  return NextResponse.json({ alertMessage: org?.alertMessage || null });
}
