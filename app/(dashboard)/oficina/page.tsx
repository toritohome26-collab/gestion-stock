"use client";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, Trash2, Search, ShoppingBag, Store } from "lucide-react";
import { useToast } from "@/lib/toast-context";

interface Product {
  id: string; name: string; sku: string; salePrice: number; stock: number;
}
interface CartItem {
  productId: string; productName: string; sku: string;
  quantity: number; unitPrice: number; stock: number;
}
interface OfficeSale {
  id: string; saleNumber: number; paymentMethod: string; total: number;
  subtotal: number; discount: number; createdAt: string;
  user?: { name: string };
  items: Array<{ id: string; productName: string; quantity: number; unitPrice: number; total: number }>;
}

export default function OficinaPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<OfficeSale[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"pos" | "history">("pos");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(data => setProducts(Array.isArray(data) ? data : []));
    loadSales();
  }, []);

  async function loadSales() {
    const r = await fetch("/api/office-sales");
    const data = await r.json();
    setSales(Array.isArray(data) ? data : []);
  }

  const filtered = products.filter(p =>
    p.stock > 0 &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) { toast("No hay más stock disponible", "error"); return prev; }
        return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: p.id, productName: p.name, sku: p.sku, quantity: 1, unitPrice: p.salePrice, stock: p.stock }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return; }
    const item = cart.find(i => i.productId === productId);
    if (item && qty > item.stock) { toast("Sin stock suficiente", "error"); return; }
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  const subtotal = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = subtotal - discountAmt;

  async function handleSale() {
    if (cart.length === 0) { toast("El carrito está vacío", "error"); return; }
    if (total < 0) { toast("El descuento no puede superar el subtotal", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/office-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, paymentMethod, discount: discountAmt, notes }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      toast(`Venta #${json.saleNumber} registrada: ${formatCurrency(json.total)}`, "success");
      setCart([]);
      setDiscount("");
      setNotes("");
      fetch("/api/products").then(r => r.json()).then(data => setProducts(Array.isArray(data) ? data : []));
      loadSales();
    } catch (e: any) {
      toast(e.message || "Error al registrar la venta", "error");
    } finally {
      setSaving(false);
    }
  }

  const paymentLabels: Record<string, string> = {
    CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia", OTHER: "Otro",
  };

  return (
    <div>
      <Header title="Ventas en Oficina" subtitle="Punto de venta presencial" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button variant={view === "pos" ? "default" : "outline"} onClick={() => setView("pos")}>
            <Store className="h-4 w-4 mr-2" />Nueva venta
          </Button>
          <Button variant={view === "history" ? "default" : "outline"} onClick={() => setView("history")}>
            <ShoppingBag className="h-4 w-4 mr-2" />Historial
          </Button>
        </div>

        {view === "pos" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Products */}
            <div className="lg:col-span-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar producto por nombre o SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-blue-600">{formatCurrency(p.salePrice)}</span>
                      <Badge variant={p.stock <= 3 ? "warning" : "success"} className="text-xs">
                        {p.stock} uds
                      </Badge>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-3 py-8 text-center text-gray-400 text-sm">
                    No hay productos con stock disponible
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Carrito ({cart.length} items)</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">Hacé clic en un producto para agregarlo</p>
                  ) : (
                    <>
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {cart.map(item => (
                          <li key={item.productId} className="flex items-center gap-2 text-sm">
                            <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <span className="flex-1 truncate">{item.productName}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                                className="h-5 w-5 rounded border text-center leading-5 hover:bg-gray-100">−</button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                                className="h-5 w-5 rounded border text-center leading-5 hover:bg-gray-100">+</button>
                            </div>
                            <span className="font-medium w-20 text-right">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Descuento $</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={discount}
                            onChange={e => setDiscount(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex justify-between text-base font-bold">
                          <span>TOTAL</span>
                          <span className="text-blue-600">{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Método de pago</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Efectivo</SelectItem>
                            <SelectItem value="CARD">Tarjeta</SelectItem>
                            <SelectItem value="TRANSFER">Transferencia</SelectItem>
                            <SelectItem value="OTHER">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Notas (opcional)"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button className="w-full" onClick={handleSale} disabled={saving || cart.length === 0}>
                          {saving ? "Procesando..." : `Confirmar venta ${formatCurrency(total)}`}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {sales.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay ventas registradas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Descuento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <>
                        <TableRow key={s.id} className="cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                          <TableCell className="font-semibold">#{s.saleNumber}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(s.createdAt)}</TableCell>
                          <TableCell className="text-sm">{s.user?.name || "—"}</TableCell>
                          <TableCell><Badge variant="secondary">{paymentLabels[s.paymentMethod] || s.paymentMethod}</Badge></TableCell>
                          <TableCell className="text-right">{formatCurrency(s.subtotal)}</TableCell>
                          <TableCell className="text-right text-red-500">{s.discount > 0 ? `— ${formatCurrency(s.discount)}` : "—"}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(s.total)}</TableCell>
                        </TableRow>
                        {expanded === s.id && (
                          <TableRow key={`${s.id}-d`} className="bg-gray-50">
                            <TableCell colSpan={7} className="p-4">
                              <ul className="space-y-1 text-sm">
                                {s.items.map(item => (
                                  <li key={item.id} className="flex justify-between">
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
        )}
      </div>
    </div>
  );
}
