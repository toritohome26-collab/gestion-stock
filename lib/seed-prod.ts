import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sistema.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const orgSlug = "sistema-principal";

  let org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Mi Negocio",
        slug: orgSlug,
        email: adminEmail,
        plan: "pro",
      },
    });
    console.log("Organización creada");
  }

  const existing = await prisma.user.findFirst({
    where: { email: adminEmail, organizationId: org.id },
  });

  if (!existing) {
    const password = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        password,
        role: "ADMIN",
        permissions: "[]",
        organizationId: org.id,
      },
    });
    console.log("Admin creado");
  }

  const catNames = ["General", "Electrónica", "Ropa", "Hogar"];
  for (const name of catNames) {
    await prisma.category.upsert({
      where: { name_organizationId: { name, organizationId: org.id } },
      update: {},
      create: { name, organizationId: org.id },
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
