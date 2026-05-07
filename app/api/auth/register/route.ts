import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, email, password, businessName } = await req.json();

  if (!name || !email || !password || !businessName) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  const existingOrg = await prisma.organization.findUnique({ where: { email } });
  if (existingOrg) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 400 });
  }

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") + "-" + Date.now();

  const hashedPassword = await bcrypt.hash(password, 12);

  const org = await prisma.organization.create({
    data: {
      name: businessName,
      slug,
      email,
      plan: "free",
      users: {
        create: {
          name,
          email,
          password: hashedPassword,
          role: "ADMIN",
          permissions: "[]",
        },
      },
      categories: {
        create: [
          { name: "General" },
          { name: "Electrónica" },
          { name: "Ropa" },
          { name: "Hogar" },
        ],
      },
    },
  });

  return NextResponse.json({ success: true, organizationId: org.id });
}
