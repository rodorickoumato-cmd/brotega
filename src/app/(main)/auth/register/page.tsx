"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { CITIES_GABON } from "@/lib/utils";
import { envoyerOTP, verifierOTP, creerProfil } from "@/app/actions/auth";
import { formaterPhoneGabon, vers241 } from "@/lib/phone";

type Etape = "telephone" | "otp" | "profil";

const ETAPES = ["telephone", "otp", "profil"] as const;
const ETAPES_LABELS = ["Téléphone", "Vérification", "Profil"];

export default function RegisterPage() {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("telephone");
  const [telephone, setTelephone] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"acheteur" | "vendeur">("acheteur");
  const [nom, setNom] = useState("");
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

  const envoyer = async () => {
    setErreur("");
    const e164 = vers241(telephone);
    if (!e164) { setErreur("Numéro invalide. Exemple : 01 23 45 67"); return; }
    setLoading(true);
    const res = await envoyerOTP({ telephone: e164, creerSiAbsent: true });
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
    if (res.profilExiste) {
      router.push("/");
      router.refresh();
      return;
    }
    setEtape("profil");
  };

  const renvoyer = async () => {
    if (renvoiSec > 0) return;
    setLoading(true);
    const res = await envoyerOTP({ telephone: phoneE164, creerSiAbsent: true });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setRenvoiSec(60);
  };

  const finaliser = async () => {
    setErreur("");
    if (!nom.trim()) { setErreur("Entrez votre nom complet."); return; }
    if (role === "vendeur" && !nomBoutique.trim()) { setErreur("Entrez le nom de votre boutique."); return; }
    setLoading(true);
    const res = await creerProfil({
      nom,
      role,
      ville: role === "vendeur" ? ville : undefined,
      nomBoutique: role === "vendeur" ? nomBoutique : undefined,
    });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    router.push(role === "vendeur" ? "/vendor/dashboard" : "/");
    router.refresh();
  };

  const idxEtape = ETAPES.indexOf(etape);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header vert */}
      <div className="bg-[#00A550] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white font-black text-2xl">B</span>
        </div>
        <h1 className="text-2xl font-black text-white">
          {etape === "telephone" && "Créer un compte"}
          {etape === "otp" && "Vérification"}
          {etape === "profil" && "Vos informations"}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {etape === "telephone" && "Marketplace gabonaise 🇬🇦"}
          {etape === "otp" && `Code SMS envoyé au ${formaterPhoneGabon(phoneE164)}`}
          {etape === "profil" && "Dernière étape"}
        </p>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mt-5">
          {ETAPES.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i < idxEtape ? "bg-white text-[#00A550]"
                : i === idxEtape ? "bg-white text-[#00A550] ring-2 ring-white/40"
                : "bg-white/20 text-white/50"
              }`}>
                {i < idxEtape ? "✓" : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 w-8 ${i < idxEtape ? "bg-white" : "bg-white/20"}`} />}
            </div>
          ))}
          <span className="text-white/70 text-xs ml-1">{ETAPES_LABELS[idxEtape]}</span>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-5">

        {/* Étape 1 — Téléphone */}
        {etape === "telephone" && (
          <>
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
                  className="flex-1 px-4 py-4 text-base font-medium focus:outline-none"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                />
              </div>
            </div>
            {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>}
            <button onClick={envoyer} disabled={loading}
              className="w-full bg-[#00A550] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
              {loading ? "Envoi..." : "Recevoir le code SMS →"}
            </button>
          </>
        )}

        {/* Étape 2 — OTP */}
        {etape === "otp" && (
          <>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-4 block text-center">Code à 6 chiffres</label>
              <OtpInput valeur={code} onChange={setCode} onComplet={verifier} />
            </div>
            {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">{erreur}</p>}
            <button onClick={() => verifier(code)} disabled={loading || code.length !== 6}
              className="w-full bg-[#00A550] text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all">
              {loading ? "Vérification..." : "Confirmer"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button onClick={() => { setEtape("telephone"); setCode(""); setErreur(""); }}
                className="text-gray-500 font-medium">← Changer de numéro</button>
              <button onClick={renvoyer} disabled={renvoiSec > 0 || loading}
                className="text-[#00A550] font-bold disabled:text-gray-400">
                {renvoiSec > 0 ? `Renvoyer (${renvoiSec}s)` : "Renvoyer"}
              </button>
            </div>
          </>
        )}

        {/* Étape 3 — Profil */}
        {etape === "profil" && (
          <>
            {/* Choix rôle */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "acheteur", emoji: "🛒", label: "Acheteur", desc: "J'achète" },
                { id: "vendeur",  emoji: "🏪", label: "Vendeur",  desc: "Je vends" },
              ] as const).map((r) => (
                <button key={r.id} onClick={() => { setRole(r.id); setErreur(""); }}
                  className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 font-semibold transition-all ${
                    role === r.id ? "border-[#00A550] bg-[#E8F7EE] text-[#00A550]" : "border-gray-200 text-gray-500"
                  }`}>
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-sm font-black">{r.label}</span>
                  <span className="text-xs font-normal opacity-70">{r.desc}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Nom complet</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Jean-Pierre Mbourou"
                autoFocus autoComplete="name"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#00A550] transition-colors" />
            </div>

            {role === "vendeur" && (
              <>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Nom de votre boutique</label>
                  <input value={nomBoutique} onChange={(e) => setNomBoutique(e.target.value)}
                    placeholder="Ex : Épicerie Centrale..."
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#00A550] transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Ville</label>
                  <select value={ville} onChange={(e) => setVille(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#00A550] transition-colors">
                    {CITIES_GABON.map((c) => <option key={c} value={c}>📍 {c}</option>)}
                  </select>
                </div>
              </>
            )}

            {erreur && <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>}

            <button onClick={finaliser} disabled={loading}
              className="w-full bg-[#00A550] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
              {loading ? "Création..." : role === "vendeur" ? "Créer ma boutique 🏪" : "Créer mon compte 🛒"}
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-500 pt-2">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-[#00A550] font-black">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
