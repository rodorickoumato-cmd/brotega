"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [recoveryMethod, setRecoveryMethod] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const method = searchParams.get("method");
    
    if (!code || !method) {
      router.push("/auth/register");
      return;
    }
    
    setRecoveryCode(code);
    setRecoveryMethod(method);
  }, [searchParams, router]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-black text-gray-800">
            Bienvenue sur Brotega!
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Votre compte a été créé avec succès
          </p>
        </div>

        {/* Recovery Code */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
          <p className="text-xs uppercase tracking-wide font-bold text-emerald-700 mb-2">
            📝 Code de Récupération Important
          </p>
          <p className="text-sm text-gray-700 mb-4">
            Enregistrez ce code maintenant. Vous en aurez besoin si vous oubliez votre PIN.
          </p>

          <div className="bg-white rounded-lg p-4 flex items-center gap-3 mb-3">
            <code className="font-mono font-bold text-lg text-emerald-600 flex-1 break-all">
              {recoveryCode}
            </code>
            <button
              onClick={copyToClipboard}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
            >
              {copied ? "✓ Copié" : "Copier"}
            </button>
          </div>

          <p className="text-xs text-gray-600 italic">
            ⚠️ Ce code n'apparaîtra qu'une fois. Conservez-le dans un endroit sûr.
          </p>
        </div>

        {/* Recovery Method Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Méthode de récupération:</strong>
          </p>
          <p className="text-sm text-gray-600">
            {recoveryMethod === "email" && "📧 Par Email"}
            {recoveryMethod === "phrase" && "🔑 Par Phrase Secrète"}
            {recoveryMethod === "code" && "💾 Par Code de Récupération"}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-all block text-center"
          >
            Aller à la Connexion
          </Link>

          <Link
            href="/vendor/onboarding"
            className="w-full bg-emerald-100 text-emerald-700 font-bold py-3 rounded-lg hover:bg-emerald-200 transition-all block text-center"
          >
            Découvrir l'Opportunité
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600 mb-3">
            Besoin d'aide?
          </p>
          <Link
            href="/auth/support"
            className="text-emerald-600 font-semibold text-sm hover:text-emerald-700"
          >
            Contacter le Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
