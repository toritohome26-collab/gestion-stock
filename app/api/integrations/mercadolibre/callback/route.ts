import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(new URL("/configuracion?error=ml_no_code", req.url));

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  const orgId = (session.user as any).organizationId;

  const redirectUri = `${new URL(req.url).origin}/api/integrations/mercadolibre/callback`;

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_APP_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) return NextResponse.redirect(new URL("/configuracion?error=ml_token_failed", req.url));

  const data = await res.json();

  const userRes = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const mlUser = userRes.ok ? await userRes.json() : null;

  const existing = await prisma.integration.findFirst({ where: { platform: "MERCADOLIBRE", organizationId: orgId } });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        shopId: data.user_id?.toString(),
        shopName: mlUser?.nickname || "MercadoLibre",
        isActive: true,
      },
    });
  } else {
    await prisma.integration.create({
      data: {
        organizationId: orgId,
        platform: "MERCADOLIBRE",
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        shopId: data.user_id?.toString(),
        shopName: mlUser?.nickname || "MercadoLibre",
        isActive: true,
      },
    });
  }

  return NextResponse.redirect(new URL("/configuracion?success=ml_connected", req.url));
}
