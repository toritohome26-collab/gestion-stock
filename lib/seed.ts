import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@sistema.com" } });
  if (!existing) {
    const password = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: "admin@sistema.com",
        password,
        role: "ADMIN",
        permissions: "[]",
      },
    });
    console.log("✅ Usuario admin creado.");
  } else {
    console.log("ℹ️  Admin ya existe.");
  }

  const catNames = ["General", "Electrónica", "Ropa", "Hogar"];
  for (const name of catNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Categorías listas.");
  console.log("   Usuario: admin@sistema.com");
  console.log("   Contraseña: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
