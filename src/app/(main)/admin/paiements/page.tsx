"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPaiementsAdmin } from "@/app/actions/admin";
import { formatXAF } from "@/lib/utils";
import Link from "next/link";

type Paiement = {
  id: string;
  montant_xaf: number;
  provider: string;
  statut: string;
  telephone: string | null;
  provider_ref: string | null;
  commande_id: string | null;
  created_at: string;
};

const STATUT_STYLE: Record<string, string> = {
  reussi:     "bg-green-50 border-green-200 text-green-700",
  en_attente: "bg-yellow-50 border-yellow-200 text-yellow-700",
  initie:     "bg-blue-50 border-blue-200 text-blue-700",
  echec:      "bg-red-50 border-red-200 text-red-700",
  rembourse:  "bg-gray-50 border-gray-200 text-gray-600",
};

const STATUT_LABEL: Record<string, string> = {
  reussi:     "Réussi ✓",
  en_attente: "En attente",
  initie:     "Initié",
  echec:      "Échec",
  rembourse:  "Remboursé",
};

const PROVIDER_LABEL: Record<string, string> = {
  airtel: "Airtel Money",
  moov:   "Moov Money",
  cash:   "Espèces",
  mock:   "Test",
};

const FILTRES = ["Tous", "reussi", "en_attente", "echec"] as const;

export default function AdminPaiementsPage() {
  const router = useRouter();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<string>("Tous");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      const res = await getPaiementsAdmin();
      setPaiements((res.paiements as Paiement[]) ?? []);
      setChargement(false);
    })();
  }, [router]);

  const visibles = paiements.filter((p) => filtre === "Tous" || p.statut === filtre);

  const totalReussis = paiements
    .filter((p) => p.statut === "reussi")
    .reduce((s, p) => s + p.montant_xaf, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Paiements 💳</h1>
        <p className="text-white/70 text-sm mt-1">
          {formatXAF(totalReussis)} encaissés · {paiements.length} transactions
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
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
              {f === "Tous" ? "Tous" : (STATUT_LABEL[f] ?? f)}
            </button>
          ))}
        </div>

        {!chargement && visibles.length > 0 && (
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-gray-100">
            <span className="text-sm text-gray-500">{visibles.length} transaction{visibles.length > 1 ? "s" : ""}</span>
            <span className="font-black text-[#E63946]">
              {formatXAF(visibles.filter((p) => p.statut === "reussi").reduce((s, p) => s + p.montant_xaf, 0))}
            </span>
          </div>
        )}

        {chargement && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-gray-500 font-medium">Aucun paiement</p>
          </div>
        )}

        {!chargement && visibles.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-black text-gray-800 text-base">{formatXAF(p.montant_xaf)}</span>
                <span className="text-xs text-gray-500 ml-2">{PROVIDER_LABEL[p.provider] ?? p.provider}</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUT_STYLE[p.statut] ?? "bg-gray-50 border-gray-200 text-gray-600"}`}>
                {STATUT_LABEL[p.statut] ?? p.statut}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                {p.telephone && `${p.telephone} · `}
                {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              {p.provider_ref && (
                <span className="font-mono text-gray-300 truncate max-w-[120px]">{p.provider_ref}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
