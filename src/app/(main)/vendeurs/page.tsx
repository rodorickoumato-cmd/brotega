import { vendors } from "@/data/vendors";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function VendeursPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 mb-2">Tous les Vendeurs</h1>
        <p className="text-gray-500">Découvrez les boutiques de confiance sur Brotega</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {["Tous", "Vérifiés", "Alimentation", "Mode", "Électronique", "Beauté", "Artisanat"].map((f) => (
          <button
            key={f}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${f === "Tous" ? "bg-[#E63946] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-[#E63946] hover:text-[#E63946]"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {vendors.map((vendor) => (
          <Link key={vendor.id} href={`/vendeur/${vendor.slug}`}>
            <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 hover:border-[#E63946]/30">
              {/* Cover gradient */}
              <div className="h-24 bg-gradient-to-br from-[#E63946] to-[#C1121F] relative">
                <div className="absolute inset-0 opacity-20 text-8xl flex items-center justify-end pr-4">🏪</div>
              </div>
              <div className="px-5 pb-5">
                {/* Logo */}
                <div className="flex items-end gap-3 -mt-8 mb-3">
                  <img
                    src={vendor.logo}
                    alt={vendor.name}
                    className="w-16 h-16 rounded-2xl border-4 border-white shadow-md"
                  />
                  <div className="pb-1">
                    {vendor.verified && <Badge variant="green">✓ Vérifié</Badge>}
                  </div>
                </div>

                <h3 className="font-bold text-gray-800 text-lg leading-tight">{vendor.name}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{vendor.description}</p>

                <div className="flex items-center gap-1 mt-2">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="text-xs text-gray-500">{vendor.city}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {vendor.categories.slice(0, 2).map((c) => (
                    <span key={c} className="text-xs bg-[#FEF2F2] text-[#E63946] px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <StarRating rating={vendor.rating} count={vendor.reviewCount} />
                  <span className="text-xs text-gray-500 font-medium">{vendor.productCount} produits</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA Become vendor */}
      <div className="mt-12 bg-gradient-to-br from-[#E63946] to-[#C1121F] rounded-3xl p-8 text-white text-center">
        <h2 className="text-2xl font-black mb-2">Rejoignez nos vendeurs</h2>
        <p className="text-white/80 mb-6 max-w-md mx-auto">
          Créez votre boutique gratuitement et commencez à vendre dans tout le Gabon dès aujourd'hui.
        </p>
        <Link href="/vendor/register" className="inline-flex items-center gap-2 bg-[#FFD100] hover:bg-[#E6BC00] text-[#1A202C] font-bold px-8 py-3 rounded-xl transition-colors">
          🏪 Créer ma boutique
        </Link>
      </div>
    </div>
  );
}
