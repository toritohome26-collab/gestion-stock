import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    totalProducts,
    allProducts,
    totalSalesMonth,
    totalOfficeSalesMonth,
    pendingExpenses,
    recentOnlineSales,
    recentOfficeSales,
    salesByChannel,
    topProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.product.findMany({ where: { organizationId: orgId, isActive: true }, select: { stock: true, minStock: true } }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true, netAmount: true },
      _count: true,
    }),
    prisma.officeSale.aggregate({
      where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { organizationId: orgId, isPaid: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.officeSale.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: { select: { name: true } } },
    }),
    prisma.sale.groupBy({
      by: ["channel"],
      where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["productName"],
      where: { sale: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const lowStockProducts = allProducts.filter(p => p.stock <= p.minStock).length;
  const onlineTotal = totalSalesMonth._sum.total || 0;
  const officeTotal = totalOfficeSalesMonth._sum.total || 0;

  return NextResponse.json({
    stats: {
      totalProducts,
      lowStockProducts,
      onlineSalesCount: totalSalesMonth._count,
      onlineSalesTotal: onlineTotal,
      officeSalesCount: totalOfficeSalesMonth._count,
      officeSalesTotal: officeTotal,
      totalRevenue: onlineTotal + officeTotal,
      pendingExpensesAmount: pendingExpenses._sum.amount || 0,
      pendingExpensesCount: pendingExpenses._count,
    },
    recentOnlineSales,
    recentOfficeSales,
    salesByChannel,
    topProducts,
  });
}
