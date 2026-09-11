"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur || "Erreur inscription");
      }

      const result = await res.json();
      setRecoveryCode(result.recovery_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (recoveryCode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
          <h1 className="text-2xl font-black text-gray-800 mb-4">✅ Inscription Réussie!</h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              🔐 CODE DE RÉCUPÉRATION (À NOTER ABSOLUMENT)
            </p>
            <div className="bg-white border-2 border-yellow-300 rounded p-4 text-center">
              <p className="text-2xl font-black text-[#E63946] font-mono tracking-wider">
                {recoveryCode}
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              ⚠️ Vous ne verrez ce code qu'une seule fois. Notez-le ou prenez un screenshot!
            </p>
          </div>

          <div className="space-y-2 mb-6 text-sm">
            <p className="text-gray-700">
              <strong>Votre pseudonyme:</strong> Prêt ✓
            </p>
            <p className="text-gray-700">
              <strong>Votre PIN:</strong> Sécurisé ✓
            </p>
            <p className="text-gray-700">
              <strong>Récupération:</strong> Configurée ✓
            </p>
          </div>

          <Link
            href="/auth/login"
            className="w-full bg-[#E63946] text-white font-bold py-2 rounded-lg hover:bg-[#A4161A] transition-colors block text-center"
          >
            Se Connecter →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-black text-gray-800 mb-2">Bienvenue</h1>
        <p className="text-gray-600 text-sm mb-6">Créez votre compte sur Brotega</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        <AuthForm mode="register" onSubmit={handleRegister} isLoading={loading} />

        <p className="text-center text-sm text-gray-600 mt-4">
          Vous avez déjà un compte?{" "}
          <Link href="/auth/login" className="text-[#E63946] font-bold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
