"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { modifierProfil } from "@/app/actions/auth";
import type { Utilisateur } from "@/lib/supabase/database.types";

// ─── Page profil ───────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Utilisateur | null>(null);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      if (data) {
        setProfil(data);
        setNom(data.nom ?? "");
        setEmail(data.email ?? "");
        setWhatsapp(data.whatsapp?.replace("+241", "") ?? "");
        setMarketingOptIn(data.marketing_opt_in ?? false);
      }
    })();
  }, [router]);

  const sauvegarder = async () => {
    setErreur("");
    setSucces(false);
    setLoading(true);
    const whatsappFull = whatsapp ? "+241" + whatsapp : "";
    const res = await modifierProfil({
      nom,
      email,
      whatsapp: whatsappFull,
      marketing_opt_in: marketingOptIn,
    });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setProfil((p) =>
      p ? {
        ...p, nom,
        email: email || null,
        email_verifie: email !== (p.email ?? "") ? false : p.email_verifie,
        whatsapp: whatsappFull || null,
        marketing_opt_in: marketingOptIn,
      } : p
    );
    setSucces(true);
    setTimeout(() => setSucces(false), 3000);
  };

  const initiales = profil?.nom
    ? profil.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const whatsappBrut = whatsapp?.replace("+241", "") ?? "";
  const modifie =
    nom !== (profil?.nom ?? "") ||
    email !== (profil?.email ?? "") ||
    whatsappBrut !== (profil?.whatsapp?.replace("+241", "") ?? "") ||
    marketingOptIn !== (profil?.marketing_opt_in ?? false);

  const emailNonVerifie = !!(profil?.email && !profil?.email_verifie);
  const emailChanged = email !== (profil?.email ?? "");

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-8">
        <Link href="/compte" className="text-white/70 text-sm">← Mon compte</Link>
        <h1 className="text-2xl font-black text-white mt-2">Mon profil</h1>
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {/* Avatar */}
        <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#E63946] rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0">
            {initiales}
          </div>
          <div>
            <p className="font-black text-gray-800">{profil?.nom ?? "—"}</p>
            <p className="text-sm text-gray-500">{profil?.telephone ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Membre depuis {profil ? new Date(profil.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* Champs éditables */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Informations personnelles</p>

          {/* Nom */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Nom complet</label>
            <input
              value={nom}
              onChange={(e) => { setNom(e.target.value); setSucces(false); }}
              placeholder="Jean-Pierre Mbourou"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-medium focus:outline-none focus:border-[#E63946] transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-700">Adresse email</label>
              {profil?.email && !emailChanged && (
                profil.email_verifie
                  ? <span className="text-xs font-bold text-[#E63946] bg-[#FEF2F2] px-2 py-0.5 rounded-full">✓ Vérifié</span>
                  : <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">⚠ Non vérifié</span>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSucces(false); }}
              placeholder="exemple@gmail.com"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-[#E63946] transition-colors"
              inputMode="email"
            />
            <p className="text-xs text-gray-400 mt-1.5 ml-1">Pour recevoir vos confirmations et promotions</p>

          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">WhatsApp</label>
            <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#E63946] transition-colors">
              <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-500 border-r-2 border-gray-200 font-bold whitespace-nowrap">
                🇬🇦 +241
              </span>
              <input
                value={whatsappBrut}
                onChange={(e) => {
                  setWhatsapp(e.target.value.replace(/\D/g, ""));
                  setSucces(false);
                }}
                placeholder="01 23 45 67"
                className="flex-1 px-4 py-3.5 text-base font-medium focus:outline-none"
                inputMode="tel"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 ml-1">Pour le suivi de livraison et le support</p>
          </div>
        </div>

        {/* Téléphone — non modifiable */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Connexion</p>
          <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5">
            <span className="text-sm font-bold text-gray-400">🇬🇦 +241</span>
            <span className="text-base font-medium text-gray-600 flex-1">
              {profil?.telephone?.replace("+241", "") ?? "—"}
            </span>
            <span className="text-xs text-[#E63946] bg-[#FEF2F2] font-bold px-2 py-0.5 rounded-full">✓ Vérifié</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-1">Le numéro est votre identifiant — non modifiable</p>
        </div>

        {/* Marketing opt-in */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Notifications</p>
          <button
            onClick={() => { setMarketingOptIn(!marketingOptIn); setSucces(false); }}
            className={`w-full flex items-center gap-3 border-2 rounded-2xl px-4 py-3.5 text-left transition-all ${
              marketingOptIn ? "border-[#E63946] bg-[#FEF2F2]" : "border-gray-200"
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              marketingOptIn ? "border-[#E63946] bg-[#E63946]" : "border-gray-300"
            }`}>
              {marketingOptIn && <span className="text-white text-xs font-black">✓</span>}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Recevoir promos et nouveautés</p>
              <p className="text-xs text-gray-500">SMS et email · Désactivable à tout moment</p>
            </div>
          </button>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</div>
        )}
        {succes && (
          <div className="bg-[#FEF2F2] border border-[#E63946]/30 rounded-xl px-4 py-3 text-sm text-[#E63946] font-bold">
            ✅ Profil mis à jour
          </div>
        )}

        <button
          onClick={sauvegarder}
          disabled={loading || !modifie || !nom.trim()}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
