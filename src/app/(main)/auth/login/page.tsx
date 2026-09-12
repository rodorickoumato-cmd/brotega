"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    // Validation
    if (!pseudo.trim()) {
      setError("❌ Entrez votre pseudo");
      return;
    }
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setError("❌ PIN: 4-6 chiffres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.erreur || "❌ Erreur de connexion");
        setLoading(false);
        return;
      }

      // ✅ SUCCESS - Stocker token et rediriger
      const token = data.token;
      
      // Stocker dans localStorage ET cookies
      localStorage.setItem("token", token);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("pseudo", data.user.pseudo);

      // Stocker dans cookie pour middleware
      document.cookie = `auth_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 days

      // Rediriger au dashboard
      setTimeout(() => {
        router.push("/vendor/dashboard");
      }, 100);
    } catch (err) {
      console.error(err);
      setError("❌ Erreur serveur");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-emerald-600 mb-2">🔐</div>
          <h1 className="text-2xl font-black text-gray-800">Connexion</h1>
          <p className="text-gray-600 text-sm mt-2">Pseudo + PIN</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Pseudo */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Pseudo
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => {
                setPseudo(e.target.value);
                setError("");
              }}
              placeholder="Votre pseudo"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          {/* PIN */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              PIN (4-6 chiffres)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              placeholder="0000"
              maxLength={6}
              inputMode="numeric"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-600 transition-colors text-center tracking-widest"
            />
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          {/* Recover Link */}
          <div className="text-center">
            <Link
              href="/auth/recover"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Mot de passe oublié?
            </Link>
          </div>
        </div>

        {/* Register Link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Pas encore de compte?{" "}
          <Link
            href="/auth/register"
            className="text-emerald-600 font-bold hover:text-emerald-700"
          >
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
