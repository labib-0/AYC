/**
 * ProductCardSkeleton
 * Placeholder shimmer card shown while the next page of infinite-scroll
 * results is being fetched from the server.
 *
 * Matches the visual dimensions of ProductCard so the grid never jumps.
 */
export function ProductCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border/50 bg-card overflow-hidden animate-pulse"
      aria-hidden="true"
    >
      {/* Product image placeholder — Canonical 3:4 */}
      <div className="aspect-[3/4] bg-secondary/60" />

      {/* Card body — Compact dimensions matching restored ProductCard typography */}
      <div className="px-2.5 sm:px-3 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5 space-y-2">
        {/* Product name: 2 lines normalized at 13px */}
        <div className="h-3.5 bg-secondary/60 rounded-full w-4/5" />
        <div className="h-3.5 bg-secondary/60 rounded-full w-3/5" />
        {/* Price & / PC row at 17-18px */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="h-4 bg-secondary/70 rounded-full w-2/5" />
          <div className="h-3 bg-secondary/50 rounded-full w-1/5" />
        </div>
        {/* MOQ badge at 13px */}
        <div className="h-3 bg-secondary/50 rounded-full w-1/4" />
      </div>
    </div>
  );
}

/** A row of N skeleton cards matching the search-page grid column count */
export function ProductSkeletonRow({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}
