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
      {/* Product image placeholder — Canonical 4:5 */}
      <div className="aspect-[4/5] bg-secondary/60" />

      {/* Card body */}
      <div className="p-3 space-y-2.5">
        {/* Brand name */}
        <div className="h-2.5 bg-secondary/60 rounded-full w-1/3" />
        {/* Product name */}
        <div className="h-3.5 bg-secondary/60 rounded-full w-4/5" />
        <div className="h-3.5 bg-secondary/60 rounded-full w-3/5" />
        {/* Price */}
        <div className="h-4 bg-secondary/70 rounded-full w-2/5 mt-1" />
        {/* MOQ badge */}
        <div className="h-2.5 bg-secondary/50 rounded-full w-1/4" />
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
