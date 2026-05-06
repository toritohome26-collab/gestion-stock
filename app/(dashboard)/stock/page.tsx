"use client";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { useSession } from "next-auth/react";

interface Product {
  id: string; sku: string; name: string; description?: string;
  categoryId?: string; costPrice: number; salePrice: number;
  stock: number; minStock: number; isActive: boolean;
  category?: { id: string; name: string };
}

interface Category { id: string; name: string }

const emptyProduct = {
  sku: "", name: "", description: "", categoryId: "",
  costPrice: "", salePrice: "", stock: "", minStock: "5",
};

export default function StockPage() {
  const { data: session } = useSession();
  const permissions: string[] = (session?.user as any)?.permissions || [];
  const canCreate = permissions.includes("stock.create");
  const canEdit = permissions.includes("stock.edit");
  const canDelete = permissions.includes("stock.delete");

  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCat !== "all") params.set("categoryId", filterCat);
    if (lowStock) params.set("lowStock", "true");
    const r = await fetch(`/api/products?${params}`);
    const data = await r.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, filterCat, lowStock]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
  }, []);

  function openCreate() {
    setEditProduct(null);
    setForm({ ...emptyProduct });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      sku: p.sku, name: p.name, description: p.description || "",
      categoryId: p.categoryId || "",
      costPrice: p.costPrice.toString(), salePrice: p.salePrice.toString(),
      stock: p.stock.toString(), minStock: p.minStock.toString(),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.sku) { toast("Nombre y SKU son requeridos", "error"); return; }
    setSaving(true);
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const method = editProduct ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stockReason: "Edición manual" }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast(editProduct ? "Producto actualizado" : "Producto creado", "success");
      setDialogOpen(false);
      loadProducts();
    } catch (e: any) {
      toast(e.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    toast("Producto eliminado", "success");
    loadProducts();
  }

  const margin = (p: Product) =>
    p.costPrice > 0 ? (((p.salePrice - p.costPrice) / p.costPrice) * 100).toFixed(0) : "—";

  return (
    <div>
      <Header title="Stock" subtitle="Gestión de inventario y productos" />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={lowStock ? "default" : "outline"}
              size="sm"
              onClick={() => setLowStock(!lowStock)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Stock bajo
            </Button>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo producto
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando...</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay productos</p>
                {canCreate && <Button className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Crear primero</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-gray-500">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        {p.category ? <Badge variant="secondary">{p.category.name}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(p.costPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.salePrice)}</TableCell>
                      <TableCell className="text-right text-green-600">{margin(p)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={p.stock === 0 ? "destructive" : p.stock <= p.minStock ? "warning" : "success"}
                        >
                          {p.stock} uds
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={form.categoryId || "none"} onValueChange={v => setForm({...form, categoryId: v === "none" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Costo ($)</Label>
                <Input type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Precio venta ($)</Label>
                <Input type="number" value={form.salePrice} onChange={e => setForm({...form, salePrice: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Stock actual</Label>
                <Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Stock mínimo</Label>
                <Input type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
