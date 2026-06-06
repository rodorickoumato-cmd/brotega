"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ouvrirReclamation, getReclamationCommande } from "@/app/actions/reclamations";
import { STATUTS_RECLAMATION_OUVRABLE } from "@/lib/rules";
import type { Reclamation, Commande } from "@/lib/supabase/database.types";
import type { StatutCommande } from "@/lib/rules";

const STATUT_RECLAMATION: Record<Reclamation["statut"], { label: string; emoji: string; cls: string }> = {
  ouverte:          { label: "Ouverte",                emoji: "🔴", cls: "text-red-700 bg-red-50 border-red-200" },
  en_cours:         { label: "En cours d'examen",      emoji: "🔵", cls: "text-blue-700 bg-blue-50 border-blue-200" },
  resolue_acheteur: { label: "Résolue en votre faveur",emoji: "✅", cls: "text-green-700 bg-green-50 border-green-200" },
  resolue_vendeur:  { label: "Résolue en faveur du vendeur", emoji: "⚠️", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  fermee:           { label: "Fermée",                 emoji: "🔒", cls: "text-gray-600 bg-gray-50 border-gray-200" },
};

export default function ReclamationPage() {
  const { commandeId } = useParams<{ commandeId: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [reclamation, setReclamation] = useState<Reclamation | null>(null);
  const [motif, setMotif] = useState("");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: cmd } = await supabase
        .from("commandes")
        .select("id, code_court, statut, utilisateur_id")
        .eq("id", commandeId)
        .single();

      if (!cmd || cmd.utilisateur_id !== user.id) { router.push("/"); return; }
      setCommande(cmd as Commande);

      const recl = await getReclamationCommande(commandeId);
      setReclamation(recl);
      setChargement(false);
    })();
  }, [commandeId, router]);

  const handleSoumettre = async () => {
    setErreur("");
    setEnvoi(true);
    const res = await ouvrirReclamation(commandeId, motif);
    setEnvoi(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setSucces(true);
    setReclamation({
      id: "new",
      commande_id: commandeId,
      utilisateur_id: "",
      motif: motif.trim(),
      statut: "ouverte",
      resolution: null,
      admin_id: null,
      resolue_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-[#E63946] border-t-transparent" />
      </div>
    );
  }

  const peutReclamer = commande && STATUTS_RECLAMATION_OUVRABLE.includes(commande.statut as StatutCommande);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/commande/${commande?.code_court}`} className="text-gray-500 text-xl">←</Link>
        <div>
          <h1 className="text-lg font-black text-gray-800">Réclamation</h1>
          <p className="text-xs text-gray-400">Commande {commande?.code_court ?? commandeId.slice(0, 8)}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4 max-w-xl mx-auto">

        {/* Réclamation existante */}
        {reclamation && (
          <div className={`rounded-2xl border p-5 ${STATUT_RECLAMATION[reclamation.statut].cls}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{STATUT_RECLAMATION[reclamation.statut].emoji}</span>
              <p className="font-black text-base">{STATUT_RECLAMATION[reclamation.statut].label}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-gray-500 mb-1">Votre motif</p>
              <p className="text-sm text-gray-800">{reclamation.motif}</p>
            </div>
            {reclamation.resolution && (
              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 mb-1">Décision de l&apos;admin</p>
                <p className="text-sm text-gray-800">{reclamation.resolution}</p>
              </div>
            )}
            {!reclamation.resolution && (
              <p className="text-xs text-center mt-3 opacity-70">
                L&apos;équipe J'adore la Famille examine votre réclamation. Vous serez notifié(e) de la décision.
              </p>
            )}
          </div>
        )}

        {/* Formulaire — uniquement si pas de réclamation et statut éligible */}
        {!reclamation && !succes && peutReclamer && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="font-black text-gray-800 text-lg">Ouvrir une réclamation</h2>
              <p className="text-sm text-gray-500 mt-1">
                Décrivez précisément le problème. Votre argent restera bloqué jusqu&apos;à résolution.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Décrivez le problème <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motif}
                onChange={(e) => { if (e.target.value.length <= 5000) { setMotif(e.target.value); setErreur(""); } }}
                placeholder="Ex : Je n'ai pas reçu ma commande, le produit est endommagé, le colis est incomplet..."
                rows={5}
                className={`w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${
                  erreur ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#E63946]"
                }`}
              />
              <p className="text-xs text-gray-400 mt-1">{motif.length} / 5000 caractères</p>
            </div>

            {erreur && (
              <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {erreur}
              </p>
            )}

            <button
              onClick={handleSoumettre}
              disabled={envoi || motif.trim().length < 10}
              className="w-full bg-red-500 text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all"
            >
              {envoi ? "Envoi en cours..." : "Soumettre la réclamation"}
            </button>

            <p className="text-xs text-center text-gray-400">
              🛡️ L&apos;équipe J'adore la Famille traitera votre réclamation sous 48h
            </p>
          </div>
        )}

        {/* Succès */}
        {succes && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="font-black text-gray-800 text-xl mb-2">Réclamation soumise</h2>
            <p className="text-sm text-gray-500 mb-6">
              Votre réclamation a été enregistrée. L&apos;équipe J'adore la Famille vous contactera sous 48h.
            </p>
          </div>
        )}

        {/* Statut non éligible */}
        {!reclamation && !peutReclamer && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">ℹ️</div>
            <p className="font-bold text-amber-800">Réclamation non disponible</p>
            <p className="text-sm text-amber-700 mt-1">
              Les réclamations ne sont disponibles que pour les commandes payées ou en cours de livraison.
            </p>
          </div>
        )}

        <Link href={`/commande/${commande?.code_court}`}
          className="block text-center text-sm text-gray-500 py-2">
          ← Retour à la commande
        </Link>
      </div>
    </div>
  );
}
