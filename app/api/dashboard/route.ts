import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    totalProducts,
    lowStockProducts,
    totalSalesMonth,
    totalOfficeSalesMonth,
    pendingExpenses,
    recentOnlineSales,
    recentOfficeSales,
    salesByChannel,
    topProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: prisma.product.fields.minStock } } }).catch(() =>
      prisma.product.findMany({ where: { isActive: true }, select: { stock: true, minStock: true } })
        .then(p => p.filter(x => x.stock <= x.minStock).length)
    ),
    prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true, netAmount: true },
      _count: true,
    }),
    prisma.officeSale.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { isPaid: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.officeSale.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: { select: { name: true } } },
    }),
    prisma.sale.groupBy({
      by: ["channel"],
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["productName"],
      where: {
        sale: { createdAt: { gte: monthStart, lte: monthEnd } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const onlineTotal = totalSalesMonth._sum.total || 0;
  const officeTotal = totalOfficeSalesMonth._sum.total || 0;
  const totalRevenue = onlineTotal + officeTotal;

  return NextResponse.json({
    stats: {
      totalProducts,
      lowStockProducts: typeof lowStockProducts === "number" ? lowStockProducts : 0,
      onlineSalesCount: totalSalesMonth._count,
      onlineSalesTotal: onlineTotal,
      officeSalesCount: totalOfficeSalesMonth._count,
      officeSalesTotal: officeTotal,
      totalRevenue,
      pendingExpensesAmount: pendingExpenses._sum.amount || 0,
      pendingExpensesCount: pendingExpenses._count,
    },
    recentOnlineSales,
    recentOfficeSales,
    salesByChannel,
    topProducts,
  });
}
