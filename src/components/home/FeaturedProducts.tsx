import { getFeaturedProducts } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import Link from "next/link";

export function FeaturedProducts() {
  const products = getFeaturedProducts();
  return (
    <section className="bg-white py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800">Produits Vedettes</h2>
            <p className="text-gray-500 text-sm mt-0.5">Sélection de la semaine</p>
          </div>
          <Link href="/catalogue" className="text-[#E63946] text-sm font-semibold hover:underline">
            Voir tout →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
