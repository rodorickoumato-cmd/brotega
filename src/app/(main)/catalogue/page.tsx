"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { ProductCard } from "@/components/product/ProductCard";
import { Suspense } from "react";
import Link from "next/link";

function CatalogueContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categorie") || "";
  const searchQuery = searchParams.get("q") || "";
  const isNewParam = searchParams.get("isNew") === "1";
  const isPromoParam = searchParams.get("promo") === "1";

  const [selectedCat, setSelectedCat] = useState(categoryParam);
  const [sort, setSort] = useState("popular");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [city, setCity] = useState("");

  const filtered = useMemo(() => {
    let list = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase().slice(0, 200);
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (isNewParam) list = list.filter((p) => p.isNew);
    if (isPromoParam) list = list.filter((p) => !!p.originalPrice);
    if (selectedCat) list = list.filter((p) => p.category === categories.find((c) => c.slug === selectedCat)?.name);
    if (city) list = list.filter((p) => p.city === city);
    list = list.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "new") list = list.filter((p) => p.isNew).concat(list.filter((p) => !p.isNew));
    return list;
  }, [searchQuery, isNewParam, isPromoParam, selectedCat, sort, priceRange, city]);

  const activeLabel = isNewParam ? "Nouveautés" : isPromoParam ? "Promotions" : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-[#00A550]">Accueil</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Catalogue</span>
        {searchQuery && (
          <>
            <span>/</span>
            <span className="text-[#00A550] font-medium">« {searchQuery} »</span>
          </>
        )}
        {activeLabel && (
          <>
            <span>/</span>
            <span className="text-[#00A550] font-medium">{activeLabel}</span>
          </>
        )}
        {selectedCat && (
          <>
            <span>/</span>
            <span className="text-[#00A550] font-medium">{categories.find((c) => c.slug === selectedCat)?.name}</span>
          </>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl p-5 space-y-6 sticky top-24 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 text-lg">Filtres</h2>

            {/* Categories */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Catégories</p>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCat("")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${!selectedCat ? "bg-[#00A550] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}
                >
                  Toutes les catégories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCat(c.slug)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${selectedCat === c.slug ? "bg-[#00A550] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}
                  >
                    <span>{c.icon}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs opacity-70">({c.productCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Prix (XAF)</p>
              <div className="space-y-2">
                {([
                  [0, 10000, "Moins de 10 000"],
                  [10000, 50000, "10 000 – 50 000"],
                  [50000, 150000, "50 000 – 150 000"],
                  [150000, 500000, "Plus de 150 000"],
                ] as [number, number, string][]).map(([min, max, label]) => (
                  <button
                    key={label}
                    onClick={() => setPriceRange([min, max])}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${priceRange[0] === min && priceRange[1] === max ? "bg-[#E8F7EE] text-[#00A550] font-semibold" : "hover:bg-gray-100 text-gray-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Ville</p>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Filtrer par ville"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              >
                <option value="">Toutes les villes</option>
                {["Libreville", "Port-Gentil", "Oyem", "Lambaréné", "Franceville", "Moanda"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setSelectedCat(""); setPriceRange([0, 500000]); setCity(""); setSort("popular"); }}
              className="w-full text-center text-sm text-red-500 hover:text-red-700 py-2 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1">
          {/* Active filters banner */}
          {(isNewParam || isPromoParam || searchQuery) && (
            <div className="mb-4 flex items-center gap-2 bg-[#E8F7EE] border border-[#00A550]/20 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-[#00A550] font-semibold">
                {isNewParam && "Filtre : Nouveautés"}
                {isPromoParam && "Filtre : Promotions"}
                {searchQuery && `Recherche : « ${searchQuery} »`}
              </span>
              <Link href="/catalogue" className="ml-auto text-xs text-gray-500 hover:text-red-500 underline">
                Effacer
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between mb-5 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 font-medium">
              <span className="text-[#00A550] font-bold">{filtered.length}</span> produit{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Trier les produits"
              className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
            >
              <option value="popular">Popularité</option>
              <option value="rating">Meilleures notes</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="new">Nouveautés</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-gray-700 font-semibold mb-1">Aucun produit trouvé</p>
              <p className="text-gray-500 text-sm">Essayez de modifier vos filtres ou votre recherche.</p>
              <button
                onClick={() => { setSelectedCat(""); setPriceRange([0, 500000]); setCity(""); }}
                className="mt-4 text-[#00A550] font-semibold hover:underline text-sm"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#00A550] border-t-transparent rounded-full animate-spin" /></div>}>
      <CatalogueContent />
    </Suspense>
  );
}
