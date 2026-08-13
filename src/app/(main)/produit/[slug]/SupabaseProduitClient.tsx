"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toaster";
import { formatXAF } from "@/lib/utils";
import { WhatsAppShareButton } from "@/components/ui/WhatsAppShareButton";
import type { Produit, Vendeur } from "@/lib/supabase/database.types";
import type { Product, Vendor } from "@/types";

// ─── Avatar vendeur ───────────────────────────────────────────────────────────
function VendeurAvatar({ nom, logo }: { nom: string; logo?: string | null }) {
  if (logo) {
    return (
      <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
        <Image src={logo} alt={nom} width={48} height={48} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E63946] to-[#c62d38] flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-200">
      <span className="text-white font-black text-lg">{nom.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function SupabaseProduitClient({
  produit,
  vendeur,
}: {
  produit: Produit;
  vendeur: Vendeur | null;
}) {
  const { dispatch } = useCart();
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);

  const buildCartProduct = (): Product => {
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
    return {
      id: produit.id,
      name: produit.nom,
      slug: produit.id,
      description: produit.description ?? "",
      price: produit.prix,
      images: produit.image ? [produit.image] : [],
      category: produit.categorie ?? "",
      vendorId: produit.vendeur_id,
      vendor: v,
      rating: 0,
      reviewCount: 0,
      stock: 999,
      city: vendeur?.ville ?? "",
    };
  };

  const handleAdd = () => {
    const p = buildCartProduct();
    for (let i = 0; i < qty; i++) {
      dispatch({ type: "ADD", product: p });
    }
    dispatch({ type: "TOGGLE" });
    toast(`${produit.nom} ajouté au panier ✓`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/produit/${produit.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: produit.nom, url }); } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast("Lien copié ✓", "success");
    }
  };

  const montantTotal = produit.prix * qty;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-32">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
        <Link href="/catalogue"
          className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <p className="font-bold text-sm text-gray-800 flex-1 truncate">{produit.nom}</p>
      </div>

      {/* ── Image principale ─────────────────────────────────────── */}
      <div className="bg-white">
        <div className="relative aspect-square max-h-[420px] overflow-hidden">
          {produit.image && !imgError ? (
            <Image
              src={produit.image}
              alt={produit.nom}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50">
              <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-300 font-medium">Photo bientôt disponible</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── Nom + Prix ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {produit.categorie && (
            <span className="inline-block text-[11px] font-bold text-[#E63946] bg-[#FEF2F2] px-3 py-1 rounded-full mb-3">
              {produit.categorie}
            </span>
          )}
          <h1 className="text-xl font-black text-gray-800 leading-snug mb-3">
            {produit.nom}
          </h1>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[28px] font-black text-[#E63946] leading-none">
                {formatXAF(produit.prix)}
              </p>
              <p className="text-xs text-gray-400 mt-1">par unité · livraison en sus</p>
            </div>
            {/* Sélecteur de quantité */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-3 py-2.5">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-6 h-6 flex items-center justify-center font-black text-gray-600 active:text-[#E63946] transition-colors text-lg"
              >−</button>
              <span className="font-black text-gray-800 w-5 text-center text-base">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-6 h-6 flex items-center justify-center font-black text-gray-600 active:text-[#E63946] transition-colors text-lg"
              >+</button>
            </div>
          </div>

          {/* Partager — boutons pleins, texte + icône, grande cible tactile */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleShare}
              aria-label="Partager ce produit"
              className="flex items-center justify-center gap-2 bg-gray-800 text-white font-bold text-sm py-3 rounded-xl active:scale-[0.97] transition-all"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Partager
            </button>
            <WhatsAppShareButton
              titre={produit.nom}
              url={typeof window !== "undefined" ? `${window.location.origin}/produit/${produit.id}` : `/produit/${produit.id}`}
              prixXaf={produit.prix}
              label="WhatsApp"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-sm py-3 rounded-xl active:scale-[0.97] transition-all"
              iconClassName="w-5 h-5 flex-shrink-0"
              iconFill="white"
            />
          </div>
        </div>

        {/* ── Description ──────────────────────────────────────────── */}
        {produit.description && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed">{produit.description}</p>
          </div>
        )}

        {/* ── Vendeur ───────────────────────────────────────────────── */}
        {vendeur && (
          <Link href={`/vendeur/${vendeur.slug}`}
            className="flex items-center gap-3.5 bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all">
            <VendeurAvatar nom={vendeur.nom} logo={vendeur.logo_url} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="font-black text-sm text-gray-800 truncate">{vendeur.nom}</p>
                {vendeur.statut === "verifie" && (
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {vendeur.ville && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {vendeur.ville}
                </p>
              )}
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* ── Garanties ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: "🚚", titre: "Livraison", sub: "partout au Gabon" },
            { icon: "🔒", titre: "Escrow", sub: "paiement sécurisé" },
            { icon: "⚡", titre: "Support", sub: "réponse rapide" },
          ].map((g) => (
            <div key={g.titre} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <span className="text-xl">{g.icon}</span>
              <p className="text-[11px] font-black text-gray-700 mt-1.5">{g.titre}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{g.sub}</p>
            </div>
          ))}
        </div>

      </div>

      {/* ── Barre CTA sticky ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[55] bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 pt-3 pb-safe shadow-xl">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="flex-shrink-0 text-center">
            <p className="text-[11px] text-gray-400 leading-none">Total</p>
            <p className="text-sm font-black text-gray-800 mt-0.5">{formatXAF(montantTotal)}</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex-1 bg-[#E63946] text-white font-black py-4 rounded-2xl text-base active:scale-[0.97] transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}
