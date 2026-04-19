"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatXAF } from "@/lib/utils";

const mockOrders = [
  { id: "#ORD-091", product: "Manioc frais 2kg + Plantains verts", amount: 5500, status: "delivered", date: "15/04/2026" },
  { id: "#ORD-087", product: "Beurre de karité 500g", amount: 8000, status: "shipped", date: "12/04/2026" },
  { id: "#ORD-082", product: "Robe en tissu Wax africain", amount: 28000, status: "confirmed", date: "08/04/2026" },
];

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabel: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default function ComptePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-gray-800 mb-6">Mon compte</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#00A550] to-[#007A3D] rounded-full flex items-center justify-center text-2xl font-black text-white mx-auto mb-3">
              MN
            </div>
            <h2 className="font-bold text-gray-800">Marie Nzamba</h2>
            <p className="text-sm text-gray-500">+241 01 23 45 67</p>
            <p className="text-xs text-gray-400">📍 Libreville</p>
          </div>
          <nav className="space-y-1 mt-4">
            {[
              ["👤", "Mon profil", "/compte/profil"],
              ["📦", "Mes commandes", "/compte/commandes"],
              ["❤️", "Mes favoris", "/compte/favoris"],
              ["📍", "Mes adresses", "/compte/adresses"],
              ["🏪", "Devenir vendeur", "/vendor/register"],
              ["🔒", "Sécurité", "/compte/securite"],
            ].map(([icon, label, href]) => (
              <Link key={label as string} href={href as string}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#E8F7EE] hover:text-[#00A550] text-gray-600 text-sm transition-colors">
                <span>{icon}</span>
                <span className="font-medium">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t">
            <button className="w-full text-center text-sm text-red-500 hover:text-red-700 py-2">
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Commandes récentes</h3>
            <div className="space-y-3">
              {mockOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-500">{o.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[o.status]}`}>
                        {statusLabel[o.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{o.product}</p>
                    <p className="text-xs text-gray-400">{o.date}</p>
                  </div>
                  <span className="font-bold text-[#00A550] flex-shrink-0">{formatXAF(o.amount)}</span>
                </div>
              ))}
            </div>
            <Link href="/compte/commandes" className="block mt-4 text-center text-sm text-[#00A550] font-semibold hover:underline">
              Voir toutes mes commandes →
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "📦", value: "8", label: "Commandes" },
              { icon: "❤️", value: "12", label: "Favoris" },
              { icon: "⭐", value: "3", label: "Avis donnés" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="font-black text-xl text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Become vendor CTA */}
          <div className="bg-gradient-to-br from-[#FFD100] to-[#FF8C00] rounded-2xl p-5 text-white">
            <h4 className="font-black text-lg mb-1">Devenez vendeur ! 🏪</h4>
            <p className="text-white/80 text-sm mb-4">
              Vendez vos produits dans tout le Gabon. Créez votre boutique gratuitement.
            </p>
            <Link href="/vendor/register">
              <Button variant="ghost" size="sm" className="bg-white text-[#FF8C00] hover:bg-white/90 font-bold">
                Créer ma boutique →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
