"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatXAF } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Produit } from "@/lib/supabase/database.types";

export default function CataloguePage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("produits")
      .select("*")
      .eq("statut", "actif")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProduits(data ?? []);
        setChargement(false);
      });
  }, []);

  const filtrés = produits.filter((p) =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Barre de recherche sticky */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2.5">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un produit..."
            className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          {recherche && (
            <button onClick={() => setRecherche("")} className="text-gray-400 text-lg leading-none">×</button>
          )}
        </div>
      </div>

      <div className="px-4 py-5">
        {/* Compteur */}
        <p className="text-xs text-gray-500 font-medium mb-4">
          {chargement ? "Chargement..." : `${filtrés.length} produit${filtrés.length > 1 ? "s" : ""}`}
        </p>

        {/* Skeletons */}
        {chargement && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Produits */}
        {!chargement && filtrés.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtrés.map((p) => (
              <Link
                key={p.id}
                href={`/produit/${p.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-all"
              >
                {p.image ? (
                  <div className="relative h-40">
                    <Image src={p.image} alt={p.nom} fill sizes="50vw" className="object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 flex items-center justify-center text-4xl">🛍️</div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{p.nom}</p>
                  <p className="text-base font-black text-[#00A550]">{formatXAF(p.prix)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Vide */}
        {!chargement && filtrés.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-bold text-gray-700 mb-1">Aucun produit trouvé</p>
            <p className="text-sm text-gray-400">
              {recherche ? `Aucun résultat pour "${recherche}"` : "Aucun produit disponible pour l'instant"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
