"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Calculator, TrendingUp, TrendingDown } from "lucide-react";

// Tarifas ML Argentina vigentes (pueden variar)
const ML_FEES: Record<string, { commission: number; label: string }> = {
  CLASSICO: { commission: 0.12, label: "Clásico (12%)" },
  PREMIUM: { commission: 0.18, label: "Premium (18%)" },
  GRATIS: { commission: 0, label: "Gratuito (0%)" },
};

const SHIPPING_OPTIONS = [
  { value: "FREE", label: "Envío gratis (a cargo del vendedor)", cost: 0 },
  { value: "BUYER", label: "Envío a cargo del comprador", cost: 0 },
  { value: "CUSTOM", label: "Costo personalizado" },
];

export default function CalculadoraPage() {
  const [listingType, setListingType] = useState("PREMIUM");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [shippingType, setShippingType] = useState("FREE");
  const [customShipping, setCustomShipping] = useState("");
  const [extraCosts, setExtraCosts] = useState("");
  const [iva, setIva] = useState(false);
  const [currency, setCurrency] = useState("ARS");

  const price = parseFloat(salePrice) || 0;
  const cost = parseFloat(costPrice) || 0;
  const shipping = shippingType === "CUSTOM" ? parseFloat(customShipping) || 0 : 0;
  const extras = parseFloat(extraCosts) || 0;

  const feeRate = ML_FEES[listingType]?.commission || 0;
  const commission = price * feeRate;
  const ivaAmount = iva ? commission * 0.21 : 0;
  const totalFees = commission + ivaAmount + shipping + extras;
  const netRevenue = price - totalFees;
  const grossProfit = netRevenue - cost;
  const marginPct = price > 0 ? ((grossProfit / price) * 100).toFixed(1) : "0";
  const markupPct = cost > 0 ? ((grossProfit / cost) * 100).toFixed(1) : "0";
  const breakEvenPrice = cost > 0 ? (cost + shipping + extras) / (1 - feeRate - (iva ? feeRate * 0.21 : 0)) : 0;

  const fmt = (n: number) => formatCurrency(n, currency);

  return (
    <div>
      <Header title="Calculadora MercadoLibre" subtitle="Simulá costos y comisiones antes de publicar" />
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Datos de la publicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS - Pesos</SelectItem>
                      <SelectItem value="USD">USD - Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tipo de publicación</Label>
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ML_FEES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Precio de venta ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Costo del producto ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Envío</Label>
                <Select value={shippingType} onValueChange={setShippingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIPPING_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shippingType === "CUSTOM" && (
                  <Input
                    type="number"
                    placeholder="Costo del envío ($)"
                    value={customShipping}
                    onChange={e => setCustomShipping(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label>Otros costos (empaque, etiquetas, etc.)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={extraCosts}
                  onChange={e => setExtraCosts(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="iva"
                  checked={iva}
                  onChange={e => setIva(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="iva">Soy responsable inscripto (IVA 21% sobre comisión)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio de venta</span>
                    <span className="font-medium">{fmt(price)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Comisión ML ({(feeRate * 100).toFixed(0)}%)</span>
                    <span>— {fmt(commission)}</span>
                  </div>
                  {iva && (
                    <div className="flex justify-between text-red-500">
                      <span>IVA sobre comisión (21%)</span>
                      <span>— {fmt(ivaAmount)}</span>
                    </div>
                  )}
                  {shipping > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Envío</span>
                      <span>— {fmt(shipping)}</span>
                    </div>
                  )}
                  {extras > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Otros costos</span>
                      <span>— {fmt(extras)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Ingreso neto</span>
                    <span className={netRevenue >= 0 ? "text-green-600" : "text-red-600"}>{fmt(netRevenue)}</span>
                  </div>
                  {cost > 0 && (
                    <>
                      <div className="flex justify-between text-red-500">
                        <span>Costo del producto</span>
                        <span>— {fmt(cost)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold text-base">
                        <span>Ganancia bruta</span>
                        <span className={grossProfit >= 0 ? "text-green-700" : "text-red-700"}>{fmt(grossProfit)}</span>
                      </div>
                    </>
                  )}
                </div>

                {price > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg p-4 text-center ${parseFloat(marginPct) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {parseFloat(marginPct) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <p className="text-xs font-medium text-gray-600">Margen</p>
                      </div>
                      <p className={`text-2xl font-bold ${parseFloat(marginPct) >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {marginPct}%
                      </p>
                    </div>
                    {cost > 0 && (
                      <div className={`rounded-lg p-4 text-center ${parseFloat(markupPct) >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                        <p className="text-xs font-medium text-gray-600 mb-1">Markup</p>
                        <p className={`text-2xl font-bold ${parseFloat(markupPct) >= 0 ? "text-blue-700" : "text-red-700"}`}>
                          {markupPct}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {cost > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-blue-800">Precio mínimo para no perder</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{fmt(breakEvenPrice)}</p>
                  <p className="text-xs text-blue-600 mt-1">Con este precio ganás exactamente $0 después de todos los costos</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
