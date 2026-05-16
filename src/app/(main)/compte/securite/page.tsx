"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deconnecter } from "@/app/actions/auth";
import type { Utilisateur } from "@/lib/supabase/database.types";

export default function SecuritePage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Utilisateur | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      setProfil(data);
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-8">
        <Link href="/compte" className="text-white/70 text-sm">← Mon compte</Link>
        <h1 className="text-2xl font-black text-white mt-2">Connexion & Sécurité</h1>
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {/* Méthode de connexion */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Identifiants de connexion</p>

          <div className="flex items-center gap-3 bg-[#FEF2F2] border-2 border-[#E63946]/20 rounded-2xl px-4 py-3.5">
            <span className="text-xl">📱</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">Téléphone vérifié</p>
              <p className="text-sm text-gray-600">{profil?.telephone ?? "—"}</p>
            </div>
            <span className="text-xs font-bold text-[#E63946] bg-[#E63946]/10 px-2 py-0.5 rounded-full">Actif</span>
          </div>

          {profil?.email ? (
            <div className="flex items-center gap-3 bg-[#FEF2F2] border-2 border-[#E63946]/20 rounded-2xl px-4 py-3.5">
              <span className="text-xl">📧</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">Email</p>
                <p className="text-sm text-gray-600 truncate">{profil.email}</p>
              </div>
              <span className="text-xs font-bold text-[#E63946] bg-[#E63946]/10 px-2 py-0.5 rounded-full flex-shrink-0">Actif</span>
            </div>
          ) : (
            <Link href="/compte/profil"
              className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl px-4 py-3.5 hover:border-[#E63946] transition-colors">
              <span className="text-xl">📧</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-700">Ajouter un email</p>
                <p className="text-xs text-gray-400">Pour les confirmations et promotions</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </Link>
          )}
        </div>

        {/* Info connexion sans mot de passe */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">🔐</span>
            <div>
              <p className="text-sm font-bold text-blue-800">Connexion sécurisée par OTP</p>
              <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                Votre compte est sécurisé par un code SMS envoyé à chaque connexion. Pas de mot de passe à retenir — votre téléphone est votre clé.
              </p>
            </div>
          </div>
        </div>

        {/* Déconnexion de tous les appareils */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Actions</p>
          <form action={deconnecter}>
            <button type="submit"
              className="w-full text-left flex items-center gap-4 py-2">
              <span className="text-xl">🚪</span>
              <span className="text-sm font-semibold text-red-500">Se déconnecter</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
