"use client";
import { useState, useEffect } from "react";
import { Product } from "@/types";
import { formatXAF, getDiscount } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toaster";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { products } from "@/data/products";
import Image from "next/image";
import Link from "next/link";
import { categories } from "@/data/categories";

function ShareButton({ product }: { product: Product }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/produit/${product.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: product.description, url });
      } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Lien copié dans le presse-papier ✓", "success");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Partager ce produit"
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#00A550] transition-colors px-3 py-1.5 border border-gray-200 hover:border-[#00A550]/40 rounded-lg"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {copied ? "Copié !" : "Partager"}
    </button>
  );
}

export function ProductPageClient({ product, related }: { product: Product; related: Product[] }) {
  const { dispatch } = useCart();
  const { slugs, addProduct } = useRecentlyViewed();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const discount = product.originalPrice ? getDiscount(product.price, product.originalPrice) : null;
  const catSlug = categories.find((c) => c.name === product.category)?.slug ?? "";

  // Enregistrer dans les produits récemment consultés
  useEffect(() => {
    addProduct(product.slug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  const addToCart = () => {
    dispatch({ type: "ADD", product, qty });
    dispatch({ type: "TOGGLE" });
    toast(`${product.name} ajouté au panier ✓`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-[#00A550] transition-colors">Accueil</Link>
        <span>/</span>
        <Link href="/catalogue" className="hover:text-[#00A550] transition-colors">Catalogue</Link>
        <span>/</span>
        <Link href={`/catalogue?categorie=${catSlug}`} className="hover:text-[#00A550] transition-colors">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Galerie images */}
        <div>
          <div className="bg-white rounded-3xl overflow-hidden mb-3 aspect-square shadow-sm border border-gray-100 relative">
            <Image
              src={product.images[activeImg] || product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Voir la photo ${i + 1}`}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 relative transition-all flex-shrink-0 ${i === activeImg ? "border-[#00A550]" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos produit */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-2">
              {product.isNew && <Badge variant="green">Nouveau</Badge>}
              {discount && <Badge variant="red">-{discount}% de réduction</Badge>}
              {product.stock < 10 && product.stock > 0 && (
                <Badge variant="orange">⚡ Plus que {product.stock} en stock</Badge>
              )}
              {product.stock === 0 && <Badge variant="red">Rupture de stock</Badge>}
            </div>
            <ShareButton product={product} />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-3">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <StarRating rating={product.rating} count={product.reviewCount} size="md" />
          </div>

          {/* Prix */}
          <div className="bg-[#E8F7EE] rounded-2xl p-4 mb-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-[#00A550]">{formatXAF(product.price)}</span>
              {product.unit && <span className="text-gray-500 text-sm">/ {product.unit}</span>}
            </div>
            {product.originalPrice && (
              <p className="text-sm text-gray-400 line-through mt-0.5">{formatXAF(product.originalPrice)}</p>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(product.tags ?? []).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-[#E8F7EE] hover:text-[#00A550] transition-colors cursor-default">
                #{tag}
              </span>
            ))}
          </div>

          {/* Quantité + Ajouter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Diminuer la quantité"
                className="text-lg font-bold hover:text-[#00A550] w-6 text-center transition-colors"
              >−</button>
              <span className="text-base font-bold w-8 text-center">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock, qty + 1))}
                aria-label="Augmenter la quantité"
                className="text-lg font-bold hover:text-[#00A550] w-6 text-center transition-colors"
              >+</button>
            </div>
            <Button
              onClick={addToCart}
              size="lg"
              fullWidth
              disabled={product.stock === 0}
              aria-label={`Ajouter ${qty} ${product.name} au panier`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {product.stock === 0 ? "Indisponible" : "Ajouter au panier"}
            </Button>
          </div>

          {/* WhatsApp */}
          {product.vendor.whatsapp && (
            <a
              href={`https://wa.me/${product.vendor.whatsapp}?text=${encodeURIComponent(`Bonjour, je suis intéressé par "${product.name}" sur Brotega.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 hover:border-[#25D366] hover:bg-[#25D366]/5 text-gray-700 hover:text-[#25D366] font-semibold py-3 px-4 rounded-xl transition-all text-sm mb-5"
            >
              💬 Contacter le vendeur via WhatsApp
            </a>
          )}

          {/* Carte vendeur */}
          <Link href={`/vendeur/${product.vendor.slug}`}>
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#00A550]/40 hover:shadow-sm transition-all">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <Image src={product.vendor.logo} alt={product.vendor.name} fill sizes="48px" className="object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm">{product.vendor.name}</span>
                  {product.vendor.verified && <Badge variant="green">✓</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={product.vendor.rating} size="sm" />
                  <span className="text-xs text-gray-400">📍 {product.vendor.city}</span>
                </div>
              </div>
              <span className="text-[#00A550] text-sm font-semibold flex-shrink-0">Voir boutique →</span>
            </div>
          </Link>

          {/* Garanties */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[["🚚", "Livraison", "nationale"], ["🔒", "Paiement", "sécurisé"], ["↩️", "Retour", "sous 7j"]].map(([icon, label, sub]) => (
              <div key={label as string} className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl">{icon}</div>
                <div className="text-xs font-semibold mt-1">{label}</div>
                <div className="text-xs text-gray-400">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Produits similaires */}
      {related.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-black text-gray-800 mb-5">Produits similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Récemment consultés (hors produit actuel) */}
      {slugs.filter((s) => s !== product.slug).length > 0 && (
        <RecentlyViewedSection currentSlug={product.slug} slugs={slugs} />
      )}
    </div>
  );
}

function RecentlyViewedSection({ currentSlug, slugs }: { currentSlug: string; slugs: string[] }) {
  const recentProducts = slugs
    .filter((s) => s !== currentSlug)
    .map((s: string) => products.find((p: Product) => p.slug === s))
    .filter(Boolean)
    .slice(0, 4) as Product[];

  if (recentProducts.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-black text-gray-800 mb-5">Récemment consultés</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {recentProducts.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
