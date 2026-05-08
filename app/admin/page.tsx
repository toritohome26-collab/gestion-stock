"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, ToggleLeft, ToggleRight, Send, RefreshCw, Code2, X, CheckCircle } from "lucide-react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [msgOrg, setMsgOrg] = useState<any | null>(null);
  const [msgText, setMsgText] = useState("");
  const [toast, setToast] = useState("");

  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && !isSuperAdmin) { router.push("/dashboard"); return; }
    if (status === "authenticated" && isSuperAdmin) fetchData();
  }, [status, isSuperAdmin]);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/admin/organizations");
    if (res.ok) {
      const data = await res.json();
      setOrgs(data.orgs || []);
    }
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
    showToast(org.isActive ? "Organización desactivada" : "Organización activada");
  }

  async function sendAlert() {
    if (!msgOrg || !msgText.trim()) return;
    setUpdating(msgOrg.id);
    await fetch(`/api/admin/organizations/${msgOrg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertMessage: msgText.trim() }),
    });
    setMsgOrg(null);
    setMsgText("");
    await fetchData();
    setUpdating(null);
    showToast("Mensaje enviado");
  }

  async function clearAlert(org: any) {
    setUpdating(org.id);
    await fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertMessage: null }),
    });
    await fetchData();
    setUpdating(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Modal enviar mensaje */}
      {msgOrg && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Enviar alerta a <span className="text-blue-400">{msgOrg.name}</span></h3>
              <button onClick={() => { setMsgOrg(null); setMsgText(""); }} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Escribí el mensaje que va a ver esta organización en su dashboard..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={sendAlert}
                disabled={!msgText.trim() || updating === msgOrg.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="h-4 w-4" />
                Enviar alerta
              </button>
              <button onClick={() => { setMsgOrg(null); setMsgText(""); }} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Panel del Desarrollador</h1>
            <p className="text-xs text-gray-400">{orgs.length} organizaciones registradas</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Organización</th>
                <th className="text-left px-4 py-3">Registrado</th>
                <th className="text-left px-4 py-3">Alerta activa</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orgs.map((org) => (
                <tr key={org.id} className={`hover:bg-gray-800/40 transition-colors ${!org.isActive ? "opacity-50" : ""}`}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{org.name}</p>
                    <p className="text-xs text-gray-500">{org.email}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-400">
                    {new Date(org.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-4">
                    {org.alertMessage ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-lg max-w-xs truncate">
                          {org.alertMessage}
                        </span>
                        <button onClick={() => clearAlert(org)} className="text-gray-600 hover:text-red-400 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
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
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => { setMsgOrg(org); setMsgText(org.alertMessage || ""); }}
                      className="flex items-center gap-1.5 mx-auto text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 hover:border-blue-400/60 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Mensaje
                    </button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No hay organizaciones registradas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
