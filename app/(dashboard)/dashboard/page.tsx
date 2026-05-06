"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Package, ShoppingCart, Store, DollarSign,
  AlertTriangle, TrendingUp, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardData {
  stats: {
    totalProducts: number;
    lowStockProducts: number;
    onlineSalesCount: number;
    onlineSalesTotal: number;
    officeSalesCount: number;
    officeSalesTotal: number;
    totalRevenue: number;
    pendingExpensesAmount: number;
    pendingExpensesCount: number;
  };
  salesByChannel: Array<{ channel: string; _sum: { total: number }; _count: number }>;
  topProducts: Array<{ productName: string; _sum: { quantity: number; total: number } }>;
  recentOfficeSales: Array<any>;
}

function StatCard({ title, value, subtitle, icon: Icon, color, alert }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={`mt-1 text-2xl font-bold ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
            {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          </div>
          <div className={`rounded-full p-3 ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const channelLabels: Record<string, string> = {
  MERCADOLIBRE: "MercadoLibre",
  TIENDANUBE: "Tiendanube",
  OFFICE: "Oficina",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const { stats, salesByChannel, topProducts, recentOfficeSales } = data!;

  const chartData = [
    ...(salesByChannel || []).map((c) => ({
      name: channelLabels[c.channel] || c.channel,
      total: c._sum.total || 0,
      ventas: c._count,
    })),
    {
      name: "Oficina",
      total: stats.officeSalesTotal,
      ventas: stats.officeSalesCount,
    },
  ];

  return (
    <div>
      <Header title="Dashboard" subtitle={`Resumen del mes`} />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Facturación total"
            value={formatCurrency(stats.totalRevenue)}
            subtitle="Este mes"
            icon={TrendingUp}
            color="bg-blue-600"
          />
          <StatCard
            title="Ventas online"
            value={`${stats.onlineSalesCount} ventas`}
            subtitle={formatCurrency(stats.onlineSalesTotal)}
            icon={ShoppingCart}
            color="bg-green-600"
          />
          <StatCard
            title="Ventas oficina"
            value={`${stats.officeSalesCount} ventas`}
            subtitle={formatCurrency(stats.officeSalesTotal)}
            icon={Store}
            color="bg-purple-600"
          />
          <StatCard
            title="Gastos pendientes"
            value={formatCurrency(stats.pendingExpensesAmount)}
            subtitle={`${stats.pendingExpensesCount} sin pagar`}
            icon={DollarSign}
            color="bg-red-500"
            alert={stats.pendingExpensesCount > 0}
          />
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Productos activos"
            value={stats.totalProducts}
            icon={Package}
            color="bg-gray-600"
          />
          <StatCard
            title="Stock bajo"
            value={stats.lowStockProducts}
            subtitle="Requieren reposición"
            icon={AlertTriangle}
            color={stats.lowStockProducts > 0 ? "bg-yellow-500" : "bg-gray-400"}
            alert={stats.lowStockProducts > 0}
          />
        </div>

        {/* Chart + Top Products */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por canal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos más vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin ventas este mes</p>
              ) : (
                <ul className="space-y-3">
                  {topProducts?.map((p, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate max-w-[180px]">{p.productName}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(p._sum.total || 0)}</p>
                        <p className="text-xs text-gray-400">{p._sum.quantity} uds</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent office sales */}
        {recentOfficeSales?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Últimas ventas en oficina</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-gray-100">
                {recentOfficeSales.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">Venta #{s.saleNumber}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(s.createdAt)} — {s.user?.name || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(s.total)}</p>
                      <Badge variant="secondary" className="text-xs">{s.paymentMethod}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
