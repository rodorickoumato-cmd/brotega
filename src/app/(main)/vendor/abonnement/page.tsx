"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/rules";
import {
  getAbonnementActuel,
  souscrireGratuit,
  initierPaiementAbonnement,
  verifierStatutPaiementAbonnement,
} from "@/app/actions/abonnements";
import { formaterPhoneGabon, vers241 } from "@/lib/phone";

const PLANS_LISTE: { id: PlanId; emoji: string; badge?: string }[] = [
  { id: "gratuit",     emoji: "🌱" },
  { id: "mensuel",     emoji: "📦" },
  { id: "trimestriel", emoji: "🚀", badge: "Populaire" },
  { id: "semestriel",  emoji: "💎" },
  { id: "annuel",      emoji: "👑", badge: "Meilleur prix" },
];

function formatXAF(n: number) {
  if (n === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-GA", { style: "currency", currency: "XAF", minimumFractionDigits: 0 }).format(n);
}

type Ecran = "selection" | "paiement" | "attente" | "succes" | "echec";

export default function AbonnementPage() {
  const [planActif, setPlanActif] = useState<PlanId | null>(null);
  const [planSelectionne, setPlanSelectionne] = useState<PlanId>("trimestriel");
  const [ecran, setEcran] = useState<Ecran>("selection");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  // Paiement
  const [telephone, setTelephone] = useState("");
  const [operateur, setOperateur] = useState<"airtel" | "moov">("airtel");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    getAbonnementActuel().then((abo) => {
      if (abo) setPlanActif(abo.plan as PlanId);
    });
  }, []);

  // Polling du statut de paiement
  const pollStatut = useCallback((paiementId: string) => {
    const MAX = 30;
    let essais = 0;
    const interval = setInterval(async () => {
      essais++;
      const res = await verifierStatutPaiementAbonnement(paiementId);
      if (res.statut === "reussi") {
        clearInterval(interval);
        setPlanActif(planSelectionne);
        setEcran("succes");
      } else if (res.statut === "echec" || essais >= MAX) {
        clearInterval(interval);
        setEcran("echec");
      }
    }, 3000);
  }, [planSelectionne]);

  const souscrire = async () => {
    setErreur("");
    const plan = PLANS[planSelectionne];
    if (plan.prix_xaf === 0) {
      setLoading(true);
      const res = await souscrireGratuit();
      setLoading(false);
      if (res.erreur) { setErreur(res.erreur); return; }
      setPlanActif("gratuit");
      setEcran("succes");
      return;
    }
    setEcran("paiement");
  };

  const payer = async () => {
    setErreur("");
    if (!vers241(telephone)) { setErreur("Numéro invalide. Format : 01 23 45 67"); return; }
    setLoading(true);
    const res = await initierPaiementAbonnement({ planId: planSelectionne, telephone, provider: operateur });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setInstructions(res.instructions ?? "Validez le paiement USSD sur votre téléphone.");
    setEcran("attente");
    pollStatut(res.paiementId!);
  };

  const plan = PLANS[planSelectionne];
  const estActif = planSelectionne === planActif;

  // ── Sélection du plan ────────────────────────────────────────────────────
  if (ecran === "selection") return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-8">
        <Link href="/vendor/dashboard" className="text-white/70 text-sm">← Dashboard</Link>
        <h1 className="text-2xl font-black text-white mt-2">Abonnement</h1>
        {planActif && (
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-bold">Plan actuel : {PLANS[planActif].label}</span>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        <div className="bg-white rounded-3xl p-4 shadow-sm space-y-2">
          {PLANS_LISTE.map(({ id, emoji, badge }) => {
            const p = PLANS[id];
            const selectionne = planSelectionne === id;
            const actuel = planActif === id;
            return (
              <button key={id}
                onClick={() => { setPlanSelectionne(id); setErreur(""); }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                  selectionne ? "border-[#E63946] bg-[#FEF2F2]" : "border-gray-100 bg-gray-50"
                }`}>
                <span className="text-2xl flex-shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-sm ${selectionne ? "text-[#E63946]" : "text-gray-800"}`}>{p.label}</span>
                    {badge && <span className="text-xs bg-[#E63946] text-white font-bold px-2 py-0.5 rounded-full">{badge}</span>}
                    {actuel && <span className="text-xs bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded-full">Actuel</span>}
                  </div>
                  <span className="text-xs text-gray-500">
                    {p.max_produits === Infinity ? "Produits illimités" : `${p.max_produits} produits max`}
                    {p.duree_jours ? ` · ${p.duree_jours} jours` : ""}
                  </span>
                </div>
                <span className={`font-black text-sm flex-shrink-0 ${selectionne ? "text-[#E63946]" : "text-gray-600"}`}>
                  {formatXAF(p.prix_xaf)}
                </span>
              </button>
            );
          })}
        </div>

        {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>}

        <button onClick={souscrire} disabled={loading || estActif}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all">
          {loading ? "Traitement..."
            : estActif ? "Plan actuel"
            : plan.prix_xaf === 0 ? "Activer le plan gratuit"
            : `Souscrire — ${formatXAF(plan.prix_xaf)} →`}
        </button>

        <p className="text-center text-xs text-gray-400">Paiement par Airtel Money ou Moov Money</p>
      </div>
    </div>
  );

  // ── Formulaire de paiement ───────────────────────────────────────────────
  if (ecran === "paiement") return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <button onClick={() => setEcran("selection")} className="text-white/70 text-sm">← Retour</button>
        <h1 className="text-2xl font-black text-white mt-2">Paiement Mobile Money</h1>
        <p className="text-white/70 text-sm mt-1">Plan {plan.label} — {formatXAF(plan.prix_xaf)}</p>
      </div>

      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-5">
        <div>
          <label className="text-sm font-bold text-gray-700 mb-3 block">Opérateur</label>
          <div className="grid grid-cols-2 gap-3">
            {(["airtel", "moov"] as const).map((op) => (
              <button key={op} onClick={() => setOperateur(op)}
                className={`py-4 rounded-2xl border-2 font-black text-sm transition-all ${
                  operateur === op ? "border-[#E63946] bg-[#FEF2F2] text-[#E63946]" : "border-gray-200 text-gray-600"
                }`}>
                {op === "airtel" ? "📶 Airtel Money" : "📡 Moov Money"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Numéro Mobile Money</label>
          <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#E63946] transition-colors">
            <span className="bg-gray-50 px-4 flex items-center text-sm text-gray-600 border-r-2 border-gray-200 font-bold whitespace-nowrap">
              🇬🇦 +241
            </span>
            <input value={telephone}
              onChange={(e) => { setTelephone(e.target.value); setErreur(""); }}
              onKeyDown={(e) => e.key === "Enter" && payer()}
              placeholder="01 23 45 67" inputMode="tel" autoFocus
              className="flex-1 px-4 py-4 text-base font-medium focus:outline-none" />
          </div>
        </div>

        {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>}

        <button onClick={payer} disabled={loading}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
          {loading ? "Envoi en cours..." : `Payer ${formatXAF(plan.prix_xaf)} →`}
        </button>

        <p className="text-center text-xs text-gray-400">
          Vous recevrez un USSD sur votre téléphone pour confirmer
        </p>
      </div>
    </div>
  );

  // ── En attente de confirmation ───────────────────────────────────────────
  if (ecran === "attente") return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-spin w-16 h-16 rounded-full border-4 border-[#E63946] border-t-transparent mb-6" />
      <h2 className="text-xl font-black text-gray-800 mb-2">En attente de confirmation</h2>
      <p className="text-sm text-gray-500 mb-4">{instructions}</p>
      <p className="text-xs text-gray-400">{formaterPhoneGabon(vers241(telephone) ?? telephone)}</p>
      <p className="text-xs text-gray-400 mt-6">La page se met à jour automatiquement…</p>
    </div>
  );

  // ── Succès ───────────────────────────────────────────────────────────────
  if (ecran === "succes") return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-[#FEF2F2] rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl">✅</span>
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">Plan activé !</h2>
      <p className="text-sm text-gray-500 mb-8">
        {planActif ? `Votre plan ${PLANS[planActif].label} est maintenant actif.` : "Votre plan est maintenant actif."}
      </p>
      <Link href="/vendor/dashboard"
        className="bg-[#E63946] text-white font-black px-8 py-4 rounded-2xl active:scale-95 transition-all">
        Retour au dashboard →
      </Link>
    </div>
  );

  // ── Échec ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl">❌</span>
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">Paiement échoué</h2>
      <p className="text-sm text-gray-500 mb-8">
        Le paiement n&apos;a pas abouti. Vérifiez votre solde et réessayez.
      </p>
      <button onClick={() => { setEcran("paiement"); setErreur(""); }}
        className="bg-[#E63946] text-white font-black px-8 py-4 rounded-2xl active:scale-95 transition-all">
        Réessayer →
      </button>
    </div>
  );
}
