"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuditLogAdmin } from "@/app/actions/audit";
import Link from "next/link";

type Entree = {
  id: string;
  admin_id: string | null;
  admin_nom: string | null;
  action: string;
  cible_type: string | null;
  cible_id: string | null;
  avant: unknown;
  apres: unknown;
  created_at: string;
};

type Categorie = "Tous" | "config" | "vendeur" | "coupon" | "retrait" | "produit" | "pvit_config";

const CATEGORIE_LABEL: Record<Categorie, string> = {
  Tous: "Tout", config: "Configuration", vendeur: "Vendeurs",
  coupon: "Coupons", retrait: "Retraits", produit: "Produits", pvit_config: "Paiements",
};

function formaterValeur(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [chargement, setChargement] = useState(true);
  const [categorie, setCategorie] = useState<Categorie>("Tous");

  const charger = useCallback(async () => {
    const res = await getAuditLogAdmin();
    if (res.entrees) setEntrees(res.entrees as Entree[]);
    setChargement(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      await charger();
    })();
  }, [router, charger]);

  const visibles = entrees.filter((e) => categorie === "Tous" || e.cible_type === categorie);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Journal d&apos;audit 📜</h1>
        <p className="text-white/70 text-sm mt-1">{entrees.length} action{entrees.length > 1 ? "s" : ""} enregistrée{entrees.length > 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {(Object.keys(CATEGORIE_LABEL) as Categorie[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategorie(c)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                categorie === c ? "bg-[#E63946] border-[#E63946] text-white" : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {CATEGORIE_LABEL[c]}
            </button>
          ))}
        </div>

        {chargement && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse mb-3" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">📜</div>
            <p className="text-gray-500 font-medium">Aucune action enregistrée</p>
          </div>
        )}

        <div className="space-y-2">
          {visibles.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg">{e.action}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(e.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {e.admin_nom ?? "Admin"} {e.cible_id && <>· cible : <span className="font-mono">{e.cible_id}</span></>}
              </p>
              {(e.avant !== null || e.apres !== null) && (
                <div className="flex items-start gap-2 text-xs bg-gray-50 rounded-xl p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 font-bold mb-0.5">Avant</p>
                    <p className="text-gray-600 break-words">{formaterValeur(e.avant)}</p>
                  </div>
                  <span className="text-gray-300 mt-4">→</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 font-bold mb-0.5">Après</p>
                    <p className="text-gray-800 font-semibold break-words">{formaterValeur(e.apres)}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
