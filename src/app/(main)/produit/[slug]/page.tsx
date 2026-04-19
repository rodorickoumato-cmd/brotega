"use client";
import { use, useState } from "react";
import { getProductBySlug, products } from "@/data/products";
import { formatXAF, getDiscount } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toaster";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/data/categories";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const { dispatch } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const discount = product.originalPrice ? getDiscount(product.price, product.originalPrice) : null;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const addToCart = () => {
    dispatch({ type: "ADD", product, qty });
    dispatch({ type: "TOGGLE" });
    toast(`${product.name} ajouté au panier ✓`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-[#00A550]">Accueil</Link>
        <span>/</span>
        <Link href="/catalogue" className="hover:text-[#00A550]">Catalogue</Link>
        <span>/</span>
        <Link href={`/catalogue?categorie=${categories.find((c) => c.name === product.category)?.slug ?? ""}`} className="hover:text-[#00A550]">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Images */}
        <div>
          <div className="bg-white rounded-3xl overflow-hidden mb-3 aspect-square shadow-sm border border-gray-100">
            <img src={product.images[activeImg] || product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? "border-[#00A550]" : "border-gray-200"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {product.isNew && <Badge variant="green">Nouveau</Badge>}
            {discount && <Badge variant="red">-{discount}% de réduction</Badge>}
            {product.stock < 10 && product.stock > 0 && <Badge variant="orange">⚡ Plus que {product.stock} en stock</Badge>}
            {product.stock === 0 && <Badge variant="red">Rupture de stock</Badge>}
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-3">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <StarRating rating={product.rating} count={product.reviewCount} size="md" />
          </div>

          {/* Price */}
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
          <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {product.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">#{tag}</span>
            ))}
          </div>

          {/* Qty + Add */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-lg font-bold hover:text-[#00A550] w-6 text-center">−</button>
              <span className="text-base font-bold w-8 text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="text-lg font-bold hover:text-[#00A550] w-6 text-center">+</button>
            </div>
            <Button onClick={addToCart} size="lg" fullWidth disabled={product.stock === 0}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {product.stock === 0 ? "Indisponible" : "Ajouter au panier"}
            </Button>
          </div>

          {product.vendor.whatsapp && (
            <a
              href={`https://wa.me/${product.vendor.whatsapp}?text=${encodeURIComponent(`Bonjour, je suis intéressé par "${product.name}" sur Brotega.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 hover:border-[#25D366] hover:bg-[#25D366]/5 text-gray-700 hover:text-[#25D366] font-semibold py-3 px-4 rounded-xl transition-all text-sm"
            >
              💬 Contacter le vendeur via WhatsApp
            </a>
          )}

          {/* Vendor card */}
          <Link href={`/vendeur/${product.vendor.slug}`}>
            <div className="mt-6 flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#00A550]/40 transition-colors">
              <img src={product.vendor.logo} alt={product.vendor.name} className="w-12 h-12 rounded-xl" />
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
              <span className="text-[#00A550] text-sm font-semibold">Voir boutique →</span>
            </div>
          </Link>

          {/* Guarantees */}
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

      {/* Related products */}
      {related.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-gray-800 mb-5">Produits similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
