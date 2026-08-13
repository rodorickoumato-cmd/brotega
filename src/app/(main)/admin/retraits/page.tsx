"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRetraitsAdmin, marquerRetraitPaye, rejeterRetrait } from "@/app/actions/finance";
import { formatXAF } from "@/lib/utils";
import Link from "next/link";

type Retrait = {
  id: string;
  vendeur_id: string;
  vendeur_nom: string | null;
  montant_xaf: number;
  telephone: string;
  provider: "airtel" | "moov";
  statut: "a_payer" | "paye" | "rejete";
  motif_rejet: string | null;
  created_at: string;
};

type Toast = { message: string; type: "succes" | "erreur" };
type Filtre = "a_payer" | "paye" | "rejete" | "Tous";

const PROVIDER_LABEL: Record<"airtel" | "moov", string> = { airtel: "Airtel Money", moov: "Moov Money" };
const STATUT_LABEL: Record<Retrait["statut"], string> = { a_payer: "À payer", paye: "Payé", rejete: "Rejeté" };
const STATUT_STYLE: Record<Retrait["statut"], string> = {
  a_payer: "bg-orange-50 border-orange-200 text-orange-700",
  paye:    "bg-green-50 border-green-200 text-green-700",
  rejete:  "bg-red-50 border-red-200 text-red-700",
};

export default function AdminRetraitsPage() {
  const router = useRouter();
  const [retraits, setRetraits] = useState<Retrait[]>([]);
  const [chargement, setChargement] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_payer");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [rejetOuvert, setRejetOuvert] = useState<string | null>(null);
  const [motifRejet, setMotifRejet] = useState("");

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const charger = useCallback(async () => {
    const res = await getRetraitsAdmin();
    if (res.retraits) setRetraits(res.retraits as Retrait[]);
    setChargement(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      await charger();
    })();
  }, [router, charger]);

  async function handlePayer(id: string) {
    setEnCours(id);
    const res = await marquerRetraitPaye(id);
    if (res.succes) { afficherToast("Retrait marqué payé.", "succes"); await charger(); }
    else afficherToast(res.erreur ?? "Erreur", "erreur");
    setEnCours(null);
  }

  async function handleRejeter(id: string) {
    if (!motifRejet.trim()) { afficherToast("Précisez un motif.", "erreur"); return; }
    setEnCours(id);
    const res = await rejeterRetrait(id, motifRejet);
    if (res.succes) { afficherToast("Retrait rejeté et recrédité.", "succes"); setRejetOuvert(null); setMotifRejet(""); await charger(); }
    else afficherToast(res.erreur ?? "Erreur", "erreur");
    setEnCours(null);
  }

  const visibles = retraits.filter((r) => filtre === "Tous" || r.statut === filtre);
  const nbAPayer = retraits.filter((r) => r.statut === "a_payer").length;
  const totalAPayer = retraits.filter((r) => r.statut === "a_payer").reduce((s, r) => s + r.montant_xaf, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Retraits vendeurs 💸</h1>
        <p className="text-white/70 text-sm mt-1">
          {nbAPayer > 0 ? `${formatXAF(totalAPayer)} à verser · ${nbAPayer} en attente` : "Rien en attente"}
        </p>
      </div>

      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {(["a_payer", "paye", "rejete", "Tous"] as Filtre[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filtre === f ? "bg-[#E63946] border-[#E63946] text-white" : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {f === "Tous" ? "Tous" : STATUT_LABEL[f]}
            </button>
          ))}
        </div>

        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-28 animate-pulse mb-3" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">💸</div>
            <p className="text-gray-500 font-medium">Aucun retrait {filtre === "a_payer" ? "en attente" : ""}</p>
          </div>
        )}

        <div className="space-y-3">
          {visibles.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-black text-gray-800">{formatXAF(r.montant_xaf)}</p>
                  <p className="text-sm text-gray-600">{r.vendeur_nom ?? "Boutique inconnue"}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUT_STYLE[r.statut]}`}>
                  {STATUT_LABEL[r.statut]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {PROVIDER_LABEL[r.provider]} · {r.telephone} ·{" "}
                {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              {r.statut === "rejete" && r.motif_rejet && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 mb-3">Motif : {r.motif_rejet}</p>
              )}

              {r.statut === "a_payer" && (
                rejetOuvert === r.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={motifRejet}
                      onChange={(e) => setMotifRejet(e.target.value)}
                      placeholder="Motif du rejet (numéro invalide, doublon...)"
                      rows={2}
                      className="w-full text-sm border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946] resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setRejetOuvert(null); setMotifRejet(""); }} className="flex-1 text-xs font-bold py-2 rounded-xl border-2 border-gray-200 text-gray-600">
                        Annuler
                      </button>
                      <button
                        onClick={() => handleRejeter(r.id)}
                        disabled={enCours === r.id}
                        className="flex-1 text-xs font-bold py-2 rounded-xl bg-red-600 text-white disabled:opacity-50"
                      >
                        {enCours === r.id ? "…" : "Confirmer le rejet"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRejetOuvert(r.id)}
                      disabled={enCours === r.id}
                      className="flex-1 text-xs font-bold py-2 rounded-xl border-2 border-red-100 text-red-600 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                    <button
                      onClick={() => handlePayer(r.id)}
                      disabled={enCours === r.id}
                      className="flex-1 text-xs font-bold py-2 rounded-xl bg-[#E63946] text-white disabled:opacity-50"
                    >
                      {enCours === r.id ? "…" : `Marquer payé — ${formatXAF(r.montant_xaf)}`}
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
