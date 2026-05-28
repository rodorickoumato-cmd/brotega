"use client";
import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatXAF } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { categories } from "@/data/categories";

type ProduitAvecVendeur = {
  id: string;
  nom: string;
  prix: number;
  image: string | null;
  categorie: string | null;
  vendeur_id: string;
  vendeurs: { nom: string; slug: string } | null;
};

// ─── Contenu principal — lit les searchParams ─────────────────────
function CatalogueContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const catParam     = searchParams.get("categorie") ?? null;
  const qParam       = searchParams.get("q") ?? "";

  const [produits,   setProduits]   = useState<ProduitAvecVendeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche,  setRecherche]  = useState(qParam);

  // Sync recherche quand l'URL change (navigation header)
  useEffect(() => { setRecherche(qParam); }, [qParam]);

  // Chargement unique des produits
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("produits")
      .select("id, nom, prix, image, categorie, vendeur_id, vendeurs(nom, slug)")
      .eq("statut", "actif")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProduits((data as unknown as ProduitAvecVendeur[]) ?? []);
        setChargement(false);
      });
  }, []);

  // Changer de catégorie → met à jour l'URL (source de vérité unique)
  const setFiltre = (slug: string | null) => {
    const params = new URLSearchParams();
    if (slug) params.set("categorie", slug);
    if (recherche.trim()) params.set("q", recherche.trim());
    router.push(`/catalogue${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Lancer une recherche texte
  const handleRecherche = (val: string) => {
    setRecherche(val);
    const params = new URLSearchParams();
    if (catParam) params.set("categorie", catParam);
    if (val.trim()) params.set("q", val.trim());
    router.replace(`/catalogue${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const filtrés = produits.filter((p) => {
    if (catParam && p.categorie !== catParam) return false;
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  const catsPresentes = [...new Set(produits.map((p) => p.categorie).filter(Boolean))] as string[];
  const catActive     = categories.find((c) => c.slug === catParam);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* ── Barre recherche sticky ── */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2 space-y-3">

          {/* Recherche */}
          <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2.5">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={recherche}
              onChange={(e) => handleRecherche(e.target.value)}
              placeholder={catActive ? `Chercher dans ${catActive.name}…` : "Rechercher un produit…"}
              className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            {(recherche || catParam) && (
              <button
                onClick={() => { setRecherche(""); setFiltre(null); }}
                className="text-gray-400 text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            )}
          </div>

          {/* Tuiles catégories avec photos */}
          {catsPresentes.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">

              {/* Tous */}
              <button
                onClick={() => setFiltre(null)}
                className={`flex flex-col items-center gap-1 flex-shrink-0 transition-all`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  !catParam ? "ring-3 ring-[#E63946] ring-offset-1 bg-[#E63946]" : "bg-gray-100"
                }`}>
                  <svg className={`w-6 h-6 ${!catParam ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <span className={`text-[10px] font-bold ${!catParam ? "text-[#E63946]" : "text-gray-500"}`}>Tous</span>
              </button>

              {/* Catégories présentes */}
              {catsPresentes.map((slug) => {
                const cat    = categories.find((c) => c.slug === slug);
                const active = catParam === slug;
                if (!cat) return null;
                return (
                  <button
                    key={slug}
                    onClick={() => setFiltre(active ? null : slug)}
                    className="flex flex-col items-center gap-1 flex-shrink-0 transition-all"
                  >
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden transition-all ${
                      active ? "ring-3 ring-[#E63946] ring-offset-1" : "opacity-80"
                    }`}>
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <span className={`text-[10px] font-bold max-w-[56px] text-center leading-tight ${
                      active ? "text-[#E63946]" : "text-gray-500"
                    }`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="px-4 py-4">

        {/* Titre catégorie active */}
        {catActive && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <Image src={catActive.image} alt={catActive.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
            </div>
            <div>
              <p className="font-black text-gray-800">{catActive.name}</p>
              {!chargement && (
                <p className="text-xs text-gray-400">{filtrés.length} produit{filtrés.length !== 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
        )}

        {/* Compteur (si pas de catégorie active) */}
        {!catActive && !chargement && (
          <p className="text-xs text-gray-500 font-medium mb-4">
            {filtrés.length} produit{filtrés.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Skeletons */}
        {chargement && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grille produits */}
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
                  <div className="h-40 bg-gray-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{p.nom}</p>
                  {p.vendeurs && (
                    <p className="text-xs text-gray-400 truncate mb-1">{p.vendeurs.nom}</p>
                  )}
                  <p className="text-base font-black text-[#E63946]">{formatXAF(p.prix)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Vide */}
        {!chargement && filtrés.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-bold text-gray-700 mb-1">Aucun produit trouvé</p>
            <p className="text-sm text-gray-400">
              {recherche
                ? `Aucun résultat pour "${recherche}"`
                : catActive
                ? `Aucun produit en ${catActive.name} pour l'instant`
                : "Aucun produit disponible"}
            </p>
            {(recherche || catParam) && (
              <button
                onClick={() => { setRecherche(""); setFiltre(null); }}
                className="mt-4 text-sm text-[#E63946] font-bold px-4 py-2 bg-[#FEF2F2] rounded-xl"
              >
                Voir tous les produits
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page wrapper avec Suspense (requis par useSearchParams) ─────
export default function CataloguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="bg-white h-24 shadow-sm border-b border-gray-100 animate-pulse" />
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
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
      </div>
    }>
      <CatalogueContent />
    </Suspense>
  );
}
