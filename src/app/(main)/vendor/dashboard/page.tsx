"use client";
import { useState } from "react";
import { formatXAF } from "@/lib/utils";
import { products } from "@/data/products";
import { vendors } from "@/data/vendors";
import { ProductCard } from "@/components/product/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const vendorProducts = products.filter((p) => p.vendorId === "v1");
const vendor = vendors[0];

const stats = [
  { label: "Ventes ce mois", value: "342 500 FCFA", change: "+12%", icon: "💰", color: "green" },
  { label: "Commandes", value: "28", change: "+5", icon: "📦", color: "blue" },
  { label: "Produits actifs", value: "12", change: "0", icon: "🛍️", color: "purple" },
  { label: "Avis clients", value: "4.8 ★", change: "+0.2", icon: "⭐", color: "yellow" },
];

const orders = [
  { id: "#ORD-001", client: "Marie Nzamba", product: "Manioc frais 2kg", amount: 5000, status: "delivered", date: "18/04/2026" },
  { id: "#ORD-002", client: "Paul Essono", product: "Huile de palme 1L", amount: 4500, status: "shipped", date: "17/04/2026" },
  { id: "#ORD-003", client: "Sophie Ondo", product: "Plantains verts 5kg", amount: 3000, status: "confirmed", date: "17/04/2026" },
  { id: "#ORD-004", client: "Jean-Claude Mba", product: "Poisson fumé 1kg", amount: 8500, status: "pending", date: "16/04/2026" },
  { id: "#ORD-005", client: "Alice Nkoghe", product: "Manioc frais 5kg", amount: 12500, status: "cancelled", date: "15/04/2026" },
];

type BadgeVariant = "green" | "yellow" | "red" | "gray" | "orange";
const statusColors: Record<string, BadgeVariant> = {
  pending: "yellow",
  confirmed: "green",
  shipped: "orange",
  delivered: "green",
  cancelled: "red",
};
const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default function VendorDashboard() {
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "analytics">("overview");

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Vendor header */}
        <div className="bg-gradient-to-r from-[#00A550] to-[#007A3D] rounded-3xl p-6 text-white mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={vendor.logo} alt={vendor.name} className="w-16 h-16 rounded-2xl border-2 border-white/30" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black">{vendor.name}</h1>
                  {vendor.verified && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">✓ Vérifié</span>}
                </div>
                <p className="text-white/80 text-sm">📍 {vendor.city} · Membre depuis {new Date(vendor.joinedAt).getFullYear()}</p>
                <p className="text-white/70 text-xs mt-0.5">⭐ {vendor.rating} · {vendor.reviewCount} avis · {vendor.productCount} produits</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm">+ Ajouter un produit</Button>
              <Button variant="ghost" size="sm" className="text-white border border-white/30 hover:bg-white/20">Voir ma boutique</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          {[
            { id: "overview", label: "📊 Vue d'ensemble" },
            { id: "products", label: "🛍️ Produits" },
            { id: "orders", label: "📦 Commandes" },
            { id: "analytics", label: "📈 Analytiques" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t.id ? "bg-[#00A550] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs font-semibold text-[#00A550] bg-[#E8F7EE] px-2 py-0.5 rounded-full">{s.change}</span>
                  </div>
                  <p className="text-xl font-black text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="font-bold text-gray-800">Commandes récentes</h2>
                <button onClick={() => setTab("orders")} className="text-sm text-[#00A550] font-semibold hover:underline">Voir tout</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Commande</th>
                      <th className="px-5 py-3 text-left">Client</th>
                      <th className="px-5 py-3 text-left">Produit</th>
                      <th className="px-5 py-3 text-right">Montant</th>
                      <th className="px-5 py-3 text-center">Statut</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{o.id}</td>
                        <td className="px-5 py-3.5 font-medium">{o.client}</td>
                        <td className="px-5 py-3.5 text-gray-600 truncate max-w-[150px]">{o.product}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-[#00A550]">{formatXAF(o.amount)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge variant={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-[#FFD100] to-[#FF8C00] rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-3">💡 Conseils pour booster vos ventes</h3>
              <ul className="space-y-2 text-sm">
                {[
                  "Ajoutez des photos de qualité — les produits avec 3+ photos se vendent 3× mieux",
                  "Répondez rapidement sur WhatsApp — les clients préfèrent les vendeurs réactifs",
                  "Proposez la livraison gratuite dès 20 000 FCFA d'achat pour augmenter le panier moyen",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">{i + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {tab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800 text-lg">Mes produits ({vendorProducts.length})</h2>
              <Button size="sm">+ Nouveau produit</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {vendorProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {vendorProducts.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center">
                <div className="text-5xl mb-3">🛍️</div>
                <p className="text-gray-500 mb-4">Vous n'avez pas encore de produits</p>
                <Button>Ajouter votre premier produit</Button>
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Toutes les commandes</h2>
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none">
                <option>Tous les statuts</option>
                <option>En attente</option>
                <option>Confirmée</option>
                <option>Expédiée</option>
                <option>Livrée</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Commande</th>
                    <th className="px-5 py-3 text-left">Client</th>
                    <th className="px-5 py-3 text-left">Produit</th>
                    <th className="px-5 py-3 text-right">Montant</th>
                    <th className="px-5 py-3 text-center">Statut</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs">{o.id}</td>
                      <td className="px-5 py-3.5 font-medium">{o.client}</td>
                      <td className="px-5 py-3.5 text-gray-600">{o.product}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#00A550]">{formatXAF(o.amount)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{o.date}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button className="text-xs text-[#00A550] hover:underline font-medium">Gérer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue chart placeholder */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 md:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4">Évolution des ventes (6 derniers mois)</h3>
              <div className="flex items-end gap-3 h-40">
                {[45000, 78000, 62000, 95000, 112000, 342500].map((v, i) => {
                  const months = ["Nov", "Déc", "Jan", "Fév", "Mar", "Avr"];
                  const maxV = 342500;
                  const height = Math.round((v / maxV) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-xs text-gray-500 font-medium">{formatXAF(v).replace(" FCFA", "")}</span>
                      <div className="w-full rounded-t-lg bg-[#00A550] hover:bg-[#007A3D] transition-colors" style={{ height: `${height}%` }} />
                      <span className="text-xs text-gray-500">{months[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top products */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Produits les plus vendus</h3>
              <div className="space-y-3">
                {vendorProducts.slice(0, 4).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="font-black text-gray-300 text-lg w-5">{i + 1}</span>
                    <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-[#00A550] h-1.5 rounded-full" style={{ width: `${100 - i * 20}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{28 - i * 5} ventes</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Modes de paiement utilisés</h3>
              <div className="space-y-3">
                {[
                  { name: "Airtel Money", pct: 55, color: "#FF0000" },
                  { name: "Moov Money", pct: 28, color: "#0066CC" },
                  { name: "Espèces", pct: 14, color: "#00A550" },
                  { name: "Carte", pct: 3, color: "#FFD100" },
                ].map((m) => (
                  <div key={m.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-gray-500">{m.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
