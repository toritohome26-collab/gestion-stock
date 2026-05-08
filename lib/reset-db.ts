import "dotenv/config";
import { Pool } from "pg";

async function resetDb() {
  if (process.env.RESET_DB !== "true") {
    console.log("RESET_DB no está activo, saltando reset.");
    return;
  }

  console.log("Reseteando base de datos...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query(`
      DROP TABLE IF EXISTS "Payment" CASCADE;
      DROP TABLE IF EXISTS "OfficeSaleItem" CASCADE;
      DROP TABLE IF EXISTS "OfficeSale" CASCADE;
      DROP TABLE IF EXISTS "SaleItem" CASCADE;
      DROP TABLE IF EXISTS "Sale" CASCADE;
      DROP TABLE IF EXISTS "StockMovement" CASCADE;
      DROP TABLE IF EXISTS "Product" CASCADE;
      DROP TABLE IF EXISTS "Category" CASCADE;
      DROP TABLE IF EXISTS "Integration" CASCADE;
      DROP TABLE IF EXISTS "Expense" CASCADE;
      DROP TABLE IF EXISTS "User" CASCADE;
      DROP TABLE IF EXISTS "Organization" CASCADE;
    `);
    console.log("Tablas eliminadas. Prisma va a recrearlas.");
  } finally {
    client.release();
    await pool.end();
  }
}

resetDb().catch((e) => { console.error(e); process.exit(1); });
