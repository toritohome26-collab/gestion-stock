"use client";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, CheckCircle, Trash2, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { useSession } from "next-auth/react";

const CATEGORIES = ["GENERAL", "PROVEEDOR", "ENVÍOS", "PUBLICIDAD", "IMPUESTOS", "SERVICIOS", "SUELDOS", "OTRO"];

interface Expense {
  id: string; category: string; description: string; amount: number;
  currency: string; date: string; dueDate?: string; isPaid: boolean;
  paidAt?: string; vendor?: string; notes?: string;
  payments: Array<{ id: string; amount: number; date: string; method: string }>;
}

const empty = {
  category: "GENERAL", description: "", amount: "",
  currency: "ARS", date: new Date().toISOString().split("T")[0],
  dueDate: "", vendor: "", notes: "", isPaid: false,
};

export default function FinanzasPage() {
  const { data: session } = useSession();
  const permissions: string[] = (session?.user as any)?.permissions || [];
  const canCreate = permissions.includes("finances.create");
  const canEdit = permissions.includes("finances.edit");
  const canDelete = permissions.includes("finances.delete");

  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === "pending") params.set("isPaid", "false");
    if (filter === "paid") params.set("isPaid", "true");
    const r = await fetch(`/api/expenses?${params}`);
    const data = await r.json();
    setExpenses(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditExpense(null);
    setForm({ ...empty, date: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  }

  function openEdit(e: Expense) {
    setEditExpense(e);
    setForm({
      category: e.category, description: e.description,
      amount: e.amount.toString(), currency: e.currency,
      date: e.date.split("T")[0],
      dueDate: e.dueDate ? e.dueDate.split("T")[0] : "",
      vendor: e.vendor || "", notes: e.notes || "",
      isPaid: e.isPaid,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.description || !form.amount) { toast("Descripción y monto son requeridos", "error"); return; }
    setSaving(true);
    try {
      const url = editExpense ? `/api/expenses/${editExpense.id}` : "/api/expenses";
      const method = editExpense ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, registerPayment: !editExpense?.isPaid && form.isPaid }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast(editExpense ? "Gasto actualizado" : "Gasto registrado", "success");
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast(e.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(e: Expense) {
    await fetch(`/api/expenses/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...e, isPaid: true, registerPayment: true, paymentMethod: "CASH" }),
    });
    toast("Marcado como pagado", "success");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    toast("Gasto eliminado", "success");
    load();
  }

  const totals = expenses.reduce(
    (acc, e) => ({
      pending: acc.pending + (e.isPaid ? 0 : e.amount),
      paid: acc.paid + (e.isPaid ? e.amount : 0),
    }),
    { pending: 0, paid: 0 }
  );

  return (
    <div>
      <Header title="Finanzas" subtitle="Gastos, deudas y pagos" />
      <div className="p-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-red-600 font-medium">Total pendiente de pago</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totals.pending)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-green-600 font-medium">Total pagado (filtro actual)</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.paid)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {(["all", "pending", "paid"] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : "Pagados"}
              </Button>
            ))}
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo gasto
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando...</div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay gastos registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map(e => (
                    <TableRow key={e.id} className={e.dueDate && !e.isPaid && new Date(e.dueDate) < new Date() ? "bg-red-50" : ""}>
                      <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell className="text-sm text-gray-500">{e.vendor || "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                      <TableCell className="text-sm">
                        {e.dueDate ? (
                          <span className={!e.isPaid && new Date(e.dueDate) < new Date() ? "text-red-600 font-semibold" : ""}>
                            {formatDate(e.dueDate)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={e.isPaid ? "success" : "warning"}>
                          {e.isPaid ? "Pagado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          {canEdit && !e.isPaid && (
                            <Button variant="ghost" size="sm" onClick={() => markPaid(e)} className="text-green-600 hover:text-green-700">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                              <span className="text-xs">✏️</span>
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editExpense ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={v => setForm({...form, currency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción *</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <Input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Vencimiento</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPaid"
                checked={form.isPaid as boolean}
                onChange={e => setForm({...form, isPaid: e.target.checked})}
                className="h-4 w-4"
              />
              <Label htmlFor="isPaid">Ya está pagado</Label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
