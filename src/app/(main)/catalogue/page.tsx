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
  created_at: string;
  vendeurs: { nom: string; slug: string; ville: string | null } | null;
};

function isNouveau(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// ─── Carte produit ────────────────────────────────────────────────────────────
function CarteProrduit({ p }: { p: ProduitAvecVendeur }) {
  const nouveau = isNouveau(p.created_at);
  return (
    <Link
      href={`/produit/${p.id}`}
      className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-all duration-150 border border-gray-100/60"
    >
      {/* Photo — carré parfait */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {p.image ? (
          <Image
            src={p.image}
            alt={p.nom}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-gray-300 font-medium">Photo bientôt</span>
          </div>
        )}

        {/* Badge Nouveau */}
        {nouveau && (
          <div className="absolute top-2 left-2">
            <span className="bg-[#E63946] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm tracking-wide">
              Nouveau
            </span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-3">
        <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug mb-1.5 min-h-[2.5rem]">
          {p.nom}
        </p>

        {p.vendeurs && (
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-4 h-4 rounded-full bg-[#E63946]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-black text-[#E63946]">
                {p.vendeurs.nom.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate font-medium">{p.vendeurs.nom}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[15px] font-black text-[#E63946] leading-none">
            {formatXAF(p.prix)}
          </p>
          <div className="w-7 h-7 bg-[#E63946] rounded-lg flex items-center justify-center shadow-sm shadow-red-200">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCarte() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100/60">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-100 rounded-full w-4/5" />
        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        <div className="flex items-center justify-between pt-0.5">
          <div className="h-4 bg-gray-100 rounded-full w-24" />
          <div className="w-7 h-7 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Contenu principal ────────────────────────────────────────────────────────
function CatalogueContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const catParam     = searchParams.get("categorie") ?? null;
  const qParam       = searchParams.get("q") ?? "";

  const [produits,   setProduits]   = useState<ProduitAvecVendeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche,  setRecherche]  = useState(qParam);

  useEffect(() => { setRecherche(qParam); }, [qParam]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("produits")
      .select("id, nom, prix, image, categorie, vendeur_id, created_at, vendeurs(nom, slug, ville)")
      .eq("statut", "actif")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProduits((data as unknown as ProduitAvecVendeur[]) ?? []);
        setChargement(false);
      });
  }, []);

  const setFiltre = (slug: string | null) => {
    const params = new URLSearchParams();
    if (slug) params.set("categorie", slug);
    if (recherche.trim()) params.set("q", recherche.trim());
    router.push(`/catalogue${params.toString() ? `?${params.toString()}` : ""}`);
  };

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

      {/* ── Header sticky ─────────────────────────────────────────── */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2.5 space-y-2.5">

          {/* Barre de recherche */}
          <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2.5">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={recherche}
              onChange={(e) => handleRecherche(e.target.value)}
              placeholder={catActive ? `Chercher dans ${catActive.name}…` : "Rechercher un article…"}
              className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            {(recherche || catParam) && (
              <button onClick={() => { setRecherche(""); setFiltre(null); }}
                className="text-gray-400 text-lg leading-none flex-shrink-0">×</button>
            )}
          </div>

        </div>
      </div>

      {/* ── Corps ─────────────────────────────────────────────────── */}
      <div className="px-4 py-4">

        {/* En-tête catégorie */}
        {catActive && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
              <Image src={catActive.image} alt={catActive.name} width={40} height={40}
                className="w-full h-full object-cover" unoptimized />
            </div>
            <div>
              <p className="font-black text-gray-800 text-base">{catActive.name}</p>
              {!chargement && (
                <p className="text-xs text-gray-400">{filtrés.length} article{filtrés.length !== 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
        )}

        {/* Compteur sans filtre catégorie */}
        {!catActive && !chargement && produits.length > 0 && (
          <p className="text-xs text-gray-400 font-medium mb-4">
            {filtrés.length} article{filtrés.length !== 1 ? "s" : ""} disponibles
          </p>
        )}

        {/* Skeletons */}
        {chargement && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCarte key={i} />)}
          </div>
        )}

        {/* Grille produits */}
        {!chargement && filtrés.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtrés.map((p) => <CarteProrduit key={p.id} p={p} />)}
          </div>
        )}

        {/* État vide */}
        {!chargement && filtrés.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-black text-gray-700 text-base mb-1">Aucun article trouvé</p>
            <p className="text-sm text-gray-400 mb-5">
              {recherche
                ? `Aucun résultat pour "${recherche}"`
                : catActive
                ? `Aucun article en ${catActive.name} pour l'instant`
                : "Aucun article disponible"}
            </p>
            {(recherche || catParam) && (
              <button
                onClick={() => { setRecherche(""); setFiltre(null); }}
                className="text-sm text-[#E63946] font-bold px-5 py-2.5 bg-[#FEF2F2] rounded-2xl active:scale-95 transition-all"
              >
                Voir tous les articles
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wrapper Suspense ─────────────────────────────────────────────────────────
export default function CataloguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="bg-white h-28 shadow-sm border-b border-gray-100 animate-pulse" />
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCarte key={i} />)}
        </div>
      </div>
    }>
      <CatalogueContent />
    </Suspense>
  );
}
