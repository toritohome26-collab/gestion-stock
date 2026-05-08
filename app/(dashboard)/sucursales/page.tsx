"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MapPin, Phone, Plus, Pencil, Trash2, Star, Users, Package, ShoppingCart, X, Check } from "lucide-react";

export default function SucursalesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; branch?: any }>({ open: false });
  const [form, setForm] = useState({ name: "", address: "", phone: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchBranches(); }, []);

  async function fetchBranches() {
    setLoading(true);
    const res = await fetch("/api/branches");
    if (res.ok) setBranches(await res.json());
    setLoading(false);
  }

  function openCreate() {
    setForm({ name: "", address: "", phone: "", isDefault: false });
    setError("");
    setModal({ open: true });
  }

  function openEdit(branch: any) {
    setForm({ name: branch.name, address: branch.address || "", phone: branch.phone || "", isDefault: branch.isDefault });
    setError("");
    setModal({ open: true, branch });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    setError("");

    const url = modal.branch ? `/api/branches/${modal.branch.id}` : "/api/branches";
    const method = modal.branch ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Error al guardar"); setSaving(false); return; }
    setModal({ open: false });
    await fetchBranches();
    setSaving(false);
  }

  async function handleDelete(branch: any) {
    if (!confirm(`¿Eliminar "${branch.name}"? Se desvinculará de ventas y productos.`)) return;
    await fetch(`/api/branches/${branch.id}`, { method: "DELETE" });
    await fetchBranches();
  }

  async function setDefault(branch: any) {
    await fetch(`/api/branches/${branch.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await fetchBranches();
  }

  return (
    <div>
      <Header title="Sucursales" subtitle="Gestioná tus puntos de venta y locales" />

      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 text-lg">
                {modal.branch ? "Editar sucursal" : "Nueva sucursal"}
              </h3>
              <button onClick={() => setModal({ open: false })} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Local Centro, Depósito Norte"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Av. Corrientes 1234, CABA"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="011 4444-5555"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Sucursal principal</span>
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => setModal({ open: false })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-end mb-6">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva sucursal
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No tenés sucursales creadas</p>
            <p className="text-sm mt-1">Creá tu primer local o punto de venta</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <div key={branch.id} className={`bg-white rounded-xl border p-5 shadow-sm ${!branch.isActive ? "opacity-60" : ""} ${branch.isDefault ? "border-blue-200 ring-1 ring-blue-200" : "border-gray-200"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${branch.isDefault ? "bg-blue-600" : "bg-gray-100"}`}>
                      <MapPin className={`h-5 w-5 ${branch.isDefault ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                      {branch.isDefault && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <Star className="h-3 w-3" /> Principal
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!branch.isDefault && (
                      <button onClick={() => setDefault(branch)} title="Hacer principal" className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(branch)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!branch.isDefault && (
                      <button onClick={() => handleDelete(branch)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {branch.address && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3" /> {branch.address}
                  </p>
                )}
                {branch.phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <Phone className="h-3 w-3" /> {branch.phone}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{branch._count?.users || 0}</p>
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Users className="h-3 w-3" />Usuarios</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{branch._count?.products || 0}</p>
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Package className="h-3 w-3" />Productos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{branch._count?.officeSales || 0}</p>
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><ShoppingCart className="h-3 w-3" />Ventas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
