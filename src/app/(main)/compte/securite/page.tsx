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
      <div className="bg-[#E63946] px-5 pt-5 pb-8">
        <Link href="/compte" className="text-white/70 text-sm">← Mon compte</Link>
        <h1 className="text-2xl font-black text-white mt-2">Connexion & Sécurité</h1>
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {/* Méthode de connexion */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Identifiants de connexion</p>

          <div className="flex items-center gap-3 bg-[#FEF2F2] border-2 border-[#E63946]/20 rounded-2xl px-4 py-3.5">
            <span className="text-xl">📧</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">Email</p>
              <p className="text-sm text-gray-600 truncate">{profil?.email ?? "—"}</p>
            </div>
            <span className="text-xs font-bold text-[#E63946] bg-[#E63946]/10 px-2 py-0.5 rounded-full flex-shrink-0">Principal</span>
          </div>

          {profil?.telephone && (
            <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5">
              <span className="text-xl">📱</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-700">Téléphone</p>
                <p className="text-sm text-gray-500">{profil.telephone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info sécurité */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">🔐</span>
            <div>
              <p className="text-sm font-bold text-blue-800">Connexion sécurisée</p>
              <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                Votre compte est protégé par votre email et mot de passe. Utilisez un mot de passe difficile à deviner.
              </p>
            </div>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Mot de passe</p>
          <Link href="/auth/login"
            className="w-full flex items-center gap-4 py-2">
            <span className="text-xl">🔑</span>
            <span className="text-sm font-semibold text-gray-700">Changer le mot de passe</span>
            <span className="text-gray-300 text-lg ml-auto">›</span>
          </Link>
        </div>

        {/* Déconnexion */}
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
