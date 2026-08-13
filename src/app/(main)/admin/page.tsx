"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStatsAdmin, getDashboardEnrichi } from "@/app/actions/admin";
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

type DashboardEnrichi = {
  aujourdhui: { caJour: number; commandesJour: number; clientsJour: number; vendeursJour: number };
  aTraiter: {
    commandesEnAttente: number; commandesAExpedier: number; commandesLitige: number;
    vendeursEnAttente: number; stockFaible: number; reclamationsOuvertes: number;
  };
  alertes: {
    echecsAirtel30min: number; echecsMoov30min: number;
    pvitAirtelConfigure: boolean; pvitMoovConfigure: boolean; escrowEnRetard: number;
  };
};

type LigneATraiter = { label: string; valeur: number; href?: string };
type LigneAlerte = { label: string; ok: boolean; detail: string };

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardEnrichi | null>(null);
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

        const [resStats, resDashboard] = await Promise.all([getStatsAdmin(), getDashboardEnrichi()]);
        if (resStats.stats) setStats(resStats.stats);
        if (resDashboard.data) setDashboard(resDashboard.data as DashboardEnrichi);
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

  const lignesATraiter: LigneATraiter[] = dashboard ? [
    { label: "Commandes en attente de paiement", valeur: dashboard.aTraiter.commandesEnAttente, href: "/admin/commandes" },
    { label: "Commandes à expédier",              valeur: dashboard.aTraiter.commandesAExpedier, href: "/admin/commandes" },
    { label: "Commandes en litige",                valeur: dashboard.aTraiter.commandesLitige,    href: "/admin/commandes" },
    { label: "Vendeurs en attente de validation",  valeur: dashboard.aTraiter.vendeursEnAttente,  href: "/admin/vendeurs" },
    { label: "Réclamations ouvertes",              valeur: dashboard.aTraiter.reclamationsOuvertes, href: "/admin/reclamations" },
    { label: `Produits en stock faible (< ${5})`,  valeur: dashboard.aTraiter.stockFaible }, // pas de page /admin/produits pour l'instant — Phase 2
  ] : [];

  const lignesAlertes: LigneAlerte[] = dashboard ? [
    {
      label: "Paiements Airtel Money",
      ok: dashboard.alertes.echecsAirtel30min === 0,
      detail: dashboard.alertes.echecsAirtel30min > 0
        ? `${dashboard.alertes.echecsAirtel30min} échec(s) sur les 30 dernières minutes`
        : "Aucun échec récent",
    },
    {
      label: "Paiements Moov Money",
      ok: dashboard.alertes.echecsMoov30min === 0,
      detail: dashboard.alertes.echecsMoov30min > 0
        ? `${dashboard.alertes.echecsMoov30min} échec(s) sur les 30 dernières minutes`
        : "Aucun échec récent",
    },
    {
      label: "Compte marchand PVIT · Airtel",
      ok: dashboard.alertes.pvitAirtelConfigure,
      detail: dashboard.alertes.pvitAirtelConfigure ? "Configuré" : "Non configuré — voir Configuration",
    },
    {
      label: "Compte marchand PVIT · Moov",
      ok: dashboard.alertes.pvitMoovConfigure,
      detail: dashboard.alertes.pvitMoovConfigure ? "Configuré" : "Non configuré — voir Configuration",
    },
    {
      label: "Libération automatique escrow",
      ok: dashboard.alertes.escrowEnRetard === 0,
      detail: dashboard.alertes.escrowEnRetard > 0
        ? `${dashboard.alertes.escrowEnRetard} commande(s) en retard — le cron a peut-être échoué`
        : "À jour",
    },
  ] : [];

  const sections = [
    { href: "/admin/vendeurs",     icon: "🏪", titre: "Boutiques",       desc: "Valider, suspendre, supprimer des boutiques" },
    { href: "/admin/utilisateurs", icon: "👥", titre: "Utilisateurs",    desc: "Changer rôle, bannir, gérer les comptes" },
    { href: "/admin/livreurs",     icon: "🛵", titre: "Livreurs",        desc: "Stats, gains, suspendre des livreurs" },
    { href: "/admin/commandes",    icon: "📦", titre: "Commandes",       desc: "Modifier statut, rembourser, libérer escrow" },
    { href: "/admin/paiements",    icon: "💳", titre: "Paiements",       desc: "Historique des transactions PVIT" },
    { href: "/admin/livraisons",   icon: "🚚", titre: "Livraisons",      desc: "Assigner les livreurs aux commandes" },
    { href: "/admin/reclamations",     icon: "⚠️",  titre: "Réclamations",        desc: "Résoudre les litiges" },
    { href: "/admin/configuration",    icon: "⚙️",  titre: "Configuration",       desc: "Tarifs, paiements, maintenance, bannière" },
    { href: "/admin/categories",       icon: "🏷️",  titre: "Catégories",          desc: "Ajouter, modifier, réorganiser les catégories" },
    { href: "/admin/tarifs-livraison", icon: "🗺️",  titre: "Tarifs Livraison",    desc: "Modifier les prix inter-provinces et villes" },
    { href: "/admin/candidatures",     icon: "🏍️",  titre: "Candidatures Livreur", desc: "Approuver les demandes de nouveaux livreurs" },
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
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
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

        {/* Aujourd'hui */}
        {!chargement && dashboard && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Aujourd&apos;hui</h2>
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              {[
                { label: "CA",      valeur: formatXAF(dashboard.aujourdhui.caJour) },
                { label: "Commandes", valeur: dashboard.aujourdhui.commandesJour },
                { label: "Clients",   valeur: dashboard.aujourdhui.clientsJour },
                { label: "Vendeurs",  valeur: dashboard.aujourdhui.vendeursJour },
              ].map((s) => (
                <div key={s.label} className="px-2 py-3 text-center">
                  <div className="text-sm font-black text-gray-800">{s.valeur}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* À traiter */}
        {!chargement && dashboard && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">À traiter</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {lignesATraiter.map((l) => {
                const contenu = (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{l.label}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${l.valeur > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400"}`}>
                      {l.valeur}
                    </span>
                  </div>
                );
                return l.href
                  ? <Link key={l.label} href={l.href} className="block hover:bg-gray-50 transition-colors">{contenu}</Link>
                  : <div key={l.label}>{contenu}</div>;
              })}
            </div>
          </div>
        )}

        {/* Alertes / Santé */}
        {!chargement && dashboard && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Santé de la plateforme</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {lignesAlertes.map((l) => (
                <div key={l.label} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-700">{l.label}</p>
                    <p className={`text-xs mt-0.5 ${l.ok ? "text-gray-400" : "text-red-600 font-semibold"}`}>{l.detail}</p>
                  </div>
                  <span className={`text-lg flex-shrink-0 ${l.ok ? "" : "animate-pulse"}`}>{l.ok ? "🟢" : "🔴"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
