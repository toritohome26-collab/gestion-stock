import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("users.view")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("users.create")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "El email ya existe" }, { status: 400 });

  const hashed = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashed,
      role: body.role || "SELLER",
      permissions: JSON.stringify(body.extraPermissions || []),
    },
    select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
