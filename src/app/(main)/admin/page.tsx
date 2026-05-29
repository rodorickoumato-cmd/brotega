"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStatsAdmin } from "@/app/actions/admin";
import { formatXAF } from "@/lib/utils";
import Link from "next/link";

type Stats = {
  totalCommandes: number;
  commandesLivrees: number;
  commandesEnCours: number;
  totalVendeurs: number;
  vendeursVerifies: number;
  vendeursEnAttente: number;
  chiffreAffaires: number;
  paiementsReussis: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login"); return; }
        const { data: profil } = await supabase
          .from("utilisateurs").select("role").eq("id", user.id).single();
        if (profil?.role !== "admin") { router.push("/"); return; }

        const res = await getStatsAdmin();
        if (res.stats) setStats(res.stats);
      } catch {
        // Erreur réseau silencieuse — affiche stats vides
      } finally {
        setChargement(false);
      }
    })();
  }, [router]);

  const cartes = stats ? [
    { label: "Commandes totales", valeur: stats.totalCommandes, sub: `${stats.commandesEnCours} en cours`, couleur: "blue", icon: "📦" },
    { label: "Chiffre d'affaires", valeur: formatXAF(stats.chiffreAffaires), sub: `${stats.paiementsReussis} paiements réussis`, couleur: "green", icon: "💰" },
    { label: "Vendeurs", valeur: stats.totalVendeurs, sub: `${stats.vendeursEnAttente} en attente`, couleur: stats.vendeursEnAttente > 0 ? "orange" : "gray", icon: "🏪" },
    { label: "Livraisons", valeur: stats.commandesLivrees, sub: "commandes livrées", couleur: "purple", icon: "🚚" },
  ] : [];

  const sections = [
    { href: "/admin/vendeurs",     icon: "🏪", titre: "Boutiques",       desc: "Valider, suspendre, supprimer des boutiques" },
    { href: "/admin/utilisateurs", icon: "👥", titre: "Utilisateurs",    desc: "Bannir emails frauduleux, gérer les comptes" },
    { href: "/admin/commandes",    icon: "📦", titre: "Commandes",       desc: "Gérer toutes les commandes" },
    { href: "/admin/paiements",    icon: "💳", titre: "Paiements",       desc: "Historique des transactions PVIT" },
    { href: "/admin/livraisons",   icon: "🚚", titre: "Livraisons",      desc: "Assigner les livreurs" },
    { href: "/admin/reclamations", icon: "⚠️", titre: "Réclamations",   desc: "Résoudre les litiges" },
  ];

  const couleurMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <p className="text-white/70 text-sm">J'adore la Famille</p>
        <h1 className="text-2xl font-black text-white">Dashboard Admin</h1>
        <p className="text-white/70 text-sm mt-1">Vue d'ensemble de la plateforme</p>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {chargement
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-24" />
              ))
            : cartes.map((c) => (
                <div key={c.label} className={`bg-white rounded-2xl p-4 border ${couleurMap[c.couleur]}`}>
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="text-xl font-black">{c.valeur}</div>
                  <div className="text-xs font-semibold mt-0.5">{c.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
                </div>
              ))}
        </div>

        {/* Navigation */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Gestion</p>
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <div className="bg-white rounded-2xl px-4 py-4 flex items-center gap-4 hover:shadow-sm transition-all border border-gray-100 active:scale-[0.98]">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{s.titre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
                <span className="text-gray-400 text-lg">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
