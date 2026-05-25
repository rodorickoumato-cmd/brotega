"use client";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetContent() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);

  const reinitialiser = async () => {
    if (motDePasse.length < 6) { setErreur("Minimum 6 caractères."); return; }
    if (motDePasse !== confirm) { setErreur("Les mots de passe ne correspondent pas."); return; }
    setErreur(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setLoading(false);
    if (error) { setErreur("Lien expiré. Recommencez depuis la page de connexion."); return; }
    setSucces(true);
    setTimeout(() => router.push("/auth/login"), 2500);
  };

  if (succes) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <p className="font-black text-gray-800 text-xl mb-2">Mot de passe mis à jour !</p>
        <p className="text-gray-500 text-sm">Redirection vers la connexion...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">🔑</span>
        </div>
        <h1 className="text-2xl font-black text-white">Nouveau mot de passe</h1>
        <p className="text-white/70 text-sm mt-1">Choisissez un mot de passe sécurisé</p>
      </div>

      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-4">
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Nouveau mot de passe</label>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => { setMotDePasse(e.target.value); setErreur(""); }}
            placeholder="Minimum 6 caractères"
            autoComplete="new-password"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErreur(""); }}
            placeholder="Répétez le mot de passe"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === "Enter" && reinitialiser()}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors"
          />
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{erreur}</p>
          </div>
        )}

        <button
          onClick={reinitialiser}
          disabled={loading || !motDePasse || !confirm}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
          {loading ? "Mise à jour..." : "Enregistrer le nouveau mot de passe"}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetContent />
    </Suspense>
  );
}
