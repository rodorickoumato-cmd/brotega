export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2.5">
        <div className="h-2.5 skeleton rounded-full w-1/2" />
        <div className="h-3.5 skeleton rounded-full" />
        <div className="h-3.5 skeleton rounded-full w-4/5" />
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-3 h-3 skeleton rounded-full" />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 skeleton rounded-full w-1/3" />
          <div className="w-9 h-9 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonProductPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-2 mb-6">
        <div className="h-4 w-16 skeleton rounded-full" />
        <div className="h-4 w-4 skeleton rounded-full" />
        <div className="h-4 w-24 skeleton rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square skeleton rounded-3xl" />
        <div className="space-y-4">
          <div className="h-8 skeleton rounded-xl w-3/4" />
          <div className="h-6 skeleton rounded-xl w-1/2" />
          <div className="h-20 skeleton rounded-2xl" />
          <div className="h-4 skeleton rounded-full" />
          <div className="h-4 skeleton rounded-full w-5/6" />
          <div className="h-12 skeleton rounded-xl mt-4" />
          <div className="h-12 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonVendorCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="h-24 skeleton" />
      <div className="px-5 pb-5">
        <div className="flex items-end gap-3 -mt-8 mb-3">
          <div className="w-16 h-16 skeleton rounded-2xl border-4 border-white" />
        </div>
        <div className="space-y-2">
          <div className="h-5 skeleton rounded-full w-2/3" />
          <div className="h-3.5 skeleton rounded-full" />
          <div className="h-3.5 skeleton rounded-full w-4/5" />
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <div className="h-4 skeleton rounded-full w-1/3" />
          <div className="h-4 skeleton rounded-full w-1/4 ml-auto" />
        </div>
      </div>
    </div>
  );
}
