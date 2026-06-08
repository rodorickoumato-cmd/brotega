"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCommandesAdmin, getCommandesPeriode } from "@/app/actions/admin";
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

type CmdStats = { id: string; total: number; statut: string; created_at: string };

type Groupe = { label: string; count: number; ca: number; livrees: number };

type Periode = "7j" | "4s" | "6m";

type ActionModal = {
  commande: Commande;
  type: "changer_statut" | "annuler" | "rembourser" | "liberer_escrow";
} | null;

// ─── Groupage période ─────────────────────────────────────────────────────────

function grouperParPeriode(cmds: CmdStats[], mode: Periode): Groupe[] {
  const now = new Date();
  const periodes: { label: string; debut: Date; fin: Date }[] = [];

  if (mode === "7j") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const debut = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const fin = new Date(debut.getTime() + 86_399_999);
      periodes.push({
        label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }),
        debut, fin,
      });
    }
  } else if (mode === "4s") {
    for (let i = 3; i >= 0; i--) {
      const fin = new Date(now);
      fin.setDate(fin.getDate() - i * 7);
      fin.setHours(23, 59, 59, 999);
      const debut = new Date(fin);
      debut.setDate(debut.getDate() - 6);
      debut.setHours(0, 0, 0, 0);
      const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      periodes.push({ label: `${fmt(debut)} – ${fmt(fin)}`, debut, fin });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const debut = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fin = new Date(debut.getFullYear(), debut.getMonth() + 1, 0, 23, 59, 59, 999);
      periodes.push({
        label: debut.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
        debut, fin,
      });
    }
  }

  return periodes.map(({ label, debut, fin }) => {
    const slice = cmds.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= debut.getTime() && t <= fin.getTime();
    });
    return {
      label,
      count: slice.length,
      ca: slice.reduce((s, c) => s + c.total, 0),
      livrees: slice.filter((c) => c.statut === "livree").length,
    };
  });
}

// ─── Composant barres ─────────────────────────────────────────────────────────

function BarresPeriode({ groupes }: { groupes: Groupe[] }) {
  const maxCount = Math.max(...groupes.map((g) => g.count), 1);
  return (
    <div className="space-y-2 mt-3">
      {groupes.map((g) => (
        <div key={g.label} className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 w-28 shrink-0 leading-tight">{g.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className="bg-[#E63946] h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max((g.count / maxCount) * 100, g.count > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-xs font-black text-gray-700 w-5 text-right">{g.count}</span>
          <span className="text-[11px] text-gray-400 w-24 text-right hidden sm:block">
            {g.ca > 0 ? formatXAF(g.ca) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Modal action commande ────────────────────────────────────────────────────

const TOUS_STATUTS = [
  "en_attente_paiement", "payee_escrow", "confirmee_vendeur",
  "en_livraison", "livree", "litige", "remboursee", "annulee",
];
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

function ModalAction({
  action, onConfirm, onClose, loading,
}: {
  action: ActionModal;
  onConfirm: (statut?: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [statutChoisi, setStatutChoisi] = useState("");
  if (!action) return null;

  const cfg = {
    changer_statut:  { titre: "Changer le statut",      desc: `Commande ${action.commande.code_court}`,                                        couleur: "bg-indigo-600", label: "Appliquer" },
    annuler:         { titre: "Annuler la commande",     desc: `La commande ${action.commande.code_court} sera marquée comme annulée.`,          couleur: "bg-red-600",    label: "Annuler la commande" },
    rembourser:      { titre: "Rembourser le client",    desc: `La commande ${action.commande.code_court} sera marquée comme remboursée.`,       couleur: "bg-orange-500", label: "Confirmer remboursement" },
    liberer_escrow:  { titre: "Libérer l'escrow",        desc: `Force la libération du paiement au vendeur pour ${action.commande.code_court}.`, couleur: "bg-green-600",  label: "Libérer le paiement" },
  }[action.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
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
          <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">Annuler</button>
          <button
            onClick={() => action.type === "changer_statut" ? onConfirm(statutChoisi) : onConfirm()}
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

// ─── Modal suppression ────────────────────────────────────────────────────────

function ModalSupprimer({
  commande, onConfirm, onClose, loading,
}: {
  commande: Commande | null;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  if (!commande) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="font-black text-lg text-gray-900 mb-1">Supprimer la commande</h3>
        <p className="text-sm text-gray-500 mb-1">
          Commande <span className="font-black text-gray-800">{commande.code_court}</span> · {formatXAF(commande.total)}
        </p>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 mt-3">
          <p className="text-sm text-red-700 font-medium">
            Cette action est <strong>irréversible</strong>. La commande, ses livraisons et réclamations associées seront définitivement supprimées.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-sm font-black disabled:opacity-40 active:scale-95 transition-all"
          >
            {loading ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constantes UI ────────────────────────────────────────────────────────────

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

const FILTRES = ["Toutes", "en_attente_paiement", "payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"] as const;

const NB_JOURS: Record<Periode, number> = { "7j": 7, "4s": 28, "6m": 180 };
const LABEL_PERIODE: Record<Periode, string> = { "7j": "7 jours", "4s": "4 semaines", "6m": "6 mois" };

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminCommandesPage() {
  const router = useRouter();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<string>("Toutes");
  const [recherche, setRecherche] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [supprModal, setSupprModal] = useState<Commande | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [enSuppression, setEnSuppression] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "ok" | "err" } | null>(null);
  const [etendu, setEtendu] = useState<string | null>(null);

  // Analytiques
  const [periode, setPeriode] = useState<Periode>("7j");
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [chargementStats, setChargementStats] = useState(true);
  const [statsOuvertes, setStatsOuvertes] = useState(true);

  const charger = useCallback(async () => {
    const res = await getCommandesAdmin();
    setCommandes((res.commandes as Commande[]) ?? []);
    setChargement(false);
  }, []);

  const chargerStats = useCallback(async (p: Periode) => {
    setChargementStats(true);
    const res = await getCommandesPeriode(NB_JOURS[p]);
    if (res.commandes) {
      setGroupes(grouperParPeriode(res.commandes as CmdStats[], p));
    }
    setChargementStats(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      await Promise.all([charger(), chargerStats("7j")]);
    })();
  }, [router, charger, chargerStats]);

  const changerPeriode = (p: Periode) => {
    setPeriode(p);
    chargerStats(p);
  };

  const executerAction = async (statut?: string) => {
    if (!actionModal) return;
    setEnCours(true);
    try {
      const body: Record<string, unknown> = { commandeId: actionModal.commande.id, action: actionModal.type };
      if (statut) body.statut = statut;
      const r = await fetch("/api/admin/commandes/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const res = await r.json() as { succes?: boolean; erreur?: string };
      if (res.erreur) { setMessage({ texte: res.erreur, type: "err" }); }
      else { setMessage({ texte: "Action effectuée.", type: "ok" }); setActionModal(null); await charger(); }
    } catch { setMessage({ texte: "Erreur réseau.", type: "err" }); }
    finally { setEnCours(false); }
  };

  const supprimerCommande = async () => {
    if (!supprModal) return;
    setEnSuppression(true);
    try {
      const r = await fetch("/api/admin/commandes/supprimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandeId: supprModal.id }),
      });
      const res = await r.json() as { succes?: boolean; erreur?: string };
      if (res.erreur) { setMessage({ texte: res.erreur, type: "err" }); }
      else {
        setCommandes((prev) => prev.filter((c) => c.id !== supprModal.id));
        setSupprModal(null);
        setEtendu(null);
        setMessage({ texte: `Commande ${supprModal.code_court} supprimée.`, type: "ok" });
        await chargerStats(periode);
      }
    } catch { setMessage({ texte: "Erreur réseau.", type: "err" }); }
    finally { setEnSuppression(false); }
  };

  const visibles = commandes.filter((c) => {
    if (filtre !== "Toutes" && c.statut !== filtre) return false;
    if (recherche && !c.code_court?.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  const totalFiltré = visibles.reduce((s, c) => s + c.total, 0);

  // KPIs période
  const totalPeriode = groupes.reduce((s, g) => s + g.count, 0);
  const caPeriode    = groupes.reduce((s, g) => s + g.ca, 0);
  const livreesPeriode = groupes.reduce((s, g) => s + g.livrees, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <ModalAction action={actionModal} onConfirm={executerAction} onClose={() => setActionModal(null)} loading={enCours} />
      <ModalSupprimer commande={supprModal} onConfirm={supprimerCommande} onClose={() => setSupprModal(null)} loading={enSuppression} />

      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
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

        {/* ── Analytiques ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setStatsOuvertes((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <span className="font-black text-gray-800 text-sm">Analytiques</span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${statsOuvertes ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {statsOuvertes && (
            <div className="border-t border-gray-100 px-4 pb-4">
              {/* Sélecteur de période */}
              <div className="flex gap-1.5 mt-3 mb-4">
                {(["7j", "4s", "6m"] as Periode[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => changerPeriode(p)}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                      periode === p
                        ? "bg-[#E63946] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {LABEL_PERIODE[p]}
                  </button>
                ))}
              </div>

              {/* KPIs */}
              {chargementStats ? (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[0,1,2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-blue-700">{totalPeriode}</p>
                    <p className="text-[10px] font-bold text-blue-500 mt-0.5">Commandes</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
                    <p className="text-sm font-black text-green-700 leading-tight">{caPeriode > 0 ? formatXAF(caPeriode) : "—"}</p>
                    <p className="text-[10px] font-bold text-green-500 mt-0.5">CA total</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-purple-700">{livreesPeriode}</p>
                    <p className="text-[10px] font-bold text-purple-500 mt-0.5">Livrées</p>
                  </div>
                </div>
              )}

              {/* Barres */}
              {chargementStats ? (
                <div className="space-y-2">
                  {[0,1,2,3].map((i) => <div key={i} className="h-4 bg-gray-100 rounded-full animate-pulse" />)}
                </div>
              ) : groupes.every((g) => g.count === 0) ? (
                <p className="text-center text-xs text-gray-400 py-4">Aucune commande sur cette période</p>
              ) : (
                <BarresPeriode groupes={groupes} />
              )}
            </div>
          )}
        </div>

        {/* Recherche */}
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par code..."
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#E63946] bg-white transition-colors"
        />

        {/* Filtres statut */}
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
            <span className="font-black text-[#E63946]">{formatXAF(totalFiltré)}</span>
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

        {/* Liste */}
        {!chargement && visibles.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
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

            {etendu === c.id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Actions admin</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/commande/${c.code_court}`}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-white text-gray-600 border border-gray-200"
                  >
                    Voir détail
                  </Link>

                  <button
                    onClick={() => setActionModal({ commande: c, type: "changer_statut" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 active:scale-95 transition-all"
                  >
                    Changer statut
                  </button>

                  {["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(c.statut) && (
                    <button
                      onClick={() => setActionModal({ commande: c, type: "liberer_escrow" })}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 active:scale-95 transition-all"
                    >
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

                  {/* Suppression — toujours disponible pour l'admin */}
                  <button
                    onClick={() => setSupprModal(c)}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-red-600 text-white border border-red-700 active:scale-95 transition-all flex items-center gap-1.5 ml-auto"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
