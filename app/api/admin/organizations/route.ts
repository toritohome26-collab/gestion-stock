import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function requireSuperAdmin(session: any) {
  if (!session || !(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const orgs = await prisma.organization.findMany({
    where: { slug: { not: "system-internal" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, products: true, sales: true, officeSales: true } },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const orgsWithStats = await Promise.all(
    orgs.map(async (org) => {
      const [salesMonth, officeSalesMonth, integrations] = await Promise.all([
        prisma.sale.aggregate({
          where: { organizationId: org.id, createdAt: { gte: monthStart } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.officeSale.aggregate({
          where: { organizationId: org.id, createdAt: { gte: monthStart } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.integration.findMany({
          where: { organizationId: org.id, isActive: true },
          select: { platform: true },
        }),
      ]);

      return {
        ...org,
        salesMonth: { count: salesMonth._count, total: salesMonth._sum.total || 0 },
        officeSalesMonth: { count: officeSalesMonth._count, total: officeSalesMonth._sum.total || 0 },
        integrations: integrations.map((i) => i.platform),
      };
    })
  );

  const totalStats = {
    totalOrgs: orgs.length,
    activeOrgs: orgs.filter((o) => o.isActive).length,
    totalUsers: orgs.reduce((acc, o) => acc + o._count.users, 0),
    totalProducts: orgs.reduce((acc, o) => acc + o._count.products, 0),
  };

  return NextResponse.json({ orgs: orgsWithStats, stats: totalStats });
}
