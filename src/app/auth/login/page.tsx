"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur || "Erreur connexion");
      }

      const result = await res.json();

      // Sauvegarder le token
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("user_pseudo", result.user.pseudo);

      // Rediriger
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-black text-gray-800 mb-2">Connexion</h1>
        <p className="text-gray-600 text-sm mb-6">Accédez à votre compte Brotega</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        <AuthForm mode="login" onSubmit={handleLogin} isLoading={loading} />

        <div className="mt-6 space-y-2 text-sm">
          <Link
            href="/auth/recover"
            className="block text-center text-[#E63946] font-semibold hover:underline"
          >
            J'ai oublié mon PIN →
          </Link>
          <p className="text-center text-gray-600">
            Pas encore inscrit?{" "}
            <Link href="/auth/register" className="text-[#E63946] font-bold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
