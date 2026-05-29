"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Boutique = { id: string; nom: string; statut: string } | null;

type Utilisateur = {
  id: string;
  nom: string;
  email: string | null;
  role: string;
  telephone: string | null;
  created_at: string;
  banni: boolean;
  boutique: Boutique;
};

type ActionModal = {
  user: Utilisateur;
  type: "bannir" | "debannir" | "supprimer" | "supprimer_boutique" | "changer_role";
  nouveauRole?: string;
} | null;

const ROLE_STYLE: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700",
  vendeur:  "bg-blue-100 text-blue-700",
  livreur:  "bg-orange-100 text-orange-700",
  acheteur: "bg-gray-100 text-gray-600",
};

const STATUT_BOUTIQUE: Record<string, { label: string; cls: string }> = {
  verifie:    { label: "Vérifiée", cls: "bg-green-100 text-green-700" },
  en_attente: { label: "En attente", cls: "bg-yellow-100 text-yellow-700" },
  suspendu:   { label: "Suspendue", cls: "bg-red-100 text-red-700" },
};

// ─── Modal confirmation action sensible ──────────────────────────────────────

function ConfirmModal({
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

  const configs = {
    bannir: {
      titre: "Bannir cet utilisateur",
      desc: `${action.user.nom} ne pourra plus se connecter. Sa boutique sera suspendue.`,
      couleur: "bg-red-500",
      label: "Bannir définitivement",
      motifRequis: true,
    },
    debannir: {
      titre: "Lever le ban",
      desc: `${action.user.nom} pourra à nouveau se connecter.`,
      couleur: "bg-green-500",
      label: "Lever le ban",
      motifRequis: false,
    },
    supprimer: {
      titre: "Supprimer le compte",
      desc: `IRRÉVERSIBLE — supprime le compte, la boutique et tous les produits de ${action.user.nom}.`,
      couleur: "bg-gray-800",
      label: "Supprimer définitivement",
      motifRequis: true,
    },
    supprimer_boutique: {
      titre: "Supprimer la boutique",
      desc: `Supprime la boutique "${action.user.boutique?.nom}" et tous ses produits. L'utilisateur conserve son compte.`,
      couleur: "bg-red-600",
      label: "Supprimer la boutique",
      motifRequis: false,
    },
    changer_role: {
      titre: "Changer le rôle",
      desc: `${action.user.nom} aura le rôle : ${action.nouveauRole ?? "acheteur"}.`,
      couleur: "bg-indigo-600",
      label: "Confirmer le changement",
      motifRequis: false,
    },
  };

  const cfg = configs[action.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <div className={`w-12 h-12 ${cfg.couleur} rounded-2xl flex items-center justify-center mb-4`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
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
              placeholder="Ex: contenu frauduleux, escroquerie signalée, faux produits..."
              rows={2}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none"
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

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminUtilisateursPage() {
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("Tous");
  const [filtreBan, setFiltreBan] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "ok" | "err" } | null>(null);

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/utilisateurs");
      const data = await r.json() as { utilisateurs?: Utilisateur[]; erreur?: string };
      if (data.utilisateurs) setUtilisateurs(data.utilisateurs);
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
      let url = "/api/admin/utilisateurs/bannir";
      let body: Record<string, unknown> = { userId: actionModal.user.id, action: actionModal.type, motif };

      if (actionModal.type === "supprimer_boutique") {
        url = "/api/admin/vendeurs/supprimer";
        body = { vendeurId: actionModal.user.boutique?.id, banEmail: false };
      } else if (actionModal.type === "changer_role") {
        url = "/api/admin/utilisateurs/changer-role";
        body = { userId: actionModal.user.id, role: actionModal.nouveauRole ?? "acheteur" };
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

  const visibles = utilisateurs.filter((u) => {
    const q = recherche.toLowerCase();
    const matchQ = !q || u.nom.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
    const matchRole = filtreRole === "Tous" || u.role === filtreRole;
    const matchBan = !filtreBan || u.banni;
    return matchQ && matchRole && matchBan;
  });

  const nbBannis = utilisateurs.filter((u) => u.banni).length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <ConfirmModal action={actionModal} onConfirm={executerAction} onClose={() => setActionModal(null)} loading={enCours} />

      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Admin
        </Link>
        <h1 className="text-2xl font-black text-white">Utilisateurs</h1>
        <p className="text-white/70 text-sm mt-1">
          {utilisateurs.length} comptes
          {nbBannis > 0 && ` · ${nbBannis} banni${nbBannis > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Notifications */}
        {message && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
            message.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {message.texte}
            <button onClick={() => setMessage(null)} className="ml-2 opacity-60">✕</button>
          </div>
        )}

        {/* Alerte bannissements actifs */}
        {nbBannis > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="font-black text-red-700 text-sm">{nbBannis} compte{nbBannis > 1 ? "s" : ""} banni{nbBannis > 1 ? "s" : ""}</p>
              <button onClick={() => setFiltreBan((p) => !p)} className="text-xs text-red-600 underline">
                {filtreBan ? "Voir tous" : "Voir uniquement les bannis"}
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
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#E63946]"
          />
        </div>

        {/* Filtres rôle */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Tous", "acheteur", "vendeur", "livreur", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setFiltreRole(r)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filtreRole === r ? "bg-[#E63946] border-[#E63946] text-white" : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {r === "Tous" ? `Tous (${utilisateurs.length})` : `${r} (${utilisateurs.filter((u) => u.role === r).length})`}
            </button>
          ))}
        </div>

        {/* Liste */}
        {chargement && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-28" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16 text-gray-400">Aucun utilisateur trouvé</div>
        )}

        {!chargement && visibles.map((u) => (
          <div key={u.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
            u.banni ? "border-red-200" : "border-gray-100"
          }`}>
            {u.banni && (
              <div className="bg-red-500 px-4 py-1.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <p className="text-white text-xs font-black">Compte banni — accès bloqué</p>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                  u.banni ? "bg-red-100 text-red-400" : "bg-[#FEF2F2] text-[#E63946]"
                }`}>
                  {u.nom.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-800 text-sm">{u.nom}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_STYLE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </div>
                  {u.email && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{u.email}</p>
                  )}
                  {u.telephone && (
                    <p className="text-xs text-gray-400 mt-0.5">{u.telephone}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-1">
                    Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Boutique associée */}
              {u.boutique && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 ${
                  STATUT_BOUTIQUE[u.boutique.statut]?.cls?.replace("text-", "bg-").replace("700", "50").replace("100", "50") ?? "bg-gray-50"
                } border border-gray-100`}>
                  <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9" />
                  </svg>
                  <p className="text-xs font-bold text-gray-700 flex-1">{u.boutique.nom}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUT_BOUTIQUE[u.boutique.statut]?.cls ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUT_BOUTIQUE[u.boutique.statut]?.label ?? u.boutique.statut}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {!u.banni ? (
                  <button
                    onClick={() => setActionModal({ user: u, type: "bannir" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Bannir
                  </button>
                ) : (
                  <button
                    onClick={() => setActionModal({ user: u, type: "debannir" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Lever le ban
                  </button>
                )}

                {u.boutique && (
                  <button
                    onClick={() => setActionModal({ user: u, type: "supprimer_boutique" })}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Suppr. boutique
                  </button>
                )}

                {u.role !== "admin" && (
                  <>
                    {/* Changer rôle */}
                    <select
                      value={u.role}
                      onChange={(e) => {
                        const r = e.target.value;
                        if (r !== u.role) setActionModal({ user: u, type: "changer_role", nouveauRole: r });
                      }}
                      className="text-xs font-bold px-2 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 focus:outline-none cursor-pointer"
                    >
                      <option value="acheteur">acheteur</option>
                      <option value="vendeur">vendeur</option>
                      <option value="livreur">livreur</option>
                      <option value="admin">admin</option>
                    </select>

                    <button
                      onClick={() => setActionModal({ user: u, type: "supprimer" })}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-50 text-gray-600 border border-gray-200 active:scale-95 transition-all flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Suppr. compte
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
