"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import type { Commande } from "@/lib/supabase/database.types";

const STATUT: Record<string, { label: string; cls: string }> = {
  en_attente_paiement: { label: "En attente",  cls: "bg-yellow-100 text-yellow-700" },
  payee_escrow:        { label: "Payée",        cls: "bg-blue-100 text-blue-700"    },
  confirmee_vendeur:   { label: "Confirmée",    cls: "bg-blue-100 text-blue-700"    },
  en_livraison:        { label: "En livraison", cls: "bg-orange-100 text-orange-700"},
  livree:              { label: "Livrée ✓",    cls: "bg-green-100 text-green-700"  },
  annulee:             { label: "Annulée",      cls: "bg-red-100 text-red-700"      },
  remboursee:          { label: "Remboursée",   cls: "bg-gray-100 text-gray-600"    },
  litige:              { label: "Litige ⚠️",    cls: "bg-red-100 text-red-700"      },
};

export default function CommandesPage() {
  const router = useRouter();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login?redirect=/compte/commandes"); return; }
      const { data } = await supabase
        .from("commandes").select("*")
        .eq("utilisateur_id", user.id)
        .order("created_at", { ascending: false });
      setCommandes(data ?? []);
      setChargement(false);
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#00A550] px-5 pt-12 pb-8">
        <Link href="/compte" className="text-white/70 text-sm">← Mon compte</Link>
        <h1 className="text-2xl font-black text-white mt-2">Mes commandes</h1>
        {!chargement && (
          <p className="text-white/70 text-sm mt-1">{commandes.length} commande{commandes.length > 1 ? "s" : ""}</p>
        )}
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-3">
        {chargement && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}

        {!chargement && commandes.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center mt-4 shadow-sm">
            <div className="text-5xl mb-3">📦</div>
            <p className="font-black text-gray-700 mb-1">Aucune commande</p>
            <p className="text-sm text-gray-400 mb-5">Vous n'avez pas encore passé de commande.</p>
            <Link href="/catalogue"
              className="inline-block bg-[#00A550] text-white font-bold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-all">
              Parcourir le catalogue
            </Link>
          </div>
        )}

        {!chargement && commandes.map((c) => {
          const s = STATUT[c.statut] ?? { label: c.statut, cls: "bg-gray-100 text-gray-600" };
          return (
            <Link key={c.id} href={`/commande/${c.code_court}`}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-98 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-gray-800">{c.code_court ?? c.id.slice(0, 8)}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-[#00A550]">{formatXAF(c.total)}</p>
                <p className="text-gray-300 text-lg">›</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
