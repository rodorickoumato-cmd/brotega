"use client";
import { use } from "react";
import Image from "next/image";
import { vendors } from "@/data/vendors";
import { products } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { notFound } from "next/navigation";

export default function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const vendor = vendors.find((v) => v.slug === slug);
  if (!vendor) notFound();

  const vendorProducts = products.filter((p) => p.vendorId === vendor.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cover */}
      <div className="bg-gradient-to-br from-[#00A550] to-[#007A3D] rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 text-[200px] flex items-center justify-end pr-8">🏪</div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border-4 border-white/30 shadow-lg overflow-hidden relative flex-shrink-0">
            <Image src={vendor.logo} alt={vendor.name} fill sizes="80px" className="object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black">{vendor.name}</h1>
              {vendor.verified && <Badge variant="outline">✓ Boutique vérifiée</Badge>}
            </div>
            <p className="text-white/80 text-sm mt-1 max-w-lg">{vendor.description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span>📍 {vendor.city}</span>
              <span>📦 {vendor.productCount} produits</span>
              <StarRating rating={vendor.rating} count={vendor.reviewCount} />
              <span>📅 Membre depuis {new Date(vendor.joinedAt).getFullYear()}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {vendor.whatsapp && (
              <a href={`https://wa.me/${vendor.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">💬 WhatsApp</Button>
              </a>
            )}
            <Button variant="ghost" size="sm" className="text-white border border-white/30 hover:bg-white/20">
              ❤️ Suivre
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-8">
        {vendor.categories.map((c) => (
          <Badge key={c} variant="green" className="text-sm px-3 py-1">{c}</Badge>
        ))}
      </div>

      {/* Products */}
      <div>
        <h2 className="text-xl font-black text-gray-800 mb-5">
          Produits de {vendor.name} ({vendorProducts.length})
        </h2>
        {vendorProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {vendorProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="text-gray-500">Ce vendeur n'a pas encore de produits.</p>
          </div>
        )}
      </div>
    </div>
  );
}
