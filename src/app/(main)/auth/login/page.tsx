"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { seConnecter, reinitialiserMotDePasse } from "@/app/actions/auth";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [oublie, setOublie] = useState(false);
  const [resetEnvoye, setResetEnvoye] = useState(false);
  const [voirMdp, setVoirMdp] = useState(false);

  const connecter = async () => {
    if (!email.trim() || !motDePasse) { setErreur("Remplissez tous les champs."); return; }
    setErreur(""); setLoading(true);
    const res = await seConnecter({ email, motDePasse });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    // Rechargement complet : garantit que le header relise le rôle depuis la DB
    window.location.href = redirectTo;
  };

  const envoyerReset = async () => {
    if (!email.trim()) { setErreur("Entrez votre email d'abord."); return; }
    setErreur(""); setLoading(true);
    const res = await reinitialiserMotDePasse(email);
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setResetEnvoye(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">❤️</span>
        </div>
        <h1 className="text-2xl font-black text-white">
          {oublie ? "Mot de passe oublié" : "Connexion"}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {oublie ? "On vous envoie un lien de réinitialisation" : "Entrez votre email et mot de passe"}
        </p>
      </div>

      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-4">

        {resetEnvoye ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-3">📧</div>
            <p className="font-black text-green-700 text-lg mb-1">Email envoyé !</p>
            <p className="text-sm text-gray-600">Ouvrez votre boîte mail et cliquez le lien pour créer un nouveau mot de passe.</p>
            <button onClick={() => { setOublie(false); setResetEnvoye(false); }}
              className="mt-4 text-[#E63946] font-bold text-sm">
              ← Retour à la connexion
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Email</label>
              <input
                type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErreur(""); }}
                onKeyDown={(e) => e.key === "Enter" && !oublie && connecter()}
                placeholder="exemple@gmail.com" autoComplete="email" inputMode="email"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors"
              />
            </div>

            {!oublie && (
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">Mot de passe</label>
                <div className="relative">
                  <input
                    type={voirMdp ? "text" : "password"} value={motDePasse} onChange={(e) => { setMotDePasse(e.target.value); setErreur(""); }}
                    onKeyDown={(e) => e.key === "Enter" && connecter()}
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 pr-14 text-base focus:outline-none focus:border-[#E63946] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMdp((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E63946] transition-colors"
                    tabIndex={-1}
                  >
                    {voirMdp ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {erreur && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700 font-medium">{erreur}</p>
              </div>
            )}

            <button
              onClick={oublie ? envoyerReset : connecter}
              disabled={loading}
              className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
              {loading ? "Chargement..." : oublie ? "Envoyer le lien" : "Se connecter"}
            </button>

            <button onClick={() => { setOublie(!oublie); setErreur(""); }}
              className="w-full text-center text-sm text-gray-500 font-medium py-2">
              {oublie ? "← Retour" : "Mot de passe oublié ?"}
            </button>

            <p className="text-center text-sm text-gray-500 pt-2">
              Pas encore de compte ?{" "}
              <Link href="/auth/register" className="text-[#E63946] font-black">S&apos;inscrire</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
