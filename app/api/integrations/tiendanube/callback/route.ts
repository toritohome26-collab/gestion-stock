import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(new URL("/configuracion?error=tn_no_code", req.url));

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

  await prisma.integration.upsert({
    where: { platform: "TIENDANUBE" },
    update: {
      accessToken: data.access_token,
      shopId: data.user_id?.toString(),
      shopName: `Tiendanube #${data.user_id}`,
      isActive: true,
    },
    create: {
      platform: "TIENDANUBE",
      accessToken: data.access_token,
      shopId: data.user_id?.toString(),
      shopName: `Tiendanube #${data.user_id}`,
      isActive: true,
    },
  });

  return NextResponse.redirect(new URL("/configuracion?success=tn_connected", req.url));
}
