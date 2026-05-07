"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { envoyerOTP, verifierOTP } from "@/app/actions/auth";
import { formaterPhoneGabon, vers241 } from "@/lib/phone";

type Etape = "telephone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [etape, setEtape] = useState<Etape>("telephone");
  const [telephone, setTelephone] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [renvoiSec, setRenvoiSec] = useState(0);

  useEffect(() => {
    if (renvoiSec <= 0) return;
    const t = setTimeout(() => setRenvoiSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [renvoiSec]);

  const envoyer = async () => {
    setErreur("");
    const e164 = vers241(telephone);
    if (!e164) { setErreur("Numéro invalide. Exemple : 01 23 45 67"); return; }
    setLoading(true);
    const res = await envoyerOTP({ telephone: e164, creerSiAbsent: false });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setPhoneE164(e164);
    setEtape("otp");
    setRenvoiSec(60);
  };

  const verifier = async (codeFinal: string) => {
    setErreur("");
    setLoading(true);
    const res = await verifierOTP({ telephone: phoneE164, code: codeFinal });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); setCode(""); return; }
    if (!res.profilExiste) {
      router.push("/auth/register");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  const renvoyer = async () => {
    if (renvoiSec > 0) return;
    setLoading(true);
    const res = await envoyerOTP({ telephone: phoneE164, creerSiAbsent: false });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setRenvoiSec(60);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header vert */}
      <div className="bg-[#00A550] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white font-black text-2xl">B</span>
        </div>
        <h1 className="text-2xl font-black text-white">
          {etape === "telephone" ? "Connexion" : "Vérification"}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {etape === "telephone"
            ? "Entrez votre numéro gabonais"
            : `Code SMS envoyé au ${formaterPhoneGabon(phoneE164)}`}
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl">
        {etape === "telephone" && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Téléphone</label>
              <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#00A550] transition-colors">
                <span className="bg-gray-50 px-4 flex items-center text-sm text-gray-600 border-r-2 border-gray-200 font-bold whitespace-nowrap">
                  🇬🇦 +241
                </span>
                <input
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && envoyer()}
                  placeholder="01 23 45 67"
                  className="flex-1 px-4 py-4 text-base font-medium focus:outline-none bg-white"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                />
              </div>
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {erreur}
              </div>
            )}

            <button
              onClick={envoyer}
              disabled={loading}
              className="w-full bg-[#00A550] text-white font-black text-base py-4 rounded-2xl disabled:opacity-60 active:scale-95 transition-all"
            >
              {loading ? "Envoi..." : "Recevoir le code SMS →"}
            </button>
          </div>
        )}

        {etape === "otp" && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-4 block text-center">
                Code à 6 chiffres
              </label>
              <OtpInput valeur={code} onChange={setCode} onComplet={verifier} />
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
                {erreur}
              </div>
            )}

            <button
              onClick={() => verifier(code)}
              disabled={loading || code.length !== 6}
              className="w-full bg-[#00A550] text-white font-black text-base py-4 rounded-2xl disabled:opacity-40 active:scale-95 transition-all"
            >
              {loading ? "Vérification..." : "Confirmer"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => { setEtape("telephone"); setCode(""); setErreur(""); }}
                className="text-gray-500 font-medium"
              >
                ← Changer de numéro
              </button>
              <button
                onClick={renvoyer}
                disabled={renvoiSec > 0 || loading}
                className="text-[#00A550] font-bold disabled:text-gray-400"
              >
                {renvoiSec > 0 ? `Renvoyer (${renvoiSec}s)` : "Renvoyer"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Pas de compte ?{" "}
            <Link href="/auth/register" className="text-[#00A550] font-black">
              S&apos;inscrire gratuitement
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Pas de mot de passe — votre numéro suffit
        </p>
      </div>
    </div>
  );
}
