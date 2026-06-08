"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ResetContent() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null); // null = vérification en cours
  const [voirMdp, setVoirMdp] = useState(false);

  // Vérifier qu'une session valide existe (établie par le callback)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setSessionOk(false);
      } else {
        setSessionOk(true);
      }
    });
  }, []);

  const reinitialiser = async () => {
    if (motDePasse.length < 6) { setErreur("Minimum 6 caractères."); return; }
    if (motDePasse !== confirm) { setErreur("Les mots de passe ne correspondent pas."); return; }
    setErreur(""); setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setLoading(false);

    if (error) {
      if (error.message.includes("session") || error.message.includes("token") || error.message.includes("expired")) {
        setErreur("Lien expiré. Cliquez ci-dessous pour en recevoir un nouveau.");
      } else if (error.message.includes("same password")) {
        setErreur("Ce mot de passe est identique à l'ancien. Choisissez-en un différent.");
      } else {
        setErreur("Erreur : " + error.message);
      }
      return;
    }

    // Déconnecter après changement pour forcer une nouvelle connexion propre
    await supabase.auth.signOut();
    setSucces(true);
    setTimeout(() => router.push("/auth/login"), 3000);
  };

  // Chargement vérification session
  if (sessionOk === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-[#E63946] border-t-transparent" />
      </div>
    );
  }

  // Session invalide ou absente
  if (sessionOk === false) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-[#E63946] px-6 pt-14 pb-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl">⏰</span>
          </div>
          <h1 className="text-2xl font-black text-white">Lien expiré</h1>
          <p className="text-white/70 text-sm mt-1">Ce lien n&apos;est plus valide</p>
        </div>

        <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="font-black text-amber-800 mb-1">Que s&apos;est-il passé ?</p>
            <ul className="text-sm text-amber-700 space-y-1.5 mt-2">
              <li>• Le lien de réinitialisation est valide <strong>24h</strong> seulement</li>
              <li>• Il ne peut être utilisé <strong>qu&apos;une seule fois</strong></li>
              <li>• Vérifiez que vous avez cliqué le <strong>lien le plus récent</strong> reçu</li>
            </ul>
          </div>

          <Link
            href="/auth/login"
            className="block w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base text-center active:scale-95 transition-all"
          >
            Demander un nouveau lien →
          </Link>

          <p className="text-center text-xs text-gray-400">
            Sur la page de connexion, cliquez &quot;Mot de passe oublié ?&quot;
          </p>
        </div>
      </div>
    );
  }

  // Succès
  if (succes) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-black text-gray-800 text-2xl mb-2">Mot de passe mis à jour !</p>
        <p className="text-gray-500 text-sm mb-6">Reconnectez-vous avec votre nouveau mot de passe.</p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-[#E63946] animate-spin" />
          Redirection en cours...
        </div>
      </div>
    );
  }

  // Formulaire
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
          <div className="relative">
            <input
              type={voirMdp ? "text" : "password"}
              value={motDePasse}
              onChange={(e) => { setMotDePasse(e.target.value); setErreur(""); }}
              placeholder="Minimum 6 caractères"
              autoComplete="new-password"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 pr-14 text-base focus:outline-none focus:border-[#E63946] transition-colors"
            />
            <button
              type="button"
              onClick={() => setVoirMdp((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              tabIndex={-1}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {voirMdp
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                }
              </svg>
            </button>
          </div>
          {/* Indicateur force mot de passe */}
          {motDePasse.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                    motDePasse.length >= i * 3
                      ? i === 1 ? "bg-red-400" : i === 2 ? "bg-amber-400" : "bg-green-500"
                      : "bg-gray-200"
                  }`} />
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {motDePasse.length < 3 ? "Trop court" : motDePasse.length < 6 ? "Faible" : motDePasse.length < 9 ? "Moyen" : "Fort"}
              </span>
            </div>
          )}
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
            className={`w-full border-2 rounded-2xl px-4 py-4 text-base focus:outline-none transition-colors ${
              confirm.length > 0 && confirm !== motDePasse
                ? "border-red-300 bg-red-50"
                : confirm.length > 0 && confirm === motDePasse
                ? "border-green-400 bg-green-50"
                : "border-gray-200 focus:border-[#E63946]"
            }`}
          />
          {confirm.length > 0 && confirm === motDePasse && (
            <p className="text-xs text-green-600 font-medium mt-1">✓ Les mots de passe correspondent</p>
          )}
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 space-y-2">
            <p className="text-sm text-red-700 font-medium">{erreur}</p>
            {erreur.includes("nouveau lien") && (
              <Link href="/auth/login" className="block text-sm font-black text-[#E63946]">
                → Demander un nouveau lien
              </Link>
            )}
          </div>
        )}

        <button
          onClick={reinitialiser}
          disabled={loading || !motDePasse || !confirm || motDePasse !== confirm}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? "Mise à jour en cours..." : "Enregistrer le nouveau mot de passe"}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-[#E63946] border-t-transparent" />
      </div>
    }>
      <ResetContent />
    </Suspense>
  );
}
