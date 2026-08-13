"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getConfigDetailAdmin, sauvegarderSection } from "@/app/actions/config";
import { getPvitComptesAdmin, sauvegarderPvitCompte } from "@/app/actions/pvit";
import type { PvitConfigRow } from "@/lib/supabase/database.types";
import Link from "next/link";

type Ligne = {
  cle: string;
  valeur: unknown;
  description: string | null;
  categorie: string;
  modifie_le: string;
};

type Toast = { message: string; type: "succes" | "erreur" };

const LABELS: Record<string, string> = {
  maintenance_actif:             "Mode maintenance",
  maintenance_message:           "Message de maintenance",
  banniere_actif:                "Bannière active",
  banniere_texte:                "Texte de la bannière",
  banniere_type:                 "Type de bannière",
  contact_whatsapp:              "Numéro WhatsApp support",
  contact_email:                 "Email support",
  reseaux_facebook:              "Lien Facebook",
  reseaux_instagram:             "Lien Instagram",
  reseaux_twitter:               "Lien Twitter/X",
  livraison_locale_xaf:          "Tarif livraison locale (XAF)",
  plans_prix:                    "Prix des plans",
  max_produits_gratuit:          "Produits max (gratuit)",
  taux_commission:               "Taux de commission",
  frais_mobile_money_taux:       "Frais Mobile Money",
  airtel_money_actif:            "Airtel Money",
  moov_money_actif:              "Moov Money",
  jours_auto_liberation_escrow:  "Jours auto-libération escrow",
  retrait_min_xaf:               "Retrait minimum (XAF)",
  max_retraits_par_jour:         "Max retraits / jour",
};

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  systeme:     { label: "Système",      icon: "🔧" },
  contact:     { label: "Contact & Réseaux sociaux", icon: "📞" },
  abonnements: { label: "Abonnements",  icon: "🏷️" },
  paiements:   { label: "Paiements",    icon: "💳" },
  commissions: { label: "Commissions",  icon: "📊" },
  livraison:   { label: "Livraison",    icon: "🚚" },
  wallet:      { label: "Wallet",       icon: "💰" },
};

function formaterValeur(valeur: unknown): string {
  if (typeof valeur === "object" && valeur !== null) return JSON.stringify(valeur);
  return String(valeur);
}

function parseValeur(cle: string, raw: string): unknown {
  if (cle === "airtel_money_actif" || cle === "moov_money_actif") return raw === "true";
  if (cle === "plans_prix") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  const n = Number(raw);
  return isNaN(n) ? raw : n;
}

// ── Éditeur pour l'objet plans_prix ────────────────────────────────────────
function EditorPlansPrix({
  valeur,
  onChange,
}: {
  valeur: { mensuel: number; trimestriel: number; semestriel: number; annuel: number };
  onChange: (v: unknown) => void;
}) {
  const champs: Array<{ cle: keyof typeof valeur; label: string; jours: string }> = [
    { cle: "mensuel",     label: "Mensuel",      jours: "30 jours"  },
    { cle: "trimestriel", label: "Trimestriel",  jours: "90 jours"  },
    { cle: "semestriel",  label: "Semestriel",   jours: "180 jours" },
    { cle: "annuel",      label: "Annuel",       jours: "365 jours" },
  ];

  function handleChange(cle: string, raw: string) {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0) {
      onChange({ ...valeur, [cle]: n });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {champs.map(({ cle, label, jours }) => (
        <div key={cle} className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">{label} <span className="font-normal">({jours})</span></p>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              step={500}
              value={valeur[cle]}
              onChange={(e) => handleChange(cle, e.target.value)}
              className="flex-1 text-sm font-bold bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#E63946]"
            />
            <span className="text-xs text-gray-400">XAF</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Carte d'édition d'un paramètre individuel ──────────────────────────────
function CarteCle({
  ligne,
  onChange,
}: {
  ligne: Ligne;
  onChange: (cle: string, valeur: unknown) => void;
}) {
  const label = LABELS[ligne.cle] ?? ligne.cle;

  if (ligne.cle === "plans_prix") {
    const v = ligne.valeur as { mensuel: number; trimestriel: number; semestriel: number; annuel: number };
    return (
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        {ligne.description && <p className="text-xs text-gray-400 mt-0.5">{ligne.description}</p>}
        <EditorPlansPrix valeur={v} onChange={(nv) => onChange(ligne.cle, nv)} />
      </div>
    );
  }

  if (ligne.cle === "airtel_money_actif" || ligne.cle === "moov_money_actif") {
    const actif = ligne.valeur as boolean;
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{label}</p>
          {ligne.description && <p className="text-xs text-gray-400 mt-0.5">{ligne.description}</p>}
        </div>
        <button
          onClick={() => onChange(ligne.cle, !actif)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${actif ? "bg-green-500" : "bg-gray-300"}`}
          aria-label={actif ? "Désactiver" : "Activer"}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${actif ? "translate-x-7" : "translate-x-1"}`}
          />
        </button>
      </div>
    );
  }

  // Champs texte libre (URL, email, message)
  if (["maintenance_message", "banniere_texte", "contact_whatsapp", "contact_email",
       "reseaux_facebook", "reseaux_instagram", "reseaux_twitter"].includes(ligne.cle)) {
    return (
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        {ligne.description && <p className="text-xs text-gray-400 mt-0.5 mb-2">{ligne.description}</p>}
        <input
          type="text"
          value={String(ligne.valeur ?? "")}
          onChange={(e) => onChange(ligne.cle, e.target.value)}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
        />
      </div>
    );
  }

  // Sélecteur type bannière
  if (ligne.cle === "banniere_type") {
    return (
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        {ligne.description && <p className="text-xs text-gray-400 mt-0.5 mb-2">{ligne.description}</p>}
        <select
          value={String(ligne.valeur ?? "info")}
          onChange={(e) => onChange(ligne.cle, e.target.value)}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
        >
          <option value="info">ℹ️ Information (bleu)</option>
          <option value="succes">✅ Succès (vert)</option>
          <option value="alerte">⚠️ Alerte (rouge)</option>
        </select>
      </div>
    );
  }

  if (ligne.cle === "taux_commission" || ligne.cle === "frais_mobile_money_taux") {
    const pct = Math.round((ligne.valeur as number) * 100);
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-gray-800 text-sm">{label}</p>
          <span className="text-sm font-bold text-[#E63946]">{pct}%</span>
        </div>
        {ligne.description && <p className="text-xs text-gray-400 mb-2">{ligne.description}</p>}
        <input
          type="range"
          min={0}
          max={ligne.cle === "taux_commission" ? 20 : 10}
          step={1}
          value={pct}
          onChange={(e) => onChange(ligne.cle, parseInt(e.target.value, 10) / 100)}
          className="w-full accent-[#E63946]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>0%</span>
          <span>{ligne.cle === "taux_commission" ? "20%" : "10%"}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="font-semibold text-gray-800 text-sm">{label}</p>
      {ligne.description && <p className="text-xs text-gray-400 mt-0.5 mb-2">{ligne.description}</p>}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          min={0}
          value={formaterValeur(ligne.valeur)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!isNaN(n) && n >= 0) onChange(ligne.cle, n);
          }}
          className="flex-1 text-sm font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
        />
        {(ligne.cle === "retrait_min_xaf") && <span className="text-xs text-gray-400">XAF</span>}
        {(ligne.cle === "jours_auto_liberation_escrow" || ligne.cle === "max_retraits_par_jour") &&
          <span className="text-xs text-gray-400">{ligne.cle.includes("jour") ? "jours" : ""}</span>}
      </div>
    </div>
  );
}

// ── Carte des comptes marchands PVIT (Airtel / Moov) ───────────────────────
// Distincte de app_config : ces codes ne doivent jamais transiter par une
// table lisible publiquement (voir migration 008_pvit_comptes_operateurs.sql).
const OPERATEUR_LABEL: Record<"airtel" | "moov", string> = {
  airtel: "Airtel Money",
  moov:   "Moov Money",
};

function CartePvitComptes() {
  const [comptes, setComptes] = useState<PvitConfigRow[]>([]);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getPvitComptesAdmin();
      if (res.comptes) setComptes(res.comptes);
      setChargement(false);
    })();
  }, []);

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleLocalChange(operateur: string, valeur: string) {
    setComptes((prev) => prev.map((c) => c.operateur === operateur ? { ...c, account_code: valeur } : c));
  }

  async function handleSave(operateur: "airtel" | "moov") {
    setSauvegarde(operateur);
    const compte = comptes.find((c) => c.operateur === operateur);
    const res = await sauvegarderPvitCompte(operateur, compte?.account_code ?? "");
    setSauvegarde(null);
    afficherToast(res.succes ? "Compte enregistré." : (res.erreur ?? "Erreur"), res.succes ? "succes" : "erreur");
  }

  if (chargement) return <div className="bg-white rounded-2xl h-40 animate-pulse" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">🏦</span>
        <h2 className="font-bold text-gray-800">Comptes marchands PVIT</h2>
      </div>
      {toast && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}
      <div className="px-4 py-4 space-y-4">
        <p className="text-xs text-gray-400 -mt-1">
          Code de compte marchand (`merchant_operation_account_code`) transmis à PVIT pour chaque opérateur.
          Interne uniquement — jamais affiché à l&apos;acheteur.
        </p>
        {(["airtel", "moov"] as const).map((operateur) => {
          const compte = comptes.find((c) => c.operateur === operateur);
          return (
            <div key={operateur}>
              <p className="font-semibold text-gray-800 text-sm mb-1">{OPERATEUR_LABEL[operateur]}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={compte?.account_code ?? ""}
                  onChange={(e) => handleLocalChange(operateur, e.target.value)}
                  placeholder="Code de compte marchand PVIT"
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                />
                <button
                  onClick={() => handleSave(operateur)}
                  disabled={sauvegarde === operateur}
                  className="bg-[#E63946] text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-[0.98] disabled:opacity-60 transition-all"
                >
                  {sauvegarde === operateur ? "…" : "Enregistrer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Carte par catégorie ────────────────────────────────────────────────────
function CarteCategorie({
  categorie,
  lignes,
  onSave,
}: {
  categorie: string;
  lignes: Ligne[];
  onSave: (entrees: Array<{ cle: string; valeur: unknown }>) => Promise<void>;
}) {
  const [local, setLocal] = useState<Ligne[]>(lignes);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [modifie, setModifie] = useState(false);

  useEffect(() => {
    setLocal(lignes);
    setModifie(false);
  }, [lignes]);

  function handleChange(cle: string, valeur: unknown) {
    setLocal((prev) => prev.map((l) => l.cle === cle ? { ...l, valeur } : l));
    setModifie(true);
  }

  async function handleSave() {
    setSauvegarde(true);
    await onSave(local.map(({ cle, valeur }) => ({ cle, valeur })));
    setSauvegarde(false);
    setModifie(false);
  }

  const info = CATEGORIES[categorie] ?? { label: categorie, icon: "⚙️" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{info.icon}</span>
        <h2 className="font-bold text-gray-800">{info.label}</h2>
      </div>
      <div className="px-4 py-4 space-y-5">
        {local.map((ligne) => (
          <CarteCle key={ligne.cle} ligne={ligne} onChange={handleChange} />
        ))}
      </div>
      {modifie && (
        <div className="px-4 pb-4">
          <button
            onClick={handleSave}
            disabled={sauvegarde}
            className="w-full bg-[#E63946] text-white font-bold py-3 rounded-xl active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {sauvegarde ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ConfigurationPage() {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }

      const res = await getConfigDetailAdmin();
      if (res.lignes) setLignes(res.lignes as Ligne[]);
      setChargement(false);
    })();
  }, [router]);

  const handleSauvegarderSection = useCallback(
    async (entrees: Array<{ cle: string; valeur: unknown }>) => {
      const res = await sauvegarderSection(entrees);
      if (res.succes) {
        afficherToast("Configuration sauvegardée.", "succes");
        // Refresh local state
        const maj = await getConfigDetailAdmin();
        if (maj.lignes) setLignes(maj.lignes as Ligne[]);
      } else {
        afficherToast(res.erreur ?? "Erreur lors de la sauvegarde.", "erreur");
      }
    },
    []
  );

  const parCategorie = lignes.reduce<Record<string, Ligne[]>>((acc, l) => {
    if (!acc[l.categorie]) acc[l.categorie] = [];
    acc[l.categorie].push(l);
    return acc;
  }, {});

  const ordreCategories = ["systeme", "contact", "abonnements", "paiements", "commissions", "livraison", "wallet"];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">
          ‹ Dashboard Admin
        </Link>
        <h1 className="text-2xl font-black text-white">Configuration</h1>
        <p className="text-white/70 text-sm mt-1">Paramètres dynamiques — aucun redéploiement requis</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      <div className="px-4 py-5 space-y-4">
        {chargement ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
          ))
        ) : (
          ordreCategories.map((cat) => (
            <div key={cat} className="space-y-4">
              {parCategorie[cat]?.length ? (
                <CarteCategorie
                  categorie={cat}
                  lignes={parCategorie[cat]}
                  onSave={handleSauvegarderSection}
                />
              ) : null}
              {cat === "paiements" && <CartePvitComptes />}
            </div>
          ))
        )}

        {/* Note bas de page */}
        {!chargement && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
            <p className="text-xs font-bold text-blue-600 mb-1">Comment ça marche ?</p>
            <p className="text-xs text-blue-500 leading-relaxed">
              Chaque modification est appliquée immédiatement sans redéploiement.
              Les nouveaux abonnements utiliseront les prix mis à jour.
              Les transactions en cours ne sont pas affectées.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
