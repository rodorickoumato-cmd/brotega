"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import { formaterPhoneGabon } from "@/lib/phone";
import Link from "next/link";

type Stats = {
  en_cours: number;
  livrees: number;
  gains_total: number;
  gains_en_attente: number;
};

type Livreur = {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  created_at: string;
  suspendu: boolean | null;
  motif_suspension: string | null;
  stats: Stats;
};

type ActionModal = {
  livreur: Livreur;
  type: "suspendre" | "reactiver" | "changer_role";
} | null;

function ModalAction({
  action,
  onConfirm,
  onClose,
  loading,
}: {
  action: ActionModal;
  onConfirm: (motif: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [motif, setMotif] = useState("");
  if (!action) return null;

  const cfg = {
    suspendre: {
      titre: "Suspendre ce livreur",
      desc: `${action.livreur.nom} ne pourra plus accepter de livraisons.`,
      couleur: "bg-orange-500",
      label: "Suspendre",
      motifRequis: true,
    },
    reactiver: {
      titre: "Réactiver ce livreur",
      desc: `${action.livreur.nom} pourra à nouveau effectuer des livraisons.`,
      couleur: "bg-green-500",
      label: "Réactiver",
      motifRequis: false,
    },
    changer_role: {
      titre: "Retirer le rôle livreur",
      desc: `${action.livreur.nom} deviendra un acheteur simple.`,
      couleur: "bg-gray-700",
      label: "Changer en acheteur",
      motifRequis: false,
    },
  }[action.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <div className={`w-12 h-12 ${cfg.couleur} rounded-2xl flex items-center justify-center mb-4`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="font-black text-lg text-gray-800 mb-2">{cfg.titre}</h3>
        <p className="text-sm text-gray-600 mb-4">{cfg.desc}</p>

        {cfg.motifRequis && (
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-700 mb-1 block">Motif <span className="text-red-500">*</span></label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: retards répétés, signalement client, fraude..."
              rows={2}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(motif)}
            disabled={loading || (cfg.motifRequis && !motif.trim())}
            className={`flex-1 py-3 ${cfg.couleur} text-white rounded-2xl text-sm font-black disabled:opacity-40 active:scale-95 transition-all`}
          >
            {loading ? "…" : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLivreursPage() {
  const router = useRouter();
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreSuspendu, setFiltreSuspendu] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "ok" | "err" } | null>(null);

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/livreurs");
      const d = await r.json() as { livreurs?: Livreur[]; erreur?: string };
      if (d.livreurs) setLivreurs(d.livreurs);
    } catch { /* skip */ }
    finally { setChargement(false); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      await charger();
    })();
  }, [router, charger]);

  const executerAction = async (motif: string) => {
    if (!actionModal) return;
    setEnCours(true);
    try {
      let url = "";
      let body: Record<string, unknown> = {};

      if (actionModal.type === "suspendre") {
        url = "/api/admin/utilisateurs/bannir";
        body = { userId: actionModal.livreur.id, action: "suspendre", motif };
      } else if (actionModal.type === "reactiver") {
        url = "/api/admin/utilisateurs/bannir";
        body = { userId: actionModal.livreur.id, action: "reactiver", motif: "" };
      } else if (actionModal.type === "changer_role") {
        url = "/api/admin/utilisateurs/changer-role";
        body = { userId: actionModal.livreur.id, role: "acheteur" };
      }

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const res = await r.json() as { succes?: boolean; erreur?: string };

      if (res.erreur) {
        setMessage({ texte: res.erreur, type: "err" });
      } else {
        setMessage({ texte: "Action effectuée avec succès.", type: "ok" });
        setActionModal(null);
        await charger();
      }
    } catch {
      setMessage({ texte: "Erreur réseau.", type: "err" });
    } finally {
      setEnCours(false);
    }
  };

  const visibles = livreurs.filter((l) => {
    const q = recherche.toLowerCase();
    const matchQ = !q || l.nom.toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q) || (l.telephone ?? "").includes(q);
    const matchSusp = !filtreSuspendu || l.suspendu;
    return matchQ && matchSusp;
  });

  const totaux = livreurs.reduce((acc, l) => ({
    livrees: acc.livrees + l.stats.livrees,
    gains: acc.gains + l.stats.gains_total,
    enCours: acc.enCours + l.stats.en_cours,
  }), { livrees: 0, gains: 0, enCours: 0 });

  const nbSuspendus = livreurs.filter((l) => l.suspendu).length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <ModalAction action={actionModal} onConfirm={executerAction} onClose={() => setActionModal(null)} loading={enCours} />

      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Admin
        </Link>
        <h1 className="text-2xl font-black text-white">Livreurs</h1>
        <p className="text-white/70 text-sm mt-1">
          {livreurs.length} livreur{livreurs.length > 1 ? "s" : ""}
          {totaux.enCours > 0 && ` · ${totaux.enCours} en route`}
        </p>
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

        {/* Stats globales */}
        {!chargement && livreurs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Livrées", value: String(totaux.livrees), couleur: "text-green-600" },
              { label: "En route", value: String(totaux.enCours), couleur: "text-purple-600" },
              { label: "Gains versés", value: formatXAF(totaux.gains), couleur: "text-[#E63946]" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
                <p className={`font-black text-base ${s.couleur}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alerte suspendus */}
        {nbSuspendus > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="font-black text-orange-700 text-sm">{nbSuspendus} livreur{nbSuspendus > 1 ? "s" : ""} suspendu{nbSuspendus > 1 ? "s" : ""}</p>
              <button onClick={() => setFiltreSuspendu((p) => !p)} className="text-xs text-orange-600 underline">
                {filtreSuspendu ? "Voir tous" : "Voir uniquement les suspendus"}
              </button>
            </div>
          </div>
        )}

        {/* Recherche */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un livreur…"
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#E63946]"
          />
        </div>

        {chargement && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-36" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            {livreurs.length === 0 ? "Aucun livreur enregistré" : "Aucun résultat"}
          </div>
        )}

        {!chargement && visibles.map((l) => (
          <div key={l.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
            l.suspendu ? "border-orange-200" : "border-gray-100"
          }`}>
            {l.suspendu && (
              <div className="bg-orange-500 px-4 py-1.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <p className="text-white text-xs font-black">
                  Suspendu{l.motif_suspension ? ` — ${l.motif_suspension}` : ""}
                </p>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                  l.suspendu ? "bg-orange-100 text-orange-400" : "bg-[#FFF7ED] text-orange-500"
                }`}>
                  {l.nom.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 text-sm">{l.nom}</p>
                  {l.email && <p className="text-xs text-gray-500 mt-0.5 truncate">{l.email}</p>}
                  {l.telephone && (
                    <a href={`tel:${l.telephone}`} className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {formaterPhoneGabon(l.telephone)}
                    </a>
                  )}
                  <p className="text-[10px] text-gray-300 mt-1">
                    Depuis le {new Date(l.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Stats livraisons */}
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {[
                  { label: "En route", val: l.stats.en_cours, cls: "text-purple-600" },
                  { label: "Livrées", val: l.stats.livrees, cls: "text-green-600" },
                  { label: "Gains", val: formatXAF(l.stats.gains_total), cls: "text-[#E63946]" },
                  { label: "En attente", val: formatXAF(l.stats.gains_en_attente), cls: "text-gray-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className={`font-black text-xs ${s.cls}`}>{s.val}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {l.telephone && (
                  <a
                    href={`tel:${l.telephone}`}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Appeler
                  </a>
                )}

                {!l.suspendu ? (
                  <button
                    onClick={() => setActionModal({ livreur: l, type: "suspendre" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Suspendre
                  </button>
                ) : (
                  <button
                    onClick={() => setActionModal({ livreur: l, type: "reactiver" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Réactiver
                  </button>
                )}

                <button
                  onClick={() => setActionModal({ livreur: l, type: "changer_role" })}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-50 text-gray-600 border border-gray-200 active:scale-95 transition-all"
                >
                  Retirer rôle livreur
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
