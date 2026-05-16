"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { CITIES_GABON } from "@/lib/utils";
import {
  envoyerOTP, verifierOTP,
  envoyerEmailOTP, verifierEmailOTP,
  creerProfil,
} from "@/app/actions/auth";
import { vers241, formaterPhoneGabon } from "@/lib/phone";

type Methode = "telephone" | "email";
type Etape = "choix" | "saisie" | "otp" | "profil";

export default function RegisterPage() {
  const router = useRouter();
  const [methode, setMethode] = useState<Methode>("telephone");
  const [etape, setEtape] = useState<Etape>("choix");
  const [telephone, setTelephone] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [telProfil, setTelProfil] = useState("");
  const [role, setRole] = useState<"acheteur" | "vendeur">("acheteur");
  const [ville, setVille] = useState("Libreville");
  const [nomBoutique, setNomBoutique] = useState("");
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
      const res = await envoyerOTP({ telephone: e164, creerSiAbsent: true });
      setLoading(false);
      if (res.erreur) { setErreur(res.erreur); return; }
      setPhoneE164(e164);
    } else {
      const res = await envoyerEmailOTP({ email, creerSiAbsent: true });
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
    if (res.profilExiste) { router.push("/"); router.refresh(); return; }
    setEtape("profil");
  };

  const finaliser = async () => {
    setErreur("");
    if (!nom.trim()) { setErreur("Entrez votre nom complet."); return; }
    if (role === "vendeur" && !nomBoutique.trim()) { setErreur("Entrez le nom de votre boutique."); return; }
    setLoading(true);
    const tel = methode === "telephone" ? phoneE164 : (telProfil ? vers241(telProfil) ?? undefined : undefined);
    const res = await creerProfil({
      nom,
      role,
      ville: role === "vendeur" ? ville : undefined,
      nomBoutique: role === "vendeur" ? nomBoutique : undefined,
      email: methode === "email" ? email : undefined,
      telephone: tel ?? undefined,
    });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    router.push(role === "vendeur" ? "/vendor/dashboard" : "/");
    router.refresh();
  };

  const prog = { choix: 0, saisie: 1, otp: 2, profil: 3 }[etape];
  const labels = methode === "telephone" ? ["Téléphone", "Code SMS", "Profil"] : ["Email", "Code", "Profil"];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">❤️</span>
        </div>
        <h1 className="text-2xl font-black text-white">
          {etape === "choix" ? "Créer un compte" : etape === "saisie" ? (methode === "telephone" ? "Votre numéro" : "Votre email") : etape === "otp" ? "Vérification" : "Vos informations"}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {etape === "choix" && "J'adore la Famille 🇬🇦"}
          {etape === "saisie" && (methode === "telephone" ? "Numéro gabonais +241" : "Entrez votre adresse email")}
          {etape === "otp" && (methode === "telephone" ? `SMS envoyé au ${formaterPhoneGabon(phoneE164)}` : `Code envoyé à ${email}`)}
          {etape === "profil" && "Dernière étape"}
        </p>

        {etape !== "choix" && (
          <div className="flex items-center gap-2 mt-5">
            {labels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < prog - 1 ? "bg-white text-[#E63946]"
                  : i === prog - 1 ? "bg-white text-[#E63946] ring-2 ring-white/40"
                  : "bg-white/20 text-white/50"
                }`}>
                  {i < prog - 1 ? "✓" : i + 1}
                </div>
                {i < labels.length - 1 && <div className={`h-0.5 w-6 ${i < prog - 1 ? "bg-white" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        )}
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
                <p className="text-sm text-gray-500">Code OTP par SMS · Rapide</p>
              </div>
            </button>
            <button onClick={() => choisir("email")}
              className="w-full flex items-center gap-4 border-2 border-gray-200 rounded-2xl px-5 py-4 hover:border-[#E63946] hover:bg-[#FEF2F2] transition-all text-left">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-black text-gray-800">Email</p>
                <p className="text-sm text-gray-500">Code par email</p>
              </div>
            </button>
            <p className="text-center text-sm text-gray-500 pt-2">
              Déjà un compte ?{" "}
              <Link href="/auth/login" className="text-[#E63946] font-black">Se connecter</Link>
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
                  ? await envoyerOTP({ telephone: phoneE164, creerSiAbsent: true })
                  : await envoyerEmailOTP({ email, creerSiAbsent: true });
                setLoading(false);
                if (!res.erreur) setRenvoiSec(60);
              }} disabled={renvoiSec > 0 || loading}
                className="text-[#E63946] font-bold disabled:text-gray-400">
                {renvoiSec > 0 ? `Renvoyer (${renvoiSec}s)` : "Renvoyer"}
              </button>
            </div>
          </>
        )}

        {/* Profil */}
        {etape === "profil" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "acheteur", emoji: "🛒", label: "Acheteur", desc: "J'achète" },
                { id: "vendeur",  emoji: "🏪", label: "Vendeur",  desc: "Je vends" },
              ] as const).map((r) => (
                <button key={r.id} onClick={() => { setRole(r.id); setErreur(""); }}
                  className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all ${
                    role === r.id ? "border-[#E63946] bg-[#FEF2F2] text-[#E63946]" : "border-gray-200 text-gray-500"
                  }`}>
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-sm font-black">{r.label}</span>
                  <span className="text-xs font-normal opacity-70">{r.desc}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Nom complet</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)}
                placeholder="Jean-Pierre Mbourou" autoFocus autoComplete="name"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors" />
            </div>

            {methode === "email" && (
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  Téléphone <span className="text-gray-400 font-normal text-xs">(pour livraison & Mobile Money)</span>
                </label>
                <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#E63946] transition-colors">
                  <span className="bg-gray-50 px-4 flex items-center text-sm text-gray-600 border-r-2 border-gray-200 font-bold whitespace-nowrap">🇬🇦 +241</span>
                  <input value={telProfil} onChange={(e) => setTelProfil(e.target.value)}
                    placeholder="01 23 45 67" inputMode="tel"
                    className="flex-1 px-4 py-4 text-base font-medium focus:outline-none" />
                </div>
              </div>
            )}

            {role === "vendeur" && (
              <>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Nom de votre boutique</label>
                  <input value={nomBoutique} onChange={(e) => setNomBoutique(e.target.value)}
                    placeholder="Ex : Épicerie Centrale..."
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Ville</label>
                  <select value={ville} onChange={(e) => setVille(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors bg-white">
                    {CITIES_GABON.map((c) => <option key={c} value={c}>📍 {c}</option>)}
                  </select>
                </div>
              </>
            )}

            {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>}
            <button onClick={finaliser} disabled={loading}
              className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
              {loading ? "Création..." : role === "vendeur" ? "Créer ma boutique 🏪" : "Créer mon compte 🛒"}
            </button>
          </>
        )}

        {etape !== "choix" && (
          <p className="text-center text-sm text-gray-500 pt-2">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-[#E63946] font-black">Se connecter</Link>
          </p>
        )}
      </div>
    </div>
  );
}
