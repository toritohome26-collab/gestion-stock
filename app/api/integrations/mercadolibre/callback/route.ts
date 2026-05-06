import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(new URL("/configuracion?error=ml_no_code", req.url));

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_APP_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI!,
    }),
  });

  if (!res.ok) return NextResponse.redirect(new URL("/configuracion?error=ml_token_failed", req.url));

  const data = await res.json();

  const userRes = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const user = userRes.ok ? await userRes.json() : null;

  await prisma.integration.upsert({
    where: { platform: "MERCADOLIBRE" },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      shopId: data.user_id?.toString(),
      shopName: user?.nickname || "MercadoLibre",
      isActive: true,
    },
    create: {
      platform: "MERCADOLIBRE",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      shopId: data.user_id?.toString(),
      shopName: user?.nickname || "MercadoLibre",
      isActive: true,
    },
  });

  return NextResponse.redirect(new URL("/configuracion?success=ml_connected", req.url));
}
