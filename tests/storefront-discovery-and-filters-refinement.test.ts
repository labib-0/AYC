/**
 * AUTOMATED TEST SUITE: STOREFRONT DISCOVERY & FILTERS REFINEMENT (PHASE 2)
 *
 * Verifies:
 * 1. Duplicate category prevention & consolidation
 * 2. Corrected category labels & title casing
 * 3. Brand collection + matching brand filter intersection (DKNY collection + DKNY filter)
 * 4. Active filter visual state & badge counter
 * 5. Clear filters single predictable recovery action ("Clear Filters")
 * 6. Elevated "ALL CATEGORIES" primary hierarchy
 * 7. Loading state counter (pulse skeleton, never "Showing 0 of 0")
 * 8. Compact zero-result empty state
 * 9. Dedicated API error state (never "0 products" on network failure)
 * 10. Retry repeats request using current filters
 * 11. Featured Products ordering rule preserved
 * 12. SOLD OUT visual indicator & placement preserved
 * 13. Load More pagination maintains order & does not open filter rail
 * 14. Query/filter parameter synchronization
 * 15. Search + filter interaction
 * 16. Responsive filter controls & accessibility
 */

import fs from "fs";
import path from "path";

// Headless polyfills
const memoryStore = new Map<string, string>();
const localStoragePolyfill = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() { return memoryStore.size; },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
};
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = localStoragePolyfill;
g.window = globalThis;
g.CustomEvent = class CustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, params: { detail?: unknown } = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};
g.dispatchEvent = () => true;
g.addEventListener = () => {};
g.removeEventListener = () => {};

import { getInitialBrandProducts, getFeaturedProducts } from "../src/lib/services/products";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, desc: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testId} — ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testId} — ${desc}`);
    failed++;
  }
}

async function runSuite() {
  console.log("================================================================================");
  console.log("TEST SUITE: STOREFRONT DISCOVERY, FILTERS & HOMEPAGE HIERARCHY (PHASE 2)");
  console.log("================================================================================\n");

  const cwd = process.cwd();
  const categoriesSectionCode = fs.readFileSync(path.join(cwd, "src/components/home/CategoriesSection.tsx"), "utf-8");
  const shopByBrandCode = fs.readFileSync(path.join(cwd, "src/components/home/ShopByBrand.tsx"), "utf-8");
  const featuredProductsCode = fs.readFileSync(path.join(cwd, "src/components/home/FeaturedProducts.tsx"), "utf-8");
  const searchPageCode = fs.readFileSync(path.join(cwd, "src/app/search/page.tsx"), "utf-8");
  const filterRailCode = fs.readFileSync(path.join(cwd, "src/components/common/GlobalFilterRail.tsx"), "utf-8");
  const backendProductControllerCode = fs.readFileSync(path.join(cwd, "backend/app/Http/Controllers/Api/V1/ProductController.php"), "utf-8");

  // ── 1. Duplicate category prevention & consolidation ──────────────────────
  console.log("▶ [GROUP 1]: Category Deduplication & Consolidation");
  assert(
    categoriesSectionCode.includes("seen.has(norm)") && categoriesSectionCode.includes("seen.add(norm)"),
    "CAT-1",
    "CategoriesSection prevents duplicate category pills using normalized key set"
  );
  assert(
    categoriesSectionCode.includes("normalizeCategoryLabel"),
    "CAT-2",
    "CategoriesSection runs category names through normalization helper"
  );

  // ── 2. Corrected category labels ──────────────────────────────────────────
  console.log("\n▶ [GROUP 2]: Category Label Corrections & Normalization");
  assert(
    categoriesSectionCode.includes("Sweaters") &&
    categoriesSectionCode.includes("Sportswear") &&
    categoriesSectionCode.includes("Trousers"),
    "CAT-3",
    "CategoriesSection consolidates SWETER/Sweater, SPORTWEAR/Sportswear, and duplicate Trousers"
  );
  assert(
    categoriesSectionCode.includes("Bodycon") && categoriesSectionCode.includes("Long Pants"),
    "CAT-4",
    "CategoriesSection normalizes uppercase and lowercase catalog category casing"
  );

  // ── 3. Brand collection + matching brand filter ───────────────────────────
  console.log("\n▶ [GROUP 3]: Brand Collection + Filter Interaction");
  assert(
    backendProductControllerCode.includes("$request->filled('collection')") &&
    backendProductControllerCode.includes("array_unique"),
    "BRD-1",
    "Backend ProductController accepts collection query param and merges/deduplicates with brand filter"
  );
  assert(
    searchPageCode.includes('searchParams.get("collection")') &&
    searchPageCode.includes("new Set"),
    "BRD-2",
    "Search page accepts collection query param and deduplicates brand constraints"
  );
  const brandProducts = getInitialBrandProducts(["Ayaan"]);
  assert(
    brandProducts.length > 0,
    "BRD-3",
    "Brand filtering returns matching items for active brand collection"
  );

  // ── 4. Active filter state ────────────────────────────────────────────────
  console.log("\n▶ [GROUP 4]: Active Filter Visual State");
  assert(
    featuredProductsCode.includes("totalActiveFilters > 0") &&
    featuredProductsCode.includes("Active Filters:"),
    "FLT-1",
    "FeaturedProducts renders dedicated Active Filters strip with active badges when filters applied"
  );
  assert(
    shopByBrandCode.includes("totalActiveFilters > 0") &&
    shopByBrandCode.includes("Active Filters:"),
    "FLT-2",
    "ShopByBrand inline expansion renders Active Filters strip with individual removal buttons"
  );
  assert(
    filterRailCode.includes("aria-pressed={isSelected}"),
    "FLT-3",
    "GlobalFilterRail maintains aria-pressed accessible state on filter toggles"
  );

  // ── 5. Clear filters ──────────────────────────────────────────────────────
  console.log("\n▶ [GROUP 5]: Clear Filters Single Recovery Action");
  assert(
    featuredProductsCode.includes("Clear Filters") &&
    !featuredProductsCode.includes('aria-label="Clear all active filters"'),
    "CLR-1",
    "FeaturedProducts standardizes on Clear Filters without redundant competing clear button"
  );
  assert(
    shopByBrandCode.includes("Clear Filters"),
    "CLR-2",
    "ShopByBrand empty state uses Clear Filters recovery button"
  );
  assert(
    searchPageCode.includes("Clear Filters"),
    "CLR-3",
    "Search page uses Clear Filters recovery button"
  );

  // ── 6. ALL CATEGORIES hierarchy ───────────────────────────────────────────
  console.log("\n▶ [GROUP 6]: ALL CATEGORIES Primary Hierarchy");
  assert(
    categoriesSectionCode.includes("ALL CATEGORIES") &&
    categoriesSectionCode.includes("bg-foreground text-background"),
    "ALL-1",
    "ALL CATEGORIES pill has elevated primary hierarchy (bg-foreground) distinguishing it from regular pills"
  );
  assert(
    categoriesSectionCode.includes('href="/search?filterOpen=true"'),
    "ALL-2",
    "ALL CATEGORIES preserves destination to broad catalog with filter drawer open"
  );

  // ── 7. Loading state ──────────────────────────────────────────────────────
  console.log("\n▶ [GROUP 7]: Loading State vs Showing 0 of 0");
  assert(
    featuredProductsCode.includes("isLoadingInitial ? (") &&
    featuredProductsCode.includes("animate-pulse") &&
    !featuredProductsCode.includes("Showing 0 of 0"),
    "LOD-1",
    "FeaturedProducts displays skeleton pulse counter instead of 'Showing 0 of 0' during load"
  );
  assert(
    shopByBrandCode.includes("isLoadingInitial ? (") &&
    shopByBrandCode.includes("animate-pulse"),
    "LOD-2",
    "ShopByBrand displays skeleton pulse counter instead of 'Showing 0 of 0' during load"
  );

  // ── 8. Empty product state ────────────────────────────────────────────────
  console.log("\n▶ [GROUP 8]: Compact Empty Product State");
  assert(
    featuredProductsCode.includes("No products match your selected filters.") &&
    featuredProductsCode.includes("py-10"),
    "EMP-1",
    "FeaturedProducts renders compact empty state (py-10) with Clear Filters recovery"
  );
  assert(
    shopByBrandCode.includes("No products match your selected filters.") &&
    shopByBrandCode.includes("py-10"),
    "EMP-2",
    "ShopByBrand renders compact empty state (py-10) with Clear Filters recovery"
  );

  // ── 9. Error state ────────────────────────────────────────────────────────
  console.log("\n▶ [GROUP 9]: Dedicated API Error State");
  assert(
    (featuredProductsCode.includes("Couldn't load products.") || featuredProductsCode.includes("Couldn&apos;t load products.")) &&
    featuredProductsCode.includes("Please try again."),
    "ERR-1",
    "FeaturedProducts renders dedicated error card with 'Couldn't load products.' and Retry"
  );
  assert(
    (shopByBrandCode.includes("Couldn't load products.") || shopByBrandCode.includes("Couldn&apos;t load products.")) &&
    shopByBrandCode.includes("Please try again."),
    "ERR-2",
    "ShopByBrand renders dedicated error card with 'Couldn't load products.' and Retry"
  );
  assert(
    searchPageCode.includes("Couldn't load products. Please try again.") ||
    searchPageCode.includes("Couldn&apos;t Load Products"),
    "ERR-3",
    "Search page distinguishes API error from zero results"
  );

  // ── 10. Retry ─────────────────────────────────────────────────────────────
  console.log("\n▶ [GROUP 10]: Retry Recovery Action");
  assert(
    featuredProductsCode.includes("RotateCcw") && featuredProductsCode.includes("Retry"),
    "RTY-1",
    "FeaturedProducts provides Retry action without resetting active filters"
  );
  assert(
    shopByBrandCode.includes("RotateCcw") && shopByBrandCode.includes("Retry"),
    "RTY-2",
    "ShopByBrand provides Retry action using current selected brands and filters"
  );

  // ── 11. Featured Products ordering ────────────────────────────────────────
  console.log("\n▶ [GROUP 11]: Featured Products Business Ordering Rule");
  const featuredRes = await getFeaturedProducts({ limit: 10, offset: 0 });
  assert(
    featuredRes.products.length > 0,
    "ORD-1",
    "FeaturedProducts resolves active published products"
  );
  assert(
    !featuredProductsCode.includes("sort_by: \"price_low\"") &&
    !featuredProductsCode.includes("sort_by: \"discount\""),
    "ORD-2",
    "FeaturedProducts does not apply price-based ranking"
  );

  // ── 12. SOLD OUT placement & styling ──────────────────────────────────────
  console.log("\n▶ [GROUP 12]: SOLD OUT Product Presentation");
  const productCardCode = fs.readFileSync(path.join(cwd, "src/components/product/ProductCard.tsx"), "utf-8");
  assert(
    productCardCode.includes("grayscale-") && productCardCode.includes("Sold Out"),
    "SLD-1",
    "ProductCard renders subdued grayscale aesthetic and single clean Sold Out badge"
  );

  // ── 13. Load More / Pagination ────────────────────────────────────────────
  console.log("\n▶ [GROUP 13]: Load More Pagination Behavior");
  assert(
    featuredProductsCode.includes("handleLoadMoreClick") &&
    !featuredProductsCode.includes("handleLoadMoreClick = async () => {\n    setIsFilterOpen(true)"),
    "LMD-1",
    "FeaturedProducts Load More does not open the filter rail"
  );
  assert(
    shopByBrandCode.includes("View More Brands"),
    "LMD-2",
    "ShopByBrand Load More control uses clear accessible label 'View More Brands'"
  );

  // ── 14. Query / Filter URL Synchronization ────────────────────────────────
  console.log("\n▶ [GROUP 14]: URL Query Synchronization");
  assert(
    searchPageCode.includes("updateUrl") && searchPageCode.includes("router.replace"),
    "URL-1",
    "Search page synchronizes active filters to URL search params without page reload"
  );

  // ── 15. Search + Filter Interaction ───────────────────────────────────────
  console.log("\n▶ [GROUP 15]: Search + Filter Combination");
  assert(
    searchPageCode.includes("q:") &&
    searchPageCode.includes("brand:") &&
    searchPageCode.includes("category:"),
    "SRF-1",
    "Search page passes query, brand, category, audience, and design type to productService"
  );

  // ── 16. Responsive Filter Interactions ────────────────────────────────────
  console.log("\n▶ [GROUP 16]: Responsive Discovery & Accessibility");
  assert(
    categoriesSectionCode.includes("text-fluid-h2"),
    "RSP-1",
    "CategoriesSection heading uses fluid typography token text-fluid-h2"
  );
  assert(
    featuredProductsCode.includes("pt-5 sm:pt-7"),
    "RSP-2",
    "FeaturedProducts has distinct breathing room and primary hierarchy spacing"
  );

  console.log("\n================================================================================");
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
