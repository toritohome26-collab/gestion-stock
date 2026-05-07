import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { TrendingUp, Package, ShoppingCart, DollarSign, Users, BarChart2 } from "lucide-react";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">GestiónStock</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Ingresar
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Gestioná tu negocio<br />
          <span className="text-blue-600">en un solo lugar</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Control de stock, ventas de MercadoLibre y Tiendanube, gastos, ventas presenciales y más. Todo sincronizado en tiempo real.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Todo lo que necesitás</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Package, title: "Control de Stock", desc: "Inventario en tiempo real con alertas de stock mínimo y movimientos automáticos." },
            { icon: ShoppingCart, title: "MercadoLibre & Tiendanube", desc: "Sincronización automática de órdenes y descuento de stock desde tus tiendas online." },
            { icon: DollarSign, title: "Finanzas", desc: "Registro de gastos, deudas y pagos. Control total de tu flujo de caja." },
            { icon: BarChart2, title: "Dashboard", desc: "Resumen ejecutivo con ventas del mes, productos más vendidos y alertas." },
            { icon: ShoppingCart, title: "Ventas Presenciales", desc: "Point of sale para registrar ventas en tu local con descuento automático de stock." },
            { icon: Users, title: "Usuarios y Permisos", desc: "Agregá tu equipo con roles y permisos granulares por módulo." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-blue-600 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Listo para empezar?</h2>
          <p className="text-blue-100 mb-8 text-lg">Creá tu cuenta en segundos, sin tarjeta de crédito.</p>
          <Link
            href="/register"
            className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors inline-block"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} GestiónStock. Todos los derechos reservados.
      </footer>
    </div>
  );
}
