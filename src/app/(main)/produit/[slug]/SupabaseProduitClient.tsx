"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toaster";
import { formatXAF } from "@/lib/utils";
import type { Produit, Vendeur } from "@/lib/supabase/database.types";
import type { Product, Vendor } from "@/types";

export function SupabaseProduitClient({
  produit,
  vendeur,
}: {
  produit: Produit;
  vendeur: Vendeur | null;
}) {
  const { dispatch } = useCart();

  const handleAdd = () => {
    const v: Vendor = {
      id: vendeur?.id ?? produit.vendeur_id,
      name: vendeur?.nom ?? "Boutique",
      slug: vendeur?.slug ?? "",
      logo: vendeur?.logo_url ?? "",
      description: vendeur?.description ?? "",
      city: vendeur?.ville ?? "",
      rating: vendeur?.note ?? 0,
      reviewCount: vendeur?.nb_avis ?? 0,
      productCount: vendeur?.nb_produits ?? 0,
      verified: vendeur?.statut === "verifie",
      joinedAt: vendeur?.created_at ?? "",
      categories: vendeur?.categories ?? [],
    };
    const cartProduct: Product = {
      id: produit.id,
      name: produit.nom,
      slug: produit.id,
      description: produit.description ?? "",
      price: produit.prix,
      images: produit.image ? [produit.image] : [],
      category: "",
      vendorId: produit.vendeur_id,
      vendor: v,
      rating: 0,
      reviewCount: 0,
      stock: 999,
      city: vendeur?.ville ?? "",
    };
    dispatch({ type: "ADD", product: cartProduct });
    toast(`${produit.nom} ajouté au panier ✓`);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/catalogue" className="text-gray-500 text-xl flex-shrink-0">←</Link>
        <div className="min-w-0">
          <p className="font-black text-sm text-gray-800 truncate">{produit.nom}</p>
          {vendeur && <p className="text-xs text-gray-400">{vendeur.nom}</p>}
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Image */}
        {produit.image ? (
          <div className="relative h-72 bg-gray-100">
            <Image src={produit.image} alt={produit.nom} fill sizes="100vw" className="object-cover" />
          </div>
        ) : (
          <div className="h-72 bg-gray-100 flex items-center justify-center text-6xl">🛍️</div>
        )}

        <div className="px-4 py-5 space-y-4">
          {/* Nom + Prix */}
          <div>
            <h1 className="text-xl font-black text-gray-800">{produit.nom}</h1>
            <p className="text-3xl font-black text-[#E63946] mt-1">{formatXAF(produit.prix)}</p>
            {produit.categorie && (
              <span className="inline-block text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full mt-2">
                {produit.categorie}
              </span>
            )}
          </div>

          {/* Description */}
          {produit.description && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-1">Description</p>
              <p className="text-sm text-gray-600 leading-relaxed">{produit.description}</p>
            </div>
          )}

          {/* Vendeur */}
          {vendeur && (
            <Link
              href={`/vendeur/${vendeur.slug}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm active:scale-95 transition-all"
            >
              <div className="w-10 h-10 bg-[#FEF2F2] rounded-full flex items-center justify-center text-lg flex-shrink-0">
                🏪
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-800">{vendeur.nom}</p>
                <p className="text-xs text-gray-400">📍 {vendeur.ville}</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </Link>
          )}

          {/* Ajouter au panier */}
          <button
            onClick={handleAdd}
            className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-lg active:scale-95 transition-all shadow-lg"
          >
            🛒 Ajouter au panier
          </button>

          {/* Frais de livraison */}
          <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-900">
            <p className="font-bold mb-1">🚚 Livraison</p>
            <p className="text-xs">Frais fixes : {formatXAF(2500)} · Livraison rapide à Libreville et environs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
