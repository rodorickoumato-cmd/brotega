"use client";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types";
import { formatXAF, getDiscount } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toaster";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";

export function ProductCard({ product }: { product: Product }) {
  const { dispatch } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: "ADD", product });
    toast(`${product.name} ajouté au panier ✓`);
  };

  const discount = product.originalPrice
    ? getDiscount(product.price, product.originalPrice)
    : null;

  return (
    <Link href={`/produit/${product.slug}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-[#00A550]/30 hover:-translate-y-1 flex flex-col h-full">
        {/* Image */}
        <div className="relative overflow-hidden bg-gray-100 aspect-square">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount && <Badge variant="red">-{discount}%</Badge>}
            {product.isNew && <Badge variant="green">Nouveau</Badge>}
            {product.featured && !product.isNew && <Badge variant="yellow">⭐ Vedette</Badge>}
          </div>
          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            aria-label="Ajouter aux favoris"
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white hover:text-red-500 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          {/* Out of stock */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">Rupture de stock</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs text-gray-500 truncate">{product.vendor.name}</span>
            {product.vendor.verified && (
              <svg className="w-3 h-3 text-[#00A550] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
            )}
          </div>

          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1 mb-2 group-hover:text-[#00A550] transition-colors">
            {product.name}
          </h3>

          <StarRating rating={product.rating} count={product.reviewCount} />

          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="font-bold text-[#00A550] text-base">{formatXAF(product.price)}</p>
              {product.originalPrice && (
                <p className="text-xs text-gray-400 line-through">{formatXAF(product.originalPrice)}</p>
              )}
              {product.unit && <p className="text-xs text-gray-400">/{product.unit}</p>}
            </div>
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="bg-[#00A550] hover:bg-[#007A3D] disabled:opacity-50 disabled:cursor-not-allowed text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1 mt-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-xs text-gray-400">{product.city}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
