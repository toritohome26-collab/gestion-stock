import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncMLOrders } from "@/lib/sync/mercadolibre";
import { syncTNOrders } from "@/lib/sync/tiendanube";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perms: string[] = (session.user as any).permissions || [];
  if (!perms.includes("integrations.view")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  let mlSales = 0, tnSales = 0;
  const errors: string[] = [];

  try { mlSales = await syncMLOrders(orgId); } catch (e: any) { errors.push(`ML: ${e.message}`); }
  try { tnSales = await syncTNOrders(orgId); } catch (e: any) { errors.push(`TN: ${e.message}`); }

  return NextResponse.json({
    newSales: mlSales + tnSales,
    ml: mlSales,
    tn: tnSales,
    errors,
  });
}
