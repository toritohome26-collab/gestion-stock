"use client";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RefreshCw, ShoppingCart } from "lucide-react";
import { useToast } from "@/lib/toast-context";

interface Sale {
  id: string; channel: string; externalId?: string; status: string;
  buyerName?: string; total: number; netAmount: number; commission: number;
  shipping: number; currency: string; createdAt: string;
  items: Array<{ id: string; productName: string; quantity: number; unitPrice: number; total: number }>;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmado", paid: "Pagado",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
};
const statusVariants: Record<string, any> = {
  pending: "warning", confirmed: "info", paid: "success",
  shipped: "info", delivered: "success", cancelled: "destructive",
};
const channelLabels: Record<string, string> = {
  MERCADOLIBRE: "MercadoLibre", TIENDANUBE: "Tiendanube",
};
const channelColors: Record<string, string> = {
  MERCADOLIBRE: "bg-yellow-100 text-yellow-800",
  TIENDANUBE: "bg-blue-100 text-blue-800",
};

export default function VentasPage() {
  const { toast } = useToast();
  const [data, setData] = useState<{ sales: Sale[]; total: number }>({ sales: [], total: 0 });
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    const params = new URLSearchParams();
    if (channel !== "all") params.set("channel", channel);
    if (status !== "all") params.set("status", status);
    const r = await fetch(`/api/sales?${params}`);
    const json = await r.json();
    setData(json);
    setLoading(false);
  }, [channel, status]);

  useEffect(() => { loadSales(); }, [loadSales]);

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await fetch("/api/integrations/sync", { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      toast(`Sincronización completada: ${json.newSales} nuevas ventas`, "success");
      loadSales();
    } catch (e: any) {
      toast(e.message || "Error al sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  }

  const totals = data.sales.reduce(
    (acc, s) => ({ total: acc.total + s.total, net: acc.net + s.netAmount, comm: acc.comm + s.commission }),
    { total: 0, net: 0, comm: 0 }
  );

  return (
    <div>
      <Header title="Ventas Online" subtitle="MercadoLibre y Tiendanube" />
      <div className="p-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Total facturado</p>
            <p className="text-xl font-bold">{formatCurrency(totals.total)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Neto recibido</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.net)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Comisiones</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(totals.comm)}</p>
          </CardContent></Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los canales</SelectItem>
                <SelectItem value="MERCADOLIBRE">MercadoLibre</SelectItem>
                <SelectItem value="TIENDANUBE">Tiendanube</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar ahora"}
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando...</div>
            ) : data.sales.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay ventas. Conectá tus tiendas en Configuración.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>ID externo</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sales.map(s => (
                    <>
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      >
                        <TableCell>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${channelColors[s.channel] || ""}`}>
                            {channelLabels[s.channel] || s.channel}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-400">{s.externalId || "—"}</TableCell>
                        <TableCell>{s.buyerName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[s.status] || "secondary"}>
                            {statusLabels[s.status] || s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(s.total)}</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(s.commission)}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">{formatCurrency(s.netAmount)}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDateTime(s.createdAt)}</TableCell>
                      </TableRow>
                      {expanded === s.id && (
                        <TableRow key={`${s.id}-detail`} className="bg-gray-50">
                          <TableCell colSpan={8} className="p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">Productos:</p>
                            <ul className="space-y-1">
                              {s.items.map(item => (
                                <li key={item.id} className="flex justify-between text-sm">
                                  <span>{item.quantity}x {item.productName}</span>
                                  <span className="font-medium">{formatCurrency(item.total)}</span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
