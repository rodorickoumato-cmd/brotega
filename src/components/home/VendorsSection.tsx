import Link from "next/link";
import { vendors } from "@/data/vendors";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";

export function VendorsSection() {
  return (
    <section className="bg-[#F7F8FA] py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800">Vendeurs Top</h2>
            <p className="text-gray-500 text-sm mt-0.5">Les boutiques les mieux notées</p>
          </div>
          <Link href="/vendeurs" className="text-[#00A550] text-sm font-semibold hover:underline">
            Tous les vendeurs →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.slice(0, 6).map((vendor) => (
            <Link key={vendor.id} href={`/vendeur/${vendor.slug}`}>
              <div className="bg-white rounded-2xl p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border border-gray-100 flex items-center gap-4">
                <img
                  src={vendor.logo}
                  alt={vendor.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{vendor.name}</h3>
                    {vendor.verified && <Badge variant="green">✓ Vérifié</Badge>}
                  </div>
                  <StarRating rating={vendor.rating} count={vendor.reviewCount} />
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500">📦 {vendor.productCount} produits</span>
                    <span className="text-xs text-gray-500">📍 {vendor.city}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
