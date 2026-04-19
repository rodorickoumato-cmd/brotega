import Link from "next/link";
import { formatXAF } from "@/lib/utils";

const mockOrders = [
  { id: "#ORD-091", product: "Manioc frais 2kg + Plantains verts", amount: 5500, status: "delivered", date: "15/04/2026", items: 2 },
  { id: "#ORD-087", product: "Beurre de karité 500g", amount: 8000, status: "shipped", date: "12/04/2026", items: 1 },
  { id: "#ORD-082", product: "Robe en tissu Wax africain", amount: 28000, status: "confirmed", date: "08/04/2026", items: 1 },
  { id: "#ORD-075", product: "Smartphone Samsung Galaxy A54", amount: 185000, status: "delivered", date: "01/04/2026", items: 1 },
  { id: "#ORD-068", product: "Huile de palme rouge + Savon noir", amount: 8000, status: "delivered", date: "22/03/2026", items: 2 },
  { id: "#ORD-061", product: "Masque Fang traditionnel", amount: 75000, status: "delivered", date: "14/03/2026", items: 1 },
  { id: "#ORD-054", product: "Chargeur solaire portable 20W", amount: 22000, status: "cancelled", date: "05/03/2026", items: 1 },
  { id: "#ORD-047", product: "Boubou homme grande cérémonie", amount: 45000, status: "delivered", date: "20/02/2026", items: 1 },
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

export default function CommandesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compte" className="text-gray-400 hover:text-[#00A550] transition-colors">
          ← Mon compte
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-black text-gray-800">Mes commandes</h1>
      </div>

      <div className="space-y-4">
        {mockOrders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="font-mono text-xs font-bold text-gray-500">{o.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[o.status]}`}>
                  {statusLabel[o.status]}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">{o.product}</p>
              <p className="text-xs text-gray-400 mt-0.5">{o.items} article{o.items > 1 ? "s" : ""} · {o.date}</p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="font-black text-[#00A550]">{formatXAF(o.amount)}</span>
              <button className="text-xs text-[#00A550] font-semibold hover:underline border border-[#00A550] px-3 py-1.5 rounded-xl hover:bg-[#E8F7EE] transition-colors">
                Détails
              </button>
            </div>
          </div>
        ))}
      </div>

      {mockOrders.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3">📦</div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">Aucune commande</h2>
          <p className="text-gray-500 text-sm mb-5">Vous n'avez pas encore passé de commande.</p>
          <Link href="/catalogue" className="bg-[#00A550] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#007A3D] transition-colors inline-block">
            Commencer mes achats
          </Link>
        </div>
      )}
    </div>
  );
}
