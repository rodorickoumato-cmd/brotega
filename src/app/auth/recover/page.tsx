"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";

export default function RecoverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"recover" | "reset">("recover");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [newPin, setNewPin] = useState("");

  const handleRecover = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur || "Erreur récupération");
      }

      const result = await res.json();
      setResetToken(result.reset_token);
      setPseudo(data.pseudo);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo,
          reset_token: resetToken,
          new_pin: newPin,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur || "Erreur reset PIN");
      }

      router.push("/auth/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (step === "reset" && resetToken) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
          <h1 className="text-2xl font-black text-gray-800 mb-2">Nouveau PIN</h1>
          <p className="text-gray-600 text-sm mb-6">Créez un nouveau PIN</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleResetPin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nouveau PIN (4-6 chiffres)
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
                required
                minLength={4}
                maxLength={6}
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E63946] text-white font-bold py-2 rounded-lg hover:bg-[#A4161A] disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Réinitialiser PIN"}
            </button>
          </form>

          <Link
            href="/auth/login"
            className="block text-center text-[#E63946] font-semibold hover:underline mt-4"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-black text-gray-800 mb-2">Récupération</h1>
        <p className="text-gray-600 text-sm mb-6">Récupérez l'accès à votre compte</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        <AuthForm mode="recover" onSubmit={handleRecover} isLoading={loading} />

        <div className="mt-6 space-y-2 text-sm">
          <p className="text-gray-600 text-center">
            Vous ne vous souvenez pas?{" "}
            <Link href="/auth/support" className="text-[#E63946] font-bold hover:underline">
              Contacter le support
            </Link>
          </p>
          <Link
            href="/auth/login"
            className="block text-center text-[#E63946] font-semibold hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
