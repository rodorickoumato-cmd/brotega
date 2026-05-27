"use client";
import { useEffect, useState } from "react";
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

const STATUTS_LIBELLE: Record<Commande["statut"], { label: string; couleur: string; emoji: string }> = {
  en_attente_paiement: { label: "En attente de paiement", couleur: "amber", emoji: "⏳" },
  payee_escrow:        { label: "Payée — bloquée chez J'adore la Famille", couleur: "blue", emoji: "🔒" },
  confirmee_vendeur:   { label: "Confirmée par le vendeur", couleur: "blue", emoji: "✅" },
  en_livraison:        { label: "En livraison", couleur: "blue", emoji: "🚚" },
  livree:              { label: "Livrée", couleur: "green", emoji: "🎉" },
  litige:              { label: "Litige en cours", couleur: "red", emoji: "⚠️" },
  remboursee:          { label: "Remboursée", couleur: "gray", emoji: "↩️" },
  annulee:             { label: "Annulée", couleur: "gray", emoji: "❌" },
};

export default function PageCommande() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [chargement, setChargement] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Chargement initial + polling si en attente
  useEffect(() => {
    let actif = true;
    const charger = async () => {
      const c = await getCommandeParCode(code);
      if (!actif) return;
      setCommande(c);
      setChargement(false);
    };
    charger();
    // Polling toutes les 4s tant que la commande est en attente paiement
    const interval = setInterval(() => {
      if (commande?.statut === "en_attente_paiement") charger();
    }, 4000);
    return () => { actif = false; clearInterval(interval); };
  }, [code, commande?.statut]);

  if (chargement) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63946] mx-auto" />
        <p className="text-gray-500 mt-4">Chargement de votre commande...</p>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Commande introuvable</h2>
        <p className="text-gray-500 mb-6">Le code <strong>{code}</strong> ne correspond à aucune commande.</p>
        <Button onClick={() => router.push("/")}>Retour à l&apos;accueil</Button>
      </div>
    );
  }

  const statut = STATUTS_LIBELLE[commande.statut];
  const articles = commande.articles as ItemPanier[];
  const adresse = commande.adresse as AdresseLivraison;

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

  const peutConfirmer = ["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(commande.statut);
  const peutChatear = ["payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"].includes(commande.statut);
  const peutReclamer = STATUTS_RECLAMATION_OUVRABLE.includes(commande.statut as StatutCommande);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Code commande grand et copiable */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-500 mb-1">Code de votre commande</p>
        <p className="text-3xl font-black text-gray-800 tracking-wider">{commande.code_court}</p>
        <p className="text-xs text-gray-400 mt-2">Conservez ce code — il sert à suivre votre commande</p>
      </div>

      {/* Statut visible */}
      <div className={`bg-${statut.couleur}-50 border border-${statut.couleur}-200 rounded-2xl p-5 text-center`}>
        <div className="text-4xl mb-2">{statut.emoji}</div>
        <p className={`text-${statut.couleur}-900 font-bold text-lg`}>{statut.label}</p>
        {commande.statut === "en_attente_paiement" && (
          <p className="text-sm text-gray-600 mt-2">
            Validez la demande USSD reçue sur <strong>{commande.telephone_paiement ? formaterPhoneGabon(commande.telephone_paiement) : "votre téléphone"}</strong>
          </p>
        )}
        {commande.statut === "payee_escrow" && (
          <p className="text-sm text-gray-600 mt-2">
            Votre argent est en sécurité. Le vendeur prépare votre commande.
          </p>
        )}
      </div>

      {/* Articles */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4">Vos articles</h3>
        <div className="space-y-3">
          {articles.map((it) => (
            <div key={it.produit_id} className="flex items-center gap-3">
              {it.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0">
                  <Image src={it.image} alt={it.nom} fill sizes="48px" className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{it.nom}</p>
                <p className="text-xs text-gray-500">Qté : {it.quantite}</p>
              </div>
              <span className="font-semibold text-sm flex-shrink-0">{formatXAF(it.prix_xaf * it.quantite)}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-3 flex justify-between font-black text-base">
          <span>Total payé</span>
          <span className="text-[#E63946]">{formatXAF(commande.total)}</span>
        </div>
      </div>

      {/* Livraison */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold mb-3">Livraison</h3>
        <p className="text-sm text-gray-700">{adresse.nom_complet}</p>
        <p className="text-sm text-gray-500">📞 {formaterPhoneGabon(adresse.telephone)}</p>
        <p className="text-sm text-gray-500">📍 {adresse.ville}{adresse.quartier ? ` — ${adresse.quartier}` : ""}</p>
        {adresse.details && <p className="text-xs text-gray-400 italic mt-1">{adresse.details}</p>}
      </div>

      {/* Action confirmation livraison */}
      {peutConfirmer && (
        <div className="bg-[#FEF2F2] border border-[#E63946]/30 rounded-2xl p-5">
          <h3 className="font-bold text-[#E63946] mb-2">Avez-vous reçu votre commande ?</h3>
          <p className="text-sm text-gray-700 mb-4">
            Confirmez la livraison une fois le produit reçu en bon état. Le vendeur recevra alors son paiement.
          </p>
          <Button fullWidth size="lg" loading={confirmLoading} onClick={handleConfirmer} className="py-4">
            ✅ J&apos;ai bien reçu ma commande
          </Button>
        </div>
      )}

      {/* Contacter le vendeur */}
      {peutChatear && (
        <Link href={`/messages/${commande.id}`}
          className="flex items-center justify-center gap-2 w-full bg-white border-2 border-gray-200 text-gray-700 font-black py-4 rounded-2xl text-sm active:scale-95 transition-all shadow-sm">
          💬 Contacter le vendeur
        </Link>
      )}

      {/* Litige en cours */}
      {commande.statut === "litige" && (
        <Link href={`/reclamation/${commande.id}`}
          className="flex items-center justify-center gap-2 w-full bg-red-50 border-2 border-red-200 text-red-700 font-black py-4 rounded-2xl text-sm active:scale-95 transition-all">
          ⚠️ Voir ma réclamation en cours
        </Link>
      )}

      {/* Ouvrir une réclamation */}
      {peutReclamer && (
        <Link href={`/reclamation/${commande.id}`}
          className="flex items-center justify-center gap-2 w-full bg-white border-2 border-gray-200 text-gray-500 font-bold py-3 rounded-2xl text-sm active:scale-95 transition-all shadow-sm">
          ⚠️ Signaler un problème
        </Link>
      )}

      {/* Garantie J'adore la Famille */}
      <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-900">
        <p className="font-bold mb-1">🛡️ Garantie J'adore la Famille</p>
        <p className="text-xs">
          Pas livré, remboursé sous 48h. Votre argent est bloqué jusqu&apos;à confirmation de la livraison.
        </p>
      </div>

      <div className="text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
