"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Store, DollarSign,
  Calculator, Users, Settings, TrendingUp, LogOut, Code2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/stock", label: "Stock", icon: Package, permission: "stock.view" },
  { href: "/ventas", label: "Ventas Online", icon: ShoppingCart, permission: "sales.view" },
  { href: "/oficina", label: "Venta Oficina", icon: Store, permission: "office.view" },
  { href: "/finanzas", label: "Finanzas", icon: DollarSign, permission: "finances.view" },
  { href: "/calculadora", label: "Calculadora ML", icon: Calculator, permission: "calculator.view" },
  { href: "/usuarios", label: "Usuarios", icon: Users, permission: "users.view" },
  { href: "/configuracion", label: "Configuración", icon: Settings, permission: "integrations.view" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const permissions: string[] = (session?.user as any)?.permissions || [];
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

  const visible = navItems.filter(
    (item) => !item.permission || permissions.includes(item.permission)
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-gray-900 text-white">
      <div className="flex items-center gap-3 border-b border-gray-700 p-6">
        <TrendingUp className="h-8 w-8 text-blue-400" />
        <div>
          <p className="font-bold text-white">GestiónStock</p>
          <p className="text-xs text-gray-400">Sistema de gestión</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {visible.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-700 p-4">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-green-400 hover:bg-gray-800 hover:text-green-300 transition-colors mb-1"
          >
            <Code2 className="h-5 w-5" />
            Panel Developer
          </Link>
        )}
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
