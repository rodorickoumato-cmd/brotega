"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [pin, setPin] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo,
          pin,
          recovery_method: recoveryMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 🔴 AFFICHER L'ERREUR PSEUDO DÉJÀ UTILISÉ
        if (res.status === 409) {
          setError("❌ Ce pseudo est déjà utilisé. Choisissez un autre.");
        } else {
          setError(data.erreur || "Erreur lors de l'inscription");
        }
        return;
      }

      // ✅ SUCCESS
      setSuccess(true);
      setRecoveryCode(data.recovery_code);
    } catch (err) {
      setError("Erreur serveur. Vérifiez que Supabase est configuré.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <h1 className="text-3xl font-black text-emerald-600 mb-4">✅ Inscription réussie!</h1>
          <p className="text-gray-600 mb-4">Bienvenue {pseudo}! 🎉</p>
          
          {recoveryCode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-amber-800 font-bold mb-2">⚠️ SAUVEGARDEZ CE CODE:</p>
              <p className="font-mono text-lg font-black text-amber-900 break-all">{recoveryCode}</p>
              <p className="text-xs text-amber-700 mt-2">À afficher une seule fois!</p>
            </div>
          )}

          <button
            onClick={() => router.push("/auth/login")}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700"
          >
            → Aller à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-black text-gray-800 mb-2">📝 S'inscrire</h1>
          <p className="text-gray-600 text-sm mb-6">Créez votre compte Brotega</p>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* PSEUDO INPUT */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Pseudo</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="john_seller"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">3-50 caractères, unique</p>
          </div>

          {/* PIN INPUT */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="0000"
              maxLength="6"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-emerald-500 focus:outline-none text-center tracking-widest"
            />
            <p className="text-xs text-gray-500 mt-1">4-6 chiffres</p>
          </div>

          {/* RECOVERY METHOD */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Récupération</label>
            <select
              value={recoveryMethod}
              onChange={(e) => setRecoveryMethod(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-emerald-500 focus:outline-none"
            >
              <option value="code">📋 Code de récupération</option>
              <option value="email">📧 Email</option>
              <option value="phrase">🔐 Phrase secrète</option>
            </select>
          </div>

          {/* REGISTER BUTTON */}
          <button
            onClick={handleRegister}
            disabled={loading || !pseudo || !pin}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Inscription..." : "S'inscrire →"}
          </button>

          {/* LOGIN LINK */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Déjà inscrit? <a href="/auth/login" className="text-emerald-600 font-bold">Connectez-vous</a>
          </p>
        </div>
      </div>
    </div>
  );
}
