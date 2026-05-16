import Link from "next/link";
import { categories } from "@/data/categories";

export function CategoriesSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Catégories</h2>
          <p className="text-gray-500 text-sm mt-0.5">Explorez nos {categories.length} catégories</p>
        </div>
        <Link href="/catalogue" className="text-[#E63946] text-sm font-semibold hover:underline">
          Voir tout →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalogue?categorie=${cat.slug}`}
            className="group bg-white rounded-2xl p-4 text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-gray-100 hover:border-opacity-50"
            style={{ ["--hover-color" as string]: cat.color }}
          >
            <div
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform"
              style={{ backgroundColor: cat.color + "20" }}
            >
              {cat.icon}
            </div>
            <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">{cat.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cat.productCount} produits</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
