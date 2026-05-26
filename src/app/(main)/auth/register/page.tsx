"use client";
import { useState } from "react";
import Link from "next/link";
import { CITIES_GABON } from "@/lib/utils";
import { sInscrire } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [role, setRole] = useState<"acheteur" | "vendeur">("acheteur");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomBoutique, setNomBoutique] = useState("");
  const [ville, setVille] = useState("Libreville");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  const inscrire = async () => {
    setErreur(""); setLoading(true);
    const res = await sInscrire({
      email, motDePasse, nom, telephone: telephone || undefined,
      role, nomBoutique: role === "vendeur" ? nomBoutique : undefined,
      ville: role === "vendeur" ? ville : undefined,
    });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    // Rafraîchit le JWT pour intégrer app_metadata.role avant navigation
    await createClient().auth.refreshSession().catch(() => {});
    window.location.href = role === "vendeur" ? "/vendor/dashboard" : "/";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#E63946] px-6 pt-14 pb-10">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">❤️</span>
        </div>
        <h1 className="text-2xl font-black text-white">Créer un compte</h1>
        <p className="text-white/70 text-sm mt-1">MYC&apos;S SECRET 🇬🇦</p>
      </div>

      <div className="flex-1 px-6 py-8 -mt-4 bg-white rounded-t-3xl space-y-4">

        {/* Rôle */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "acheteur", emoji: "🛒", label: "Acheteur", desc: "J'achète" },
            { id: "vendeur",  emoji: "🏪", label: "Vendeur",  desc: "Je vends" },
          ] as const).map((r) => (
            <button key={r.id} onClick={() => setRole(r.id)}
              className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all ${
                role === r.id ? "border-[#E63946] bg-[#FEF2F2] text-[#E63946]" : "border-gray-200 text-gray-500"
              }`}>
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-sm font-black">{r.label}</span>
              <span className="text-xs opacity-70">{r.desc}</span>
            </button>
          ))}
        </div>

        {/* Nom */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Nom complet</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Jean-Pierre Mbourou" autoComplete="name"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors" />
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@gmail.com" autoComplete="email" inputMode="email"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors" />
        </div>

        {/* Mot de passe */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Mot de passe</label>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Minimum 6 caractères" autoComplete="new-password"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#E63946] transition-colors" />
        </div>

        {/* Téléphone (optionnel) */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">
            Téléphone <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
          </label>
          <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#E63946] transition-colors">
            <span className="bg-gray-50 px-4 flex items-center text-sm text-gray-600 border-r-2 border-gray-200 font-bold whitespace-nowrap">🇬🇦 +241</span>
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)}
              placeholder="66 XX XX XX" inputMode="tel"
              className="flex-1 px-4 py-4 text-base font-medium focus:outline-none" />
          </div>
        </div>

        {/* Champs vendeur */}
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

        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{erreur}</p>
          </div>
        )}

        <button onClick={inscrire} disabled={loading}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-60 active:scale-95 transition-all">
          {loading ? "Création..." : role === "vendeur" ? "Créer ma boutique 🏪" : "Créer mon compte 🛒"}
        </button>

        <p className="text-center text-sm text-gray-500 pt-2">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-[#E63946] font-black">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
