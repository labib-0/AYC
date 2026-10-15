import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("================================================================================");
console.log("TEST SUITE: FEATURED PRODUCTS METRIC TILE & STOREFRONT PRIORITY");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ Passed: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// Read relevant component and service files
const productSummaryMetricsTsx = fs.readFileSync(
  path.join(rootDir, "src/components/admin/products/ProductSummaryMetrics.tsx"),
  "utf8"
);
const adminProductsPageTsx = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/products/page.tsx"),
  "utf8"
);
const productTableTsx = fs.readFileSync(
  path.join(rootDir, "src/components/admin/products/ProductTable.tsx"),
  "utf8"
);
const productTableRowTsx = fs.readFileSync(
  path.join(rootDir, "src/components/admin/products/ProductTableRow.tsx"),
  "utf8"
);
const productServiceTs = fs.readFileSync(
  path.join(rootDir, "src/services/product.service.ts"),
  "utf8"
);
const productsLibTs = fs.readFileSync(
  path.join(rootDir, "src/lib/services/products.ts"),
  "utf8"
);
const productControllerPhp = fs.readFileSync(
  path.join(rootDir, "backend/app/Http/Controllers/Api/V1/ProductController.php"),
  "utf8"
);
const metricsServicePhp = fs.readFileSync(
  path.join(rootDir, "backend/app/Services/Catalog/AdminProductMetricsService.php"),
  "utf8"
);

// ─────────────────────────────────────────────────────────────────────────────
// [GROUP 1]: ADMIN FEATURED SUMMARY TILE & RESPONSIVE GRID
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[GROUP 1]: ADMIN FEATURED SUMMARY TILE & RESPONSIVE GRID");

runTest("1. ProductSummaryMetrics contains dedicated Featured tile with Star icon", () => {
  assert.ok(
    productSummaryMetricsTsx.includes('id="card-metric-featured"'),
    "ProductSummaryMetrics must render element with id='card-metric-featured'"
  );
  assert.ok(
    productSummaryMetricsTsx.includes('data-metric="featured"'),
    "ProductSummaryMetrics must include data-metric='featured'"
  );
  assert.ok(
    productSummaryMetricsTsx.includes("<Star"),
    "Featured tile must use Star icon"
  );
});

runTest("2. Featured tile accepts and displays accurate featured count", () => {
  assert.ok(
    productSummaryMetricsTsx.includes("featured = 0"),
    "ProductSummaryMetrics must accept featured count with 0 fallback"
  );
  assert.ok(
    productSummaryMetricsTsx.includes("{featured.toLocaleString()}"),
    "Featured tile must format count using toLocaleString()"
  );
});

runTest("3. Grid layout accommodates 6 tiles without horizontal overflow", () => {
  assert.ok(
    productSummaryMetricsTsx.includes("grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"),
    "Grid must use responsive 6-col configuration on large screens"
  );
});

runTest("4. Featured tile is interactive and toggles featured filter", () => {
  assert.ok(
    productSummaryMetricsTsx.includes("onStatusClick?.(isFeaturedActive ? \"all\" : \"featured\")"),
    "Clicking Featured tile must toggle between 'featured' and 'all'"
  );
  assert.ok(
    productSummaryMetricsTsx.includes("aria-pressed={isFeaturedActive}"),
    "Featured tile must reflect aria-pressed state"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// [GROUP 2]: ADMIN PRODUCTS PAGE INTEGRATION & AUTHORITATIVE METRICS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[GROUP 2]: ADMIN PRODUCTS PAGE INTEGRATION & AUTHORITATIVE METRICS");

runTest("5. Admin Products page tracks and passes featured metric", () => {
  assert.ok(
    adminProductsPageTsx.includes("featured: 0"),
    "globalMetrics state must initialize featured: 0"
  );
  assert.ok(
    adminProductsPageTsx.includes("featured={globalMetrics.featured}"),
    "Admin Products page must pass featured count to ProductSummaryMetrics"
  );
});

runTest("6. loadGlobalMetrics populates featured count from getProductStatistics", () => {
  assert.ok(
    adminProductsPageTsx.includes("featured: stats.featured"),
    "loadGlobalMetrics must read stats.featured"
  );
});

runTest("7. Backend AdminProductMetricsService calculates unexpired non-deleted featured products", () => {
  assert.ok(
    metricsServicePhp.includes("Product::where('is_featured', true)"),
    "AdminProductMetricsService must query products where is_featured is true"
  );
  assert.ok(
    metricsServicePhp.includes("whereNull('featured_until')->orWhere('featured_until', '>', now())"),
    "AdminProductMetricsService must enforce unexpired featured_until"
  );
  assert.ok(
    metricsServicePhp.includes("whereNull('deleted_at')"),
    "AdminProductMetricsService must exclude soft-deleted products"
  );
  assert.ok(
    metricsServicePhp.includes("'featured_products' => $featuredProducts"),
    "AdminProductMetricsService must return featured_products"
  );
});

runTest("8. ProductController statistics endpoint exposes featured count", () => {
  assert.ok(
    productControllerPhp.includes("'featured' => $metrics['featured_products']"),
    "ProductController statistics endpoint must expose featured count"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// [GROUP 3]: IN-TABLE FEATURE & UNFEATURE ROW ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[GROUP 3]: IN-TABLE FEATURE & UNFEATURE ROW ACTIONS");

runTest("9. ProductTable and ProductTableRow accept onToggleFeatured handler", () => {
  assert.ok(
    productTableTsx.includes("onToggleFeatured?: (product: B2BProductInput) => void;"),
    "ProductTableProps must declare onToggleFeatured"
  );
  assert.ok(
    productTableRowTsx.includes("onToggleFeatured?: (product: B2BProductInput) => void;"),
    "ProductTableRowProps must declare onToggleFeatured"
  );
});

runTest("10. ProductTableRow action menu includes Feature / Unfeature action", () => {
  assert.ok(
    productTableRowTsx.includes('id={`btn-toggle-featured-${product.id}`}'),
    "Row actions menu must include toggle featured button with unique ID"
  );
  assert.ok(
    productTableRowTsx.includes('product.isFeatured ? "Unfeature Product" : "Feature Product"'),
    "Button label must switch between 'Unfeature Product' and 'Feature Product'"
  );
});

runTest("11. productService exports toggleProductFeatured calling updateProduct", () => {
  assert.ok(
    productServiceTs.includes("export const toggleProductFeatured ="),
    "product.service.ts must export toggleProductFeatured"
  );
  assert.ok(
    productServiceTs.includes("productService.updateProduct(id, { isFeatured, is_featured: isFeatured })"),
    "toggleProductFeatured must call updateProduct with isFeatured and is_featured"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// [GROUP 4]: STOREFRONT ORDERING — PINNED FIRST, NEWEST SECOND, ZERO DUPLICATES
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[GROUP 4]: STOREFRONT ORDERING PRIORITY & INTEGRITY");

runTest("12. Backend ProductController@featured queries pinned products in sort_order ASC", () => {
  assert.ok(
    productControllerPhp.includes("orderBy('sort_order', 'asc')"),
    "Pinned query must sort by sort_order ASC"
  );
  assert.ok(
    productControllerPhp.includes("HomepageFeaturedProduct::query()"),
    "Backend must query HomepageFeaturedProduct for pinned items"
  );
});

runTest("13. Backend ProductController@featured excludes pinned IDs from remaining eligible products", () => {
  assert.ok(
    productControllerPhp.includes("whereNotIn('id', $pinnedIds)"),
    "Remaining query must exclude pinned IDs to prevent duplicates"
  );
  assert.ok(
    productControllerPhp.includes("orderBy('created_at', 'desc')"),
    "Remaining query must sort by created_at DESC"
  );
  assert.ok(
    productControllerPhp.includes("array_merge($pinnedIds, $remainingIds)"),
    "Combined ordered list must merge pinned then remaining"
  );
});

runTest("14. Frontend getFeaturedProducts fallback enforces Priority 1 + Priority 2 deduplication", () => {
  assert.ok(
    productsLibTs.includes("const pinnedIds = new Set(pinned.map((p) => String(p.id)));"),
    "Fallback must track pinned IDs in a set"
  );
  assert.ok(
    productsLibTs.includes("allFiltered.filter((p) => !pinnedIds.has(String(p.id)));"),
    "Fallback must filter out pinned IDs from remaining products"
  );
  assert.ok(
    productsLibTs.includes("orderedProducts = [...pinned, ...remaining];"),
    "Fallback must concatenate pinned then remaining"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// [GROUP 5]: STOREFRONT VISIBILITY & SOLD OUT SAFEGUARDS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[GROUP 5]: STOREFRONT VISIBILITY & SOLD OUT SAFEGUARDS");

runTest("15. Draft, hidden, and soft-deleted products excluded from storefront", () => {
  assert.ok(
    productControllerPhp.includes("$q->storefrontVisible()->whereNull('deleted_at');"),
    "Featured endpoint must apply storefrontVisible and whereNull('deleted_at')"
  );
});

runTest("16. Sold out products display indicator and are prevented from quick-add purchase", () => {
  const productCardTsx = fs.readFileSync(
    path.join(rootDir, "src/components/product/ProductCard.tsx"),
    "utf8"
  );
  assert.ok(
    productCardTsx.includes("isSoldOut ? \"opacity-80 grayscale-[0.35]\" : \"\""),
    "Sold out products must apply subdued styling"
  );
  assert.ok(
    productCardTsx.includes("disabled={isSoldOut || isOutOfStock}"),
    "Quick-add button must be disabled for sold out products"
  );
  assert.ok(
    productCardTsx.includes("Sold out - unavailable for purchase"),
    "Quick-add button must announce sold out state to accessibility tree"
  );
});

runTest("17. ProductPromotionBadges preserves all promotional tags (SOLD OUT, PRE-ORDER, NEW, HOT)", () => {
  const promoBadgesTsx = fs.readFileSync(
    path.join(rootDir, "src/components/common/ProductPromotionBadges.tsx"),
    "utf8"
  );
  assert.ok(promoBadgesTsx.includes('SOLD OUT'), "Must render SOLD OUT badge");
  assert.ok(promoBadgesTsx.includes('PRE-ORDER'), "Must render PRE-ORDER badge");
  assert.ok(promoBadgesTsx.includes('NEW'), "Must render NEW badge");
  assert.ok(promoBadgesTsx.includes('HOT'), "Must render HOT badge");
});

// ─────────────────────────────────────────────────────────────────────────────
// PURE FUNCTIONAL SIMULATION TEST: Ordering with Pinned, Latest, & Deduplication
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[GROUP 6]: PURE FUNCTIONAL SIMULATION — ORDERING & DEDUPLICATION");

interface TestItem {
  id: string;
  name: string;
  isFeatured: boolean;
  featuredSortOrder?: number;
  featuredUntil?: string | null;
  createdAt: string;
  status: string;
}

function simulateStorefrontFeaturedOrder(items: TestItem[], limit: number = 21): TestItem[] {
  const now = Date.now();
  // Storefront eligibility rule
  const eligible = items.filter((p) => p.status === "published");

  // Priority 1: Pinned
  const pinned = eligible
    .filter((p) => {
      const expired = p.featuredUntil ? new Date(p.featuredUntil).getTime() <= now : false;
      return p.isFeatured && !expired;
    })
    .sort((a, b) => (a.featuredSortOrder ?? 999) - (b.featuredSortOrder ?? 999));

  // Priority 2: Remaining (Deduplicated)
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const remaining = eligible
    .filter((p) => !pinnedIds.has(p.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return [...pinned, ...remaining].slice(0, limit);
}

runTest("18. Simulation: Pinned products in exact administrative order precede newest products", () => {
  const mockCatalog: TestItem[] = [
    { id: "1", name: "Product A", isFeatured: false, createdAt: "2026-10-01T00:00:00Z", status: "published" },
    { id: "2", name: "Product B (Pinned #2)", isFeatured: true, featuredSortOrder: 2, createdAt: "2026-09-01T00:00:00Z", status: "published" },
    { id: "3", name: "Product C (Pinned #1)", isFeatured: true, featuredSortOrder: 1, createdAt: "2026-08-01T00:00:00Z", status: "published" },
    { id: "4", name: "Product D (Newest)", isFeatured: false, createdAt: "2026-10-15T00:00:00Z", status: "published" },
    { id: "5", name: "Product E (Draft)", isFeatured: true, featuredSortOrder: 0, createdAt: "2026-10-14T00:00:00Z", status: "draft" },
  ];

  const result = simulateStorefrontFeaturedOrder(mockCatalog, 10);

  // Draft product E must NOT appear
  assert.ok(!result.some((p) => p.id === "5"), "Draft products must be excluded");

  // Pinned products must appear first in sort order (Product C #1, Product B #2)
  assert.strictEqual(result[0].id, "3", "Position 0 must be Pinned #1 (Product C)");
  assert.strictEqual(result[1].id, "2", "Position 1 must be Pinned #2 (Product B)");

  // Remaining products must follow in newest order (Product D Oct 15, Product A Oct 1)
  assert.strictEqual(result[2].id, "4", "Position 2 must be Newest remaining (Product D)");
  assert.strictEqual(result[3].id, "1", "Position 3 must be older remaining (Product A)");

  // Zero duplicates
  const ids = result.map((p) => p.id);
  assert.strictEqual(new Set(ids).size, ids.length, "Result must contain zero duplicate IDs");
});

runTest("19. Simulation: Expired pinned products gracefully fall back to latest eligible tier", () => {
  const mockCatalog: TestItem[] = [
    {
      id: "10",
      name: "Product Expired Pin",
      isFeatured: true,
      featuredSortOrder: 0,
      featuredUntil: "2026-01-01T00:00:00Z", // Expired
      createdAt: "2026-10-10T00:00:00Z",
      status: "published",
    },
    {
      id: "20",
      name: "Product Active Pin",
      isFeatured: true,
      featuredSortOrder: 1,
      featuredUntil: "2026-12-31T00:00:00Z", // Active
      createdAt: "2026-05-01T00:00:00Z",
      status: "published",
    },
    {
      id: "30",
      name: "Product Recent Upload",
      isFeatured: false,
      createdAt: "2026-10-12T00:00:00Z",
      status: "published",
    },
  ];

  const result = simulateStorefrontFeaturedOrder(mockCatalog, 10);

  // Position 0 must be Active Pin (Product 20)
  assert.strictEqual(result[0].id, "20", "Active pin must be position 0");

  // Expired pin (Product 10) must not be pinned first, but appears in remaining based on Oct 10 timestamp
  assert.strictEqual(result[1].id, "30", "Product 30 (Oct 12) is newer than Product 10 (Oct 10)");
  assert.strictEqual(result[2].id, "10", "Product 10 appears as remaining eligible item");
});

runTest("20. Simulation: Zero pinned products renders newest eligible products without empty state", () => {
  const mockCatalog: TestItem[] = [
    { id: "1", name: "Product A", isFeatured: false, createdAt: "2026-09-01T00:00:00Z", status: "published" },
    { id: "2", name: "Product B", isFeatured: false, createdAt: "2026-10-01T00:00:00Z", status: "published" },
  ];

  const result = simulateStorefrontFeaturedOrder(mockCatalog, 10);
  assert.strictEqual(result.length, 2, "Must return 2 products");
  assert.strictEqual(result[0].id, "2", "Newer product B must appear first");
  assert.strictEqual(result[1].id, "1", "Older product A must appear second");
});

console.log("\n================================================================================");
console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
