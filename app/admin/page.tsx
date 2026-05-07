"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, Package, TrendingUp, ShoppingCart,
  ToggleLeft, ToggleRight, ChevronDown, RefreshCw, Code2,
} from "lucide-react";

const PLANS = ["free", "pro", "enterprise", "system"];

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && !isSuperAdmin) { router.push("/dashboard"); return; }
    if (status === "authenticated" && isSuperAdmin) fetchData();
  }, [status, isSuperAdmin]);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/admin/organizations");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function toggleActive(org: any) {
    setUpdating(org.id);
    await fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !org.isActive }),
    });
    await fetchData();
    setUpdating(null);
  }

  async function changePlan(org: any, plan: string) {
    setUpdating(org.id);
    await fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    await fetchData();
    setUpdating(null);
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Cargando panel...
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  const { orgs = [], stats = {} } = data || {};

  const planColor: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    pro: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
    system: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Panel del Desarrollador</h1>
            <p className="text-xs text-gray-400">GestiónStock · Super Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-1">
            {(session?.user as any)?.email}
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Organizaciones" value={stats.totalOrgs || 0} icon={Building2} color="bg-blue-600" />
          <StatCard label="Activas" value={stats.activeOrgs || 0} icon={ToggleRight} color="bg-green-600" />
          <StatCard label="Usuarios totales" value={stats.totalUsers || 0} icon={Users} color="bg-purple-600" />
          <StatCard label="Productos totales" value={stats.totalProducts || 0} icon={Package} color="bg-orange-600" />
        </div>

        {/* Tabla de organizaciones */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Organizaciones ({orgs.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Organización</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-center px-4 py-3">Usuarios</th>
                  <th className="text-center px-4 py-3">Productos</th>
                  <th className="text-right px-4 py-3">Ventas mes</th>
                  <th className="text-left px-4 py-3">Integraciones</th>
                  <th className="text-left px-4 py-3">Registrado</th>
                  <th className="text-center px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orgs.map((org: any) => (
                  <tr key={org.id} className={`hover:bg-gray-800/50 transition-colors ${!org.isActive ? "opacity-50" : ""}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{org.name}</p>
                        <p className="text-xs text-gray-500">{org.email}</p>
                        <p className="text-xs text-gray-600 font-mono">{org.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="relative">
                        <select
                          value={org.plan}
                          onChange={(e) => changePlan(org, e.target.value)}
                          disabled={updating === org.id}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 ${planColor[org.plan] || "bg-gray-100 text-gray-700"}`}
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown className="h-3 w-3 absolute right-1 top-1.5 pointer-events-none text-current opacity-60" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white font-medium">{org._count.users}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white font-medium">{org._count.products}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div>
                        <p className="text-white font-medium">
                          ${((org.salesMonth?.total || 0) + (org.officeSalesMonth?.total || 0)).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(org.salesMonth?.count || 0) + (org.officeSalesMonth?.count || 0)} ventas
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {org.integrations?.length === 0 && (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                        {org.integrations?.map((p: string) => (
                          <span key={p} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">
                            {p === "MERCADOLIBRE" ? "ML" : "TN"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400">
                      {new Date(org.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(org)}
                        disabled={updating === org.id}
                        className="flex items-center gap-1.5 mx-auto text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {org.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-green-400" />
                            <span className="text-green-400">Activa</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-red-400" />
                            <span className="text-red-400">Inactiva</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No hay organizaciones registradas aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info técnica */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-gray-400" />
            Info técnica
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Base de datos", value: "PostgreSQL · Render" },
              { label: "Framework", value: "Next.js 14 · App Router" },
              { label: "ORM", value: "Prisma 7 · PG Adapter" },
              { label: "Auth", value: "NextAuth · JWT" },
              { label: "Deploy", value: "Render.com · Free" },
              { label: "ML App ID", value: process.env.NEXT_PUBLIC_ML_APP_ID || "6939300824223870" },
              { label: "Multi-tenant", value: "Sí · organizationId" },
              { label: "Webhooks", value: "ML + Tiendanube" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-gray-200 font-mono text-xs">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
