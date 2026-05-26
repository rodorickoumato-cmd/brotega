"use client";
import { useState, useEffect } from "react";
import { CITIES_GABON } from "@/lib/utils";
import { devenirVendeur } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function VendorRegisterPage() {
  const [nomBoutique, setNomBoutique] = useState("");
  const [ville, setVille] = useState("Libreville");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [verification, setVerification] = useState(true); // bloque le formulaire pendant le check

  // Vérifie le rôle AVANT d'afficher quoi que ce soit
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) { setVerification(false); return; }
        return supabase.from("utilisateurs").select("role").eq("id", user.id).single()
          .then(({ data }) => {
            if (data?.role === "vendeur") {
              window.location.href = "/vendor/dashboard";
            } else {
              setVerification(false);
            }
          });
      })
      .catch(() => setVerification(false));
  }, []);

  if (verification) {
    return (
      <div className="min-h-screen bg-[#E63946] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  const soumettre = async () => {
    setErreur("");
    if (!nomBoutique.trim() || nomBoutique.trim().length < 2) {
      setErreur("Entrez un nom de boutique (min. 2 caractères).");
      return;
    }
    setLoading(true);
    const res = await devenirVendeur({ nomBoutique: nomBoutique.trim(), ville });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    // Rafraîchit le JWT pour intégrer app_metadata.role = "vendeur" avant navigation
    const supabase = createClient();
    await supabase.auth.refreshSession();
    window.location.href = "/vendor/dashboard";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white font-black text-2xl">🏪</span>
        </div>
        <h1 className="text-2xl font-black text-white">Ouvrir ma boutique</h1>
        <p className="text-white/70 text-sm mt-1">Gratuit — 3 produits inclus</p>
      </div>

      {/* Formulaire */}
      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-5">
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">
            Nom de la boutique <span className="text-red-400">*</span>
          </label>
          <input
            value={nomBoutique}
            onChange={(e) => { setNomBoutique(e.target.value); setErreur(""); }}
            onKeyDown={(e) => e.key === "Enter" && soumettre()}
            placeholder="Ex : Épicerie Centrale, Mode Gabonaise..."
            autoFocus
            maxLength={60}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base font-medium focus:outline-none focus:border-[#E63946] transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Ville</label>
          <select
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors"
          >
            {CITIES_GABON.map((c) => (
              <option key={c} value={c}>📍 {c}</option>
            ))}
          </select>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {erreur}
          </div>
        )}

        <button
          onClick={soumettre}
          disabled={loading}
          className="w-full bg-[#E63946] text-white font-black text-base py-4 rounded-2xl disabled:opacity-60 active:scale-95 transition-all"
        >
          {loading ? "Création..." : "Créer ma boutique →"}
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700 font-semibold">
            ⏳ Votre boutique sera visible après validation par notre équipe (sous 24h).
          </p>
        </div>
      </div>
    </div>
  );
}
