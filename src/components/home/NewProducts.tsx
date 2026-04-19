import { getNewProducts } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import Link from "next/link";

export function NewProducts() {
  const products = getNewProducts();
  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Nouveautés</h2>
          <p className="text-gray-500 text-sm mt-0.5">Les derniers ajouts sur Brotega</p>
        </div>
        <Link href="/catalogue?nouveau=1" className="text-[#00A550] text-sm font-semibold hover:underline">
          Voir tout →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
