import bcrypt from "bcryptjs";
import prisma from "./prisma";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@sistema.com" } });
  if (!existing) {
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 12);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: process.env.ADMIN_EMAIL || "admin@sistema.com",
        password,
        role: "ADMIN",
        permissions: "[]",
      },
    });
    console.log("Admin creado");
  }

  const catNames = ["General", "Electrónica", "Ropa", "Hogar"];
  for (const name of catNames) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
