import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(new URL("/configuracion?error=tn_no_code", req.url));

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  const orgId = (session.user as any).organizationId;

  const res = await fetch("https://www.tiendanube.com/apps/authorize/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TN_APP_ID!,
      client_secret: process.env.TN_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) return NextResponse.redirect(new URL("/configuracion?error=tn_token_failed", req.url));

  const data = await res.json();

  const existing = await prisma.integration.findFirst({ where: { platform: "TIENDANUBE", organizationId: orgId } });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        accessToken: data.access_token,
        shopId: data.user_id?.toString(),
        shopName: `Tiendanube #${data.user_id}`,
        isActive: true,
      },
    });
  } else {
    await prisma.integration.create({
      data: {
        organizationId: orgId,
        platform: "TIENDANUBE",
        accessToken: data.access_token,
        shopId: data.user_id?.toString(),
        shopName: `Tiendanube #${data.user_id}`,
        isActive: true,
      },
    });
  }

  return NextResponse.redirect(new URL("/configuracion?success=tn_connected", req.url));
}
