"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { formatXAF } from "@/lib/utils";
import { formaterPhoneGabon } from "@/lib/phone";
import { getCommandeParCode, type ItemPanier, type AdresseLivraison } from "@/app/actions/commandes";
import type { Commande } from "@/lib/supabase/database.types";
import { STATUTS_RECLAMATION_OUVRABLE } from "@/lib/rules";
import type { StatutCommande } from "@/lib/rules";

// ─── ÉTAPES DE LA TIMELINE ────────────────────────────────────────
type Etape = {
  statut: StatutCommande;
  label: string;
  description: string;
};

const ETAPES_NORMALES: Etape[] = [
  {
    statut: "en_attente_paiement",
    label: "Paiement",
    description: "En attente de confirmation du paiement",
  },
  {
    statut: "payee_escrow",
    label: "Paiement reçu",
    description: "Votre argent est sécurisé, le vendeur prépare votre commande",
  },
  {
    statut: "confirmee_vendeur",
    label: "Confirmée",
    description: "Le vendeur a accepté et prépare votre commande",
  },
  {
    statut: "en_livraison",
    label: "En livraison",
    description: "Votre commande est en route vers vous",
  },
  {
    statut: "livree",
    label: "Livrée",
    description: "Commande reçue — merci de votre confiance",
  },
];

// Statuts hors flux normal
const STATUTS_SPECIAUX: Record<string, { label: string; couleur: string; icone: string; description: string }> = {
  litige:     { label: "Litige en cours", couleur: "red",    icone: "!", description: "Un litige est ouvert sur cette commande. L'équipe J'adore la Famille traite votre réclamation." },
  remboursee: { label: "Remboursée",      couleur: "gray",   icone: "↩", description: "Cette commande a été remboursée intégralement." },
  annulee:    { label: "Annulée",         couleur: "gray",   icone: "×", description: "Cette commande a été annulée." },
};

function indexEtapeActuelle(statut: string): number {
  return ETAPES_NORMALES.findIndex((e) => e.statut === statut);
}

function CercleEtape({ fait, actif, icone }: { fait: boolean; actif: boolean; icone: string }) {
  if (fait) {
    return (
      <div className="w-9 h-9 rounded-full bg-[#E63946] flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (actif) {
    return (
      <div className="w-9 h-9 rounded-full border-2 border-[#E63946] bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <div className="w-3 h-3 rounded-full bg-[#E63946] animate-pulse" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center flex-shrink-0">
      <span className="text-xs text-gray-300">{icone}</span>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────
export default function PageCommande() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [chargement, setChargement] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [codeConfirmation, setCodeConfirmation] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const c = await getCommandeParCode(code);
    setCommande(c);
    setChargement(false);
  }, [code]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Polling si paiement en attente
  useEffect(() => {
    if (commande?.statut !== "en_attente_paiement") return;
    const interval = setInterval(() => { charger(); }, 5000);
    return () => clearInterval(interval);
  }, [commande?.statut, charger]);

  // Récupérer le code de confirmation quand la commande est en livraison
  useEffect(() => {
    if (!commande?.id || commande.statut !== "en_livraison") {
      setCodeConfirmation(null);
      return;
    }
    fetch(`/api/livraisons/code-client?commandeId=${commande.id}`)
      .then(r => r.json())
      .then((d: { code?: string | null }) => setCodeConfirmation(d.code ?? null))
      .catch(() => null);
  }, [commande?.id, commande?.statut]);

  if (chargement) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-5 text-sm">Chargement de votre commande…</p>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Commande introuvable</h2>
        <p className="text-gray-500 mb-6 text-sm">Le code <strong className="text-gray-700">{code}</strong> ne correspond à aucune commande.</p>
        <Button onClick={() => router.push("/")}>Retour à l&apos;accueil</Button>
      </div>
    );
  }

  const articles = commande.articles as ItemPanier[];
  const adresse  = commande.adresse  as AdresseLivraison;
  const statut   = commande.statut   as StatutCommande;

  const statutSpecial = STATUTS_SPECIAUX[statut];
  const idxActuel     = indexEtapeActuelle(statut);

  const peutConfirmer = ["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(statut);
  const peutChatear   = ["payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"].includes(statut);
  const peutReclamer  = STATUTS_RECLAMATION_OUVRABLE.includes(statut);

  const handleConfirmer = async () => {
    if (!confirm("Confirmez-vous avoir bien reçu votre commande en bon état ? Cette action libère le paiement au vendeur.")) return;
    setConfirmLoading(true);
    try {
      const r = await fetch("/api/commandes/confirmer-livraison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandeId: commande.id }),
      });
      const res = await r.json() as { succes?: boolean; erreur?: string };
      if (res.erreur) { toast(res.erreur, "error"); return; }
      toast("Livraison confirmée. Merci de votre confiance !", "success");
      setCommande({ ...commande, statut: "livree", livree_at: new Date().toISOString() });
    } catch {
      toast("Erreur réseau. Réessayez.", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">

      {/* ── En-tête code commande ── */}
      <div className="bg-[#1A202C] rounded-2xl px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Commande</p>
          <p className="text-white font-black text-2xl tracking-widest">{commande.code_court}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs mb-1">Total</p>
          <p className="text-[#E63946] font-black text-lg">{formatXAF(commande.total)}</p>
        </div>
      </div>

      {/* ── Statut spécial (litige / remboursée / annulée) ── */}
      {statutSpecial ? (
        <div className={`rounded-2xl p-5 flex items-start gap-4 ${
          statutSpecial.couleur === "red" ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0 ${
            statutSpecial.couleur === "red" ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"
          }`}>
            {statutSpecial.icone}
          </div>
          <div>
            <p className={`font-black text-base ${statutSpecial.couleur === "red" ? "text-red-800" : "text-gray-700"}`}>
              {statutSpecial.label}
            </p>
            <p className={`text-sm mt-1 ${statutSpecial.couleur === "red" ? "text-red-600" : "text-gray-500"}`}>
              {statutSpecial.description}
            </p>
          </div>
        </div>
      ) : (
        /* ── Timeline normale ── */
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Suivi de commande</p>
          <div className="space-y-0">
            {ETAPES_NORMALES.map((etape, idx) => {
              const fait  = idxActuel > idx;
              const actif = idxActuel === idx;
              const futur = idxActuel < idx;
              return (
                <div key={etape.statut} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CercleEtape
                      fait={fait}
                      actif={actif}
                      icone={String(idx + 1)}
                    />
                    {idx < ETAPES_NORMALES.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 rounded-full ${fait ? "bg-[#E63946]" : "bg-gray-100"}`} />
                    )}
                  </div>
                  <div className={`pb-8 pt-1.5 ${idx === ETAPES_NORMALES.length - 1 ? "pb-0" : ""}`}>
                    <p className={`text-sm font-black leading-tight ${
                      actif ? "text-[#E63946]" : fait ? "text-gray-700" : futur ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {etape.label}
                    </p>
                    {(actif || fait) && (
                      <p className={`text-xs mt-0.5 leading-snug ${actif ? "text-gray-600" : "text-gray-400"}`}>
                        {etape.description}
                      </p>
                    )}
                    {actif && statut === "en_attente_paiement" && commande.mode_paiement !== "especes" && (
                      <p className="text-xs mt-1.5 text-amber-700 font-medium bg-amber-50 rounded-lg px-2.5 py-1.5 inline-block">
                        Validez la demande USSD sur {commande.telephone_paiement ? formaterPhoneGabon(commande.telephone_paiement) : "votre téléphone"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Code de confirmation livraison ── */}
      {statut === "en_livraison" && codeConfirmation && (
        <div className="bg-[#1A202C] rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#E63946] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-sm">Code de remise</p>
              <p className="text-white/50 text-xs">Montrez ce code au livreur à l&apos;arrivée</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 mb-4">
            {codeConfirmation.split("").map((chiffre, i) => (
              <div key={i} className="w-10 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-white font-black text-xl tracking-widest">{chiffre}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/40 text-xs">
            Ne partagez ce code qu&apos;avec le livreur en face de vous
          </p>
        </div>
      )}

      {/* ── Action confirmer réception ── */}
      {peutConfirmer && (
        <div className="bg-white rounded-2xl border-2 border-[#E63946]/20 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#E63946]/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-gray-800 text-base">Avez-vous reçu votre commande ?</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Confirmez dès que vous avez le produit en main. Le vendeur recevra son paiement.
              </p>
            </div>
          </div>
          <Button fullWidth size="lg" loading={confirmLoading} onClick={handleConfirmer}>
            J&apos;ai bien reçu ma commande
          </Button>
        </div>
      )}

      {/* ── Articles ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-gray-50">
          <p className="font-black text-gray-800 text-sm">Articles commandés</p>
        </div>
        <div className="divide-y divide-gray-50">
          {articles.map((it) => (
            <div key={it.produit_id} className="flex items-center gap-3 px-5 py-3">
              {it.image ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden relative flex-shrink-0 bg-gray-50">
                  <Image src={it.image} alt={it.nom} fill sizes="48px" className="object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{it.nom}</p>
                <p className="text-xs text-gray-400 mt-0.5">Qté : {it.quantite}</p>
              </div>
              <span className="font-black text-sm text-gray-700 flex-shrink-0">{formatXAF(it.prix_xaf * it.quantite)}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-gray-50 flex justify-between items-center">
          <span className="text-sm text-gray-500">Total payé</span>
          <span className="font-black text-[#E63946] text-base">{formatXAF(commande.total)}</span>
        </div>
      </div>

      {/* ── Adresse de livraison ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="font-black text-gray-800 text-sm mb-3">Adresse de livraison</p>
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-gray-700">{adresse.nom_complet}</p>
          <div className="flex items-center gap-2 text-gray-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.62 5 2 2 0 0 1 3.6 2.96h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.76-.76a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.72 17z"/>
            </svg>
            <span>{formaterPhoneGabon(adresse.telephone)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{adresse.ville}{adresse.quartier ? ` — ${adresse.quartier}` : ""}</span>
          </div>
          {adresse.details && (
            <p className="text-xs text-gray-400 italic pl-5">{adresse.details}</p>
          )}
        </div>
      </div>

      {/* ── Garantie ── */}
      <div className="bg-[#F0F9F4] border border-[#BBE8CE] rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <p className="font-black text-green-900 text-sm">Garantie J&apos;adore la Famille</p>
          <p className="text-xs text-green-700 mt-0.5">
            Non reçu = remboursé sous 48h. Votre argent est bloqué jusqu&apos;à confirmation de la livraison.
          </p>
        </div>
      </div>

      {/* ── Actions secondaires ── */}
      <div className="space-y-2.5">
        {peutChatear && (
          <Link href={`/messages/${commande.id}`}
            className="flex items-center justify-center gap-2.5 w-full bg-white border-2 border-gray-200 text-gray-700 font-black py-4 rounded-2xl text-sm active:scale-[0.98] transition-all shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Contacter le vendeur
          </Link>
        )}

        {commande.statut === "litige" && (
          <Link href={`/reclamation/${commande.id}`}
            className="flex items-center justify-center gap-2.5 w-full bg-red-50 border-2 border-red-200 text-red-700 font-black py-4 rounded-2xl text-sm active:scale-[0.98] transition-all">
            Voir ma réclamation en cours
          </Link>
        )}

        {peutReclamer && commande.statut !== "litige" && (
          <Link href={`/reclamation/${commande.id}`}
            className="flex items-center justify-center gap-2.5 w-full bg-white border border-gray-200 text-gray-400 font-semibold py-3 rounded-2xl text-sm active:scale-[0.98] transition-all">
            Signaler un problème
          </Link>
        )}
      </div>

      <div className="text-center pb-4">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
