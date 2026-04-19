import Link from "next/link";
import { getFeaturedProducts } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";

export default function FavorisPage() {
  const mockFavorites = getFeaturedProducts().slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compte" className="text-gray-400 hover:text-[#00A550] transition-colors">
          ← Mon compte
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-black text-gray-800">Mes favoris</h1>
      </div>

      {mockFavorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mockFavorites.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3">❤️</div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">Aucun favori</h2>
          <p className="text-gray-500 text-sm mb-5">Ajoutez des produits à vos favoris pour les retrouver ici.</p>
          <Link href="/catalogue" className="bg-[#00A550] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#007A3D] transition-colors inline-block">
            Découvrir des produits
          </Link>
        </div>
      )}
    </div>
  );
}
