import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function CatalogueLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="h-4 w-16 skeleton rounded-full" />
        <div className="h-4 w-4 skeleton rounded-full" />
        <div className="h-4 w-24 skeleton rounded-full" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar skeleton */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl p-5 space-y-4 border border-gray-100">
            <div className="h-5 skeleton rounded-full w-1/3" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 skeleton rounded-xl" />
            ))}
          </div>
        </aside>

        {/* Grille produits skeleton */}
        <div className="flex-1">
          <div className="h-12 skeleton rounded-2xl mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
