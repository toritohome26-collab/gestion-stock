"use client";
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

export function AlertBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/alert")
      .then((r) => r.json())
      .then((d) => setMessage(d.alertMessage || null))
      .catch(() => {});
  }, []);

  if (!message || dismissed) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center gap-3">
      <Bell className="h-4 w-4 text-yellow-600 shrink-0" />
      <p className="text-sm text-yellow-800 flex-1">{message}</p>
      <button onClick={() => setDismissed(true)} className="text-yellow-600 hover:text-yellow-800 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
