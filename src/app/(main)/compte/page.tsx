"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import { deconnecter } from "@/app/actions/auth";
import type { Utilisateur, Commande } from "@/lib/supabase/database.types";

const STATUT_STYLE: Record<string, { label: string; cls: string }> = {
  en_attente_paiement: { label: "En attente",  cls: "bg-yellow-100 text-yellow-700" },
  payee_escrow:        { label: "Payée",        cls: "bg-blue-100 text-blue-700"    },
  confirmee_vendeur:   { label: "Confirmée",    cls: "bg-blue-100 text-blue-700"    },
  en_livraison:        { label: "En livraison", cls: "bg-orange-100 text-orange-700"},
  livree:              { label: "Livrée ✓",    cls: "bg-green-100 text-green-700"  },
  annulee:             { label: "Annulée",      cls: "bg-red-100 text-red-700"      },
  remboursee:          { label: "Remboursée",   cls: "bg-gray-100 text-gray-600"    },
  litige:              { label: "Litige",        cls: "bg-red-100 text-red-700"      },
};

export default function ComptePage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Utilisateur | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login?redirect=/compte"); return; }

        const [{ data: p }, { data: c }] = await Promise.all([
          supabase.from("utilisateurs").select("*").eq("id", user.id).single(),
          supabase.from("commandes").select("*").eq("utilisateur_id", user.id)
            .order("created_at", { ascending: false }).limit(3),
        ]);

        setProfil(p);
        setCommandes(c ?? []);
      } catch {
        // En cas d'erreur réseau, on affiche quand même la page (vide)
      } finally {
        setChargement(false);
      }
    })();
  }, [router]);

  const initiales = profil?.nom
    ? profil.nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-[#E63946] border-t-transparent" />
      </div>
    );
  }

  const profilIncomplet = !profil?.email || !profil?.whatsapp;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0">
            {initiales}
          </div>
          <div className="min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate">{profil?.nom ?? "—"}</p>
            <p className="text-white/70 text-sm">{profil?.telephone ?? "—"}</p>
            {profil?.email && (
              <p className="text-white/60 text-xs truncate">{profil.email}</p>
            )}
            <span className={`mt-1.5 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
              profil?.role === "vendeur" ? "bg-yellow-400 text-yellow-900"
              : profil?.role === "admin" ? "bg-red-400 text-white"
              : "bg-white/20 text-white"
            }`}>
              {profil?.role === "acheteur" ? "Acheteur"
               : profil?.role === "vendeur" ? "Vendeur"
               : profil?.role === "livreur" ? "Livreur"
               : "Admin"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-10">

        {/* Alerte profil incomplet */}
        {profilIncomplet && (
          <Link href="/compte/profil"
            className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-yellow-800">Profil incomplet</p>
              <p className="text-xs text-yellow-600">
                {!profil?.email && !profil?.whatsapp
                  ? "Ajoutez votre email et WhatsApp"
                  : !profil?.email
                  ? "Ajoutez votre email"
                  : "Ajoutez votre WhatsApp"}
              </p>
            </div>
            <span className="text-yellow-400 text-lg flex-shrink-0">›</span>
          </Link>
        )}

        {/* Menu principal */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          {[
            { icon: "👤", label: "Modifier mon profil", href: "/compte/profil" },
            { icon: "📦", label: "Mes commandes", href: "/compte/commandes" },
            ...(profil?.role === "vendeur"
              ? [{ icon: "🏪", label: "Dashboard vendeur", href: "/vendor/dashboard" }]
              : [{ icon: "🏪", label: "Devenir vendeur", href: "/vendor/register" }]),
          ].map((item, i, arr) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-4 px-5 py-4 active:bg-gray-50 transition-colors ${
                i < arr.length - 1 ? "border-b border-gray-100" : ""
              }`}>
              <span className="text-xl w-8 text-center">{item.icon}</span>
              <span className="flex-1 font-semibold text-gray-800 text-sm">{item.label}</span>
              <span className="text-gray-300 text-lg">›</span>
            </Link>
          ))}
        </div>

        {/* Commandes récentes */}
        {commandes.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-gray-800">Commandes récentes</p>
              <Link href="/compte/commandes" className="text-xs text-[#E63946] font-bold">Tout voir</Link>
            </div>
            <div className="space-y-2">
              {commandes.map((c) => {
                const s = STATUT_STYLE[c.statut] ?? { label: c.statut, cls: "bg-gray-100 text-gray-600" };
                return (
                  <Link key={c.id} href={`/commande/${c.code_court}`}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{c.code_court ?? c.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      <span className="font-black text-sm text-[#E63946]">{formatXAF(c.total)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Déconnexion */}
        <form action={deconnecter}>
          <button type="submit"
            className="w-full bg-white rounded-2xl py-4 text-red-500 font-bold text-sm shadow-sm active:scale-95 transition-all">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
