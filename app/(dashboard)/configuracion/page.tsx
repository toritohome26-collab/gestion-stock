"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Unlink } from "lucide-react";
import { useToast } from "@/lib/toast-context";

interface Integration {
  id?: string; platform: string; isActive: boolean;
  shopName?: string; lastSync?: string; expiresAt?: string;
}

export default function ConfiguracionPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [ml, setMl] = useState<Integration | null>(null);
  const [tn, setTn] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "ml_connected") toast("MercadoLibre conectado correctamente", "success");
    if (success === "tn_connected") toast("Tiendanube conectado correctamente", "success");
    if (error) toast(`Error de conexión: ${error}`, "error");

    fetch("/api/integrations/mercadolibre").then(r => r.json()).then(setMl);
    fetch("/api/integrations/tiendanube").then(r => r.json()).then(setTn);
  }, []);

  const mlRedirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/integrations/mercadolibre/callback`
    : process.env.NEXT_PUBLIC_ML_REDIRECT_URI || "";
  const mlAuthUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${process.env.NEXT_PUBLIC_ML_APP_ID || ""}&redirect_uri=${encodeURIComponent(mlRedirectUri)}`;

  const tnAuthUrl = `https://www.tiendanube.com/apps/${process.env.NEXT_PUBLIC_TN_APP_ID || "TU_APP_ID"}/authorize`;

  async function disconnect(platform: string) {
    if (!confirm(`¿Desconectar ${platform}?`)) return;
    await fetch(`/api/integrations/${platform.toLowerCase()}`, { method: "DELETE" });
    toast(`${platform} desconectado`, "success");
    if (platform === "mercadolibre") fetch("/api/integrations/mercadolibre").then(r => r.json()).then(setMl);
    else fetch("/api/integrations/tiendanube").then(r => r.json()).then(setTn);
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const r = await fetch("/api/integrations/sync", { method: "POST" });
      const data = await r.json();
      toast(`Sincronizado: ${data.newSales} nuevas ventas`, "success");
      fetch("/api/integrations/mercadolibre").then(r => r.json()).then(setMl);
      fetch("/api/integrations/tiendanube").then(r => r.json()).then(setTn);
    } catch {
      toast("Error al sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  }

  function IntegrationCard({ title, logo, integration, authUrl, platform }: any) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            {integration?.isActive ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Desconectado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration?.isActive ? (
            <>
              <div className="rounded-lg bg-green-50 p-3 text-sm space-y-1">
                <p><span className="font-medium">Tienda:</span> {integration.shopName}</p>
                {integration.lastSync && (
                  <p><span className="font-medium">Última sync:</span> {formatDateTime(integration.lastSync)}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                  Sincronizar
                </Button>
                <Button variant="outline" size="sm" onClick={() => disconnect(platform)} className="text-red-500 hover:text-red-700">
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Conectá tu cuenta para importar ventas automáticamente y descontar el stock.
              </p>
              <Button asChild>
                <a href={authUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Conectar {title}
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Header title="Configuración" subtitle="Conexión con tiendas online" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <IntegrationCard
            title="MercadoLibre"
            platform="mercadolibre"
            integration={ml}
            authUrl={mlAuthUrl}
          />
          <IntegrationCard
            title="Tiendanube"
            platform="tiendanube"
            integration={tn}
            authUrl={tnAuthUrl}
          />
        </div>

        {(ml?.isActive || tn?.isActive) && (
          <Card>
            <CardHeader><CardTitle>Sincronización manual</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">
                Las ventas se sincronizan automáticamente mediante webhooks. Si necesitás forzar una sincronización, usá el botón de abajo.
              </p>
              <Button onClick={syncNow} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar todas las tiendas"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Webhook URLs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Configurá estas URLs en los paneles de desarrollador de cada plataforma para recibir notificaciones en tiempo real:
            </p>
            <div className="space-y-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">MercadoLibre (Notificaciones)</p>
                <code className="text-sm text-blue-700">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhooks/mercadolibre
                </code>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Tiendanube (Webhooks)</p>
                <code className="text-sm text-blue-700">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhooks/tiendanube
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
