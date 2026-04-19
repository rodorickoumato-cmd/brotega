import { SkeletonVendorCard } from "@/components/ui/SkeletonCard";

export default function VendeursLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 skeleton rounded-xl w-64 mb-2" />
        <div className="h-4 skeleton rounded-full w-80" />
      </div>
      <div className="flex gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 skeleton rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonVendorCard key={i} />
        ))}
      </div>
    </div>
  );
}
