"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { envoyerOTP, verifierOTP, envoyerEmailOTP, verifierEmailOTP } from "@/app/actions/auth";
import { vers241, formaterPhoneGabon } from "@/lib/phone";

type Methode = "telephone" | "email";
type Etape = "choix" | "saisie" | "otp";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [methode, setMethode] = useState<Methode>("telephone");
  const [etape, setEtape] = useState<Etape>("choix");
  const [telephone, setTelephone] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [renvoiSec, setRenvoiSec] = useState(0);

  useEffect(() => {
    if (renvoiSec <= 0) return;
    const t = setTimeout(() => setRenvoiSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [renvoiSec]);

  const choisir = (m: Methode) => { setMethode(m); setEtape("saisie"); setErreur(""); };

  const envoyer = async () => {
    setErreur("");
    setLoading(true);
    if (methode === "telephone") {
      const e164 = vers241(telephone);
      if (!e164) { setLoading(false); setErreur("Numéro invalide. Exemple : 01 23 45 67"); return; }
      const res = await envoyerOTP({ telephone: e164, creerSiAbsent: false });
      setLoading(false);
      if (res.erreur) { setErreur(res.erreur); return; }
      setPhoneE164(e164);
    } else {
      const res = await envoyerEmailOTP({ email, creerSiAbsent: false });
      setLoading(false);
      if (res.erreur) { setErreur(res.erreur); return; }
    }
    setEtape("otp");
    setRenvoiSec(60);
  };

  const verifier = async (codeFinal: string) => {
    setErreur("");
    setLoading(true);
    const res = methode === "telephone"
      ? await verifierOTP({ telephone: phoneE164, code: codeFinal })
      : await verifierEmailOTP({ email, code: codeFinal });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); setCode(""); return; }
    if (!res.profilExiste) { router.push("/auth/register"); return; }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">❤️</span>
        </div>
        <h1 className="text-2xl font-black text-white">
          {etape === "choix" ? "Connexion" : etape === "saisie" ? (methode === "telephone" ? "Votre numéro" : "Votre email") : "Vérification"}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {etape === "choix" && "Choisissez votre méthode"}
          {etape === "saisie" && (methode === "telephone" ? "Numéro gabonais +241" : "Entrez votre adresse email")}
          {etape === "otp" && (methode === "telephone" ? `SMS envoyé au ${formaterPhoneGabon(phoneE164)}` : `Code envoyé à ${email}`)}
        </p>
      </div>

      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-5">

        {/* Choix méthode */}
        {etape === "choix" && (
          <>
            <button onClick={() => choisir("telephone")}
              className="w-full flex items-center gap-4 border-2 border-gray-200 rounded-2xl px-5 py-4 hover:border-[#E63946] hover:bg-[#FEF2F2] transition-all text-left">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-black text-gray-800">Téléphone</p>
                <p className="text-sm text-gray-500">Recevoir un code SMS</p>
              </div>
            </button>
            <button onClick={() => choisir("email")}
              className="w-full flex items-center gap-4 border-2 border-gray-200 rounded-2xl px-5 py-4 hover:border-[#E63946] hover:bg-[#FEF2F2] transition-all text-left">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-black text-gray-800">Email</p>
                <p className="text-sm text-gray-500">Recevoir un code par email</p>
              </div>
            </button>
            <p className="text-center text-sm text-gray-500 pt-2">
              Pas de compte ?{" "}
              <Link href="/auth/register" className="text-[#E63946] font-black">S&apos;inscrire</Link>
            </p>
          </>
        )}

        {/* Saisie */}
        {etape === "saisie" && (
          <>
            {methode === "telephone" ? (
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">Téléphone</label>
                <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#E63946] transition-colors">
                  <span className="bg-gray-50 px-4 flex items-center text-sm text-gray-600 border-r-2 border-gray-200 font-bold whitespace-nowrap">🇬🇦 +241</span>
                  <input value={telephone} onChange={(e) => { setTelephone(e.target.value); setErreur(""); }}
                    onKeyDown={(e) => e.key === "Enter" && envoyer()}
                    placeholder="01 23 45 67" inputMode="tel" autoComplete="tel" autoFocus
                    className="flex-1 px-4 py-4 text-base font-medium focus:outline-none" />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">Adresse email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErreur(""); }}
                  onKeyDown={(e) => e.key === "Enter" && envoyer()}
                  placeholder="exemple@gmail.com" inputMode="email" autoComplete="email" autoFocus
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors" />
              </div>
            )}
            {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>}
            <button onClick={envoyer} disabled={loading}
              className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
              {loading ? "Envoi..." : methode === "telephone" ? "Recevoir le code SMS →" : "Recevoir le code →"}
            </button>
            <button onClick={() => { setEtape("choix"); setErreur(""); }}
              className="w-full text-center text-sm text-gray-500 font-medium">← Autre méthode</button>
          </>
        )}

        {/* OTP */}
        {etape === "otp" && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              {methode === "telephone" ? `📱 SMS envoyé au ${formaterPhoneGabon(phoneE164)}` : `📧 Code envoyé à ${email} — vérifiez vos spams`}
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-4 block text-center">Code à 6 chiffres</label>
              <OtpInput valeur={code} onChange={setCode} onComplet={verifier} />
            </div>
            {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">{erreur}</p>}
            <button onClick={() => verifier(code)} disabled={loading || code.length !== 6}
              className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all">
              {loading ? "Vérification..." : "Confirmer"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button onClick={() => { setEtape("saisie"); setCode(""); setErreur(""); }}
                className="text-gray-500 font-medium">← Modifier</button>
              <button onClick={async () => {
                if (renvoiSec > 0) return;
                setLoading(true);
                const res = methode === "telephone"
                  ? await envoyerOTP({ telephone: phoneE164, creerSiAbsent: false })
                  : await envoyerEmailOTP({ email, creerSiAbsent: false });
                setLoading(false);
                if (!res.erreur) setRenvoiSec(60);
              }} disabled={renvoiSec > 0 || loading}
                className="text-[#E63946] font-bold disabled:text-gray-400">
                {renvoiSec > 0 ? `Renvoyer (${renvoiSec}s)` : "Renvoyer"}
              </button>
            </div>
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
