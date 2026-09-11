"use client";

import { useState } from "react";

interface AuthFormProps {
  mode: "register" | "login" | "recover";
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function AuthForm({ mode, onSubmit, isLoading }: AuthFormProps) {
  const [pseudo, setPseudo] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState<"email" | "phrase" | "code">("email");
  const [email, setEmail] = useState("");
  const [phrase, setPhrase] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (mode === "register") {
        if (pin !== confirmPin) {
          setError("Les PINs ne correspondent pas");
          return;
        }
        await onSubmit({
          pseudo,
          pin,
          recovery_method: recoveryMethod,
          email: recoveryMethod === "email" ? email : undefined,
          phrase: recoveryMethod === "phrase" ? phrase : undefined,
        });
      } else if (mode === "login") {
        await onSubmit({ pseudo, pin });
      } else if (mode === "recover") {
        await onSubmit({
          pseudo,
          recovery_method: recoveryMethod,
          email: recoveryMethod === "email" ? email : undefined,
          phrase: recoveryMethod === "phrase" ? phrase : undefined,
          code: recoveryMethod === "code" ? code : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Pseudo */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Pseudonyme
        </label>
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="ex: Rodoric"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946] focus:border-transparent"
          required
          minLength={3}
          maxLength={50}
        />
      </div>

      {/* PIN */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          PIN (4-6 chiffres)
        </label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946] focus:border-transparent"
          required
          minLength={4}
          maxLength={6}
          inputMode="numeric"
        />
      </div>

      {/* Confirm PIN (Register Only) */}
      {mode === "register" && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Confirmer PIN
          </label>
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            placeholder="0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946] focus:border-transparent"
            required
            minLength={4}
            maxLength={6}
            inputMode="numeric"
          />
        </div>
      )}

      {/* Recovery Method Selection (Register & Recover) */}
      {(mode === "register" || mode === "recover") && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Méthode de récupération
          </label>

          <div className="space-y-2">
            {/* Email */}
            <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="recovery"
                value="email"
                checked={recoveryMethod === "email"}
                onChange={(e) => setRecoveryMethod(e.target.value as any)}
                className="w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium">📧 Email</span>
            </label>

            {recoveryMethod === "email" && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="ml-7 w-full px-3 py-2 border border-gray-300 rounded text-sm"
                required={mode === "register" && recoveryMethod === "email"}
              />
            )}

            {/* Phrase */}
            <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="recovery"
                value="phrase"
                checked={recoveryMethod === "phrase"}
                onChange={(e) => setRecoveryMethod(e.target.value as any)}
                className="w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium">🔑 Phrase Secrète</span>
            </label>

            {recoveryMethod === "phrase" && (
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="ex: MonChien aimeManger duPoisson"
                className="ml-7 w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={2}
                required={mode === "register" && recoveryMethod === "phrase"}
              />
            )}

            {/* Code */}
            <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="recovery"
                value="code"
                checked={recoveryMethod === "code"}
                onChange={(e) => setRecoveryMethod(e.target.value as any)}
                className="w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium">💾 Code Récupération</span>
            </label>

            {recoveryMethod === "code" && mode === "recover" && (
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="X7K9-M2P5-Q8L1"
                className="ml-7 w-full px-3 py-2 border border-gray-300 rounded text-sm"
                required
              />
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#E63946] text-white font-bold py-2 rounded-lg hover:bg-[#A4161A] disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Chargement..." : mode === "register" ? "S'inscrire" : mode === "login" ? "Se connecter" : "Récupérer"}
      </button>
    </form>
  );
}
