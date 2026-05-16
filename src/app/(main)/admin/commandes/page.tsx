"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCommandesAdmin } from "@/app/actions/admin";
import { formatXAF } from "@/lib/utils";
import Link from "next/link";

type Commande = {
  id: string;
  code_court: string | null;
  total: number;
  statut: string;
  statut_paiement: string;
  mode_paiement: string | null;
  created_at: string;
  utilisateur_id: string | null;
  vendeur_id: string | null;
};

const COULEUR_STATUT: Record<string, string> = {
  en_attente_paiement: "bg-yellow-50 border-yellow-200 text-yellow-700",
  payee_escrow:        "bg-blue-50 border-blue-200 text-blue-700",
  confirmee_vendeur:   "bg-indigo-50 border-indigo-200 text-indigo-700",
  en_livraison:        "bg-purple-50 border-purple-200 text-purple-700",
  livree:              "bg-green-50 border-green-200 text-green-700",
  litige:              "bg-orange-50 border-orange-200 text-orange-700",
  remboursee:          "bg-gray-50 border-gray-200 text-gray-600",
  annulee:             "bg-red-50 border-red-200 text-red-700",
};

const LABEL_STATUT: Record<string, string> = {
  en_attente_paiement: "En attente",
  payee_escrow:        "Payée",
  confirmee_vendeur:   "Confirmée",
  en_livraison:        "En livraison",
  livree:              "Livrée ✓",
  litige:              "Litige ⚠️",
  remboursee:          "Remboursée",
  annulee:             "Annulée",
};

const FILTRES = ["Toutes", "en_attente_paiement", "payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"] as const;

export default function AdminCommandesPage() {
  const router = useRouter();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<string>("Toutes");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      const res = await getCommandesAdmin();
      setCommandes((res.commandes as Commande[]) ?? []);
      setChargement(false);
    })();
  }, [router]);

  const visibles = commandes.filter((c) => {
    if (filtre !== "Toutes" && c.statut !== filtre) return false;
    if (recherche && !c.code_court?.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  const total = visibles.reduce((s, c) => s + c.total, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Commandes 📦</h1>
        <p className="text-white/70 text-sm mt-1">{commandes.length} commandes enregistrées</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Recherche */}
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par code..."
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#E63946] bg-white transition-colors"
        />

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTRES.map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filtre === f
                  ? "bg-[#E63946] border-[#E63946] text-white"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {f === "Toutes" ? "Toutes" : (LABEL_STATUT[f] ?? f)}
            </button>
          ))}
        </div>

        {/* Total filtré */}
        {!chargement && visibles.length > 0 && (
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-gray-100">
            <span className="text-sm text-gray-500">{visibles.length} commande{visibles.length > 1 ? "s" : ""}</span>
            <span className="font-black text-[#E63946]">{formatXAF(total)}</span>
          </div>
        )}

        {chargement && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-500 font-medium">Aucune commande</p>
          </div>
        )}

        {!chargement && visibles.map((c) => (
          <Link key={c.id} href={`/commande/${c.code_court}`}>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#E63946]/30 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-gray-800 text-base">{c.code_court ?? "—"}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${COULEUR_STATUT[c.statut] ?? "bg-gray-50 border-gray-200 text-gray-600"}`}>
                  {LABEL_STATUT[c.statut] ?? c.statut}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  {c.mode_paiement && ` · ${c.mode_paiement.replace("_", " ")}`}
                </span>
                <span className="font-black text-[#E63946]">{formatXAF(c.total)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
