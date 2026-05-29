"use client";
import { useEffect, useState, useCallback } from "react";
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

type ActionModal = {
  commande: Commande;
  type: "changer_statut" | "annuler" | "rembourser" | "liberer_escrow";
} | null;

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
  livree:              "Livrée",
  litige:              "Litige",
  remboursee:          "Remboursée",
  annulee:             "Annulée",
};

const TOUS_STATUTS = [
  "en_attente_paiement", "payee_escrow", "confirmee_vendeur",
  "en_livraison", "livree", "litige", "remboursee", "annulee",
];

const FILTRES = ["Toutes", "en_attente_paiement", "payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"] as const;

// ─── Modal action commande ───────────────────────────────────────────────────

function ModalAction({
  action,
  onConfirm,
  onClose,
  loading,
}: {
  action: ActionModal;
  onConfirm: (statut?: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [statutChoisi, setStatutChoisi] = useState("");
  if (!action) return null;

  const cfg = {
    changer_statut: {
      titre: "Changer le statut",
      desc: `Commande ${action.commande.code_court}`,
      couleur: "bg-indigo-600",
      label: "Appliquer",
    },
    annuler: {
      titre: "Annuler la commande",
      desc: `La commande ${action.commande.code_court} sera marquée comme annulée.`,
      couleur: "bg-red-600",
      label: "Annuler la commande",
    },
    rembourser: {
      titre: "Rembourser le client",
      desc: `La commande ${action.commande.code_court} sera marquée comme remboursée.`,
      couleur: "bg-orange-500",
      label: "Confirmer remboursement",
    },
    liberer_escrow: {
      titre: "Libérer l'escrow",
      desc: `Force la libération du paiement au vendeur pour ${action.commande.code_court}.`,
      couleur: "bg-green-600",
      label: "Libérer le paiement",
    },
  }[action.type];

  const handleConfirm = () => {
    if (action.type === "changer_statut") {
      if (!statutChoisi) return;
      onConfirm(statutChoisi);
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <div className={`w-12 h-12 ${cfg.couleur} rounded-2xl flex items-center justify-center mb-4`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="font-black text-lg text-gray-800 mb-2">{cfg.titre}</h3>
        <p className="text-sm text-gray-600 mb-4">{cfg.desc}</p>

        {action.type === "changer_statut" && (
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-700 mb-1 block">Nouveau statut</label>
            <select
              value={statutChoisi}
              onChange={(e) => setStatutChoisi(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">— Choisir —</option>
              {TOUS_STATUTS.filter((s) => s !== action.commande.statut).map((s) => (
                <option key={s} value={s}>{LABEL_STATUT[s] ?? s}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (action.type === "changer_statut" && !statutChoisi)}
            className={`flex-1 py-3 ${cfg.couleur} text-white rounded-2xl text-sm font-black disabled:opacity-40 active:scale-95 transition-all`}
          >
            {loading ? "…" : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminCommandesPage() {
  const router = useRouter();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<string>("Toutes");
  const [recherche, setRecherche] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "ok" | "err" } | null>(null);
  const [etendu, setEtendu] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const res = await getCommandesAdmin();
    setCommandes((res.commandes as Commande[]) ?? []);
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

  const executerAction = async (statut?: string) => {
    if (!actionModal) return;
    setEnCours(true);
    try {
      const body: Record<string, unknown> = {
        commandeId: actionModal.commande.id,
        action: actionModal.type,
      };
      if (statut) body.statut = statut;

      const r = await fetch("/api/admin/commandes/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const res = await r.json() as { succes?: boolean; erreur?: string };

      if (res.erreur) {
        setMessage({ texte: res.erreur, type: "err" });
      } else {
        setMessage({ texte: "Action effectuée.", type: "ok" });
        setActionModal(null);
        await charger();
      }
    } catch {
      setMessage({ texte: "Erreur réseau.", type: "err" });
    } finally {
      setEnCours(false);
    }
  };

  const visibles = commandes.filter((c) => {
    if (filtre !== "Toutes" && c.statut !== filtre) return false;
    if (recherche && !c.code_court?.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  const total = visibles.reduce((s, c) => s + c.total, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <ModalAction action={actionModal} onConfirm={executerAction} onClose={() => setActionModal(null)} loading={enCours} />

      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Commandes</h1>
        <p className="text-white/70 text-sm mt-1">{commandes.length} commandes enregistrées</p>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Notif */}
        {message && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
            message.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {message.texte}
            <button onClick={() => setMessage(null)} className="ml-2 opacity-60">✕</button>
          </div>
        )}

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
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* En-tête cliquable */}
            <button
              className="w-full p-4 text-left active:bg-gray-50 transition-colors"
              onClick={() => setEtendu((p) => (p === c.id ? null : c.id))}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-gray-800 text-base">{c.code_court ?? "—"}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${COULEUR_STATUT[c.statut] ?? "bg-gray-50 border-gray-200 text-gray-600"}`}>
                    {LABEL_STATUT[c.statut] ?? c.statut}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${etendu === c.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  {c.mode_paiement && ` · ${c.mode_paiement.replace("_", " ")}`}
                </span>
                <span className="font-black text-[#E63946]">{formatXAF(c.total)}</span>
              </div>
            </button>

            {/* Actions admin (panel déroulant) */}
            {etendu === c.id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Actions admin</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/commande/${c.code_court}`}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-white text-gray-600 border border-gray-200 flex items-center gap-1"
                  >
                    Voir détail
                  </Link>

                  <button
                    onClick={() => setActionModal({ commande: c, type: "changer_statut" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Changer statut
                  </button>

                  {["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(c.statut) && (
                    <button
                      onClick={() => setActionModal({ commande: c, type: "liberer_escrow" })}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 active:scale-95 transition-all flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Libérer escrow
                    </button>
                  )}

                  {!["annulee", "remboursee", "livree"].includes(c.statut) && (
                    <button
                      onClick={() => setActionModal({ commande: c, type: "rembourser" })}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 active:scale-95 transition-all"
                    >
                      Rembourser
                    </button>
                  )}

                  {!["annulee", "livree", "remboursee"].includes(c.statut) && (
                    <button
                      onClick={() => setActionModal({ commande: c, type: "annuler" })}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 active:scale-95 transition-all"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
