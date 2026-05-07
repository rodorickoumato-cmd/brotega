"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { modifierProfil } from "@/app/actions/auth";
import type { Utilisateur } from "@/lib/supabase/database.types";

export default function ProfilPage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Utilisateur | null>(null);
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("utilisateurs").select("*").eq("id", user.id).single();
      if (data) { setProfil(data); setNom(data.nom); }
    })();
  }, [router]);

  const sauvegarder = async () => {
    setErreur("");
    setSucces(false);
    setLoading(true);
    const res = await modifierProfil({ nom });
    setLoading(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setProfil((p) => p ? { ...p, nom } : p);
    setSucces(true);
  };

  const initiales = profil?.nom
    ? profil.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-[#00A550] px-5 pt-12 pb-8">
        <Link href="/compte" className="text-white/70 text-sm">← Mon compte</Link>
        <h1 className="text-2xl font-black text-white mt-2">Mon profil</h1>
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {/* Avatar */}
        <div className="bg-white rounded-3xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#00A550] rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0">
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

        {/* Formulaire — 1 seul champ éditable */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Nom complet</label>
            <input
              value={nom}
              onChange={(e) => { setNom(e.target.value); setSucces(false); }}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base font-medium focus:outline-none focus:border-[#00A550] transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-500 mb-2 block">Téléphone</label>
            <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4">
              <span className="text-sm font-bold text-gray-400">🇬🇦 +241</span>
              <span className="text-base font-medium text-gray-500">
                {profil?.telephone?.replace("+241", "") ?? "—"}
              </span>
              <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Non modifiable</span>
            </div>
          </div>
        </div>

        {erreur && (
          <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erreur}</p>
        )}
        {succes && (
          <p className="bg-[#E8F7EE] border border-[#00A550]/30 rounded-xl px-4 py-3 text-sm text-[#00A550] font-bold">
            ✅ Profil mis à jour
          </p>
        )}

        {/* 1 seule action */}
        <button
          onClick={sauvegarder}
          disabled={loading || nom === profil?.nom || !nom.trim()}
          className="w-full bg-[#00A550] text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-95 transition-all"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
