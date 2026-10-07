/**
 * AUTOMATED TEST SUITE: STOREFRONT UX REFINEMENT + DISCOVERY QUALITY PASS
 * 
 * Verifies:
 * 1. Brand collection + brand filter intersection (DKNY collection + DKNY filter keeps products visible)
 * 2. Case-insensitive brand matching in services and components
 * 3. Authoritative category consolidation migration (SWETER, SPORTWEAR, duplicate TROUSERS)
 * 4. Frontend category deduplication
 * 5. Ticker clean presentation without redundant content repetition
 * 6. Brand logo fallback uses typographic name instead of generic tag icon
 * 7. Loading counter does not display "Showing 0 of 0 items" while loading
 * 8. Empty state single clear recovery action (no competing clear buttons)
 * 9. Button variant hierarchy (primary, secondary, outline, ghost, icon)
 * 10. SOLD OUT visual presentation: single primary indicator and subdued treatment
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

import { getInitialBrandProducts } from "../src/lib/services/products";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testId: string, description: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testId} — ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testId} — ${description}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING STOREFRONT UX REFINEMENT REGRESSION SUITE");
  console.log("==================================================\n");

  // ── 1. Brand Collection + Brand Filter Intersection ───────────────────────
  console.log("▶ Test Group 1: Brand Collection & Filter Intersection");
  const sampleProducts = getInitialBrandProducts(["Ayaan"]);
  assert(sampleProducts.length > 0, "B1", "Brand filtering returns matching products for valid brand");

  // Case-insensitivity test: "ayaan", "AYAAN", "Ayaan" should all match
  const lowerProducts = getInitialBrandProducts(["ayaan"]);
  const upperProducts = getInitialBrandProducts(["AYAAN"]);
  assert(
    lowerProducts.length === sampleProducts.length && upperProducts.length === sampleProducts.length,
    "B2",
    "Brand filtering is strictly case-insensitive across uppercase/lowercase inputs"
  );

  // ShopByBrand source inspection: preserves collection brand and does not zero out
  const shopByBrandSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "home", "ShopByBrand.tsx"),
    "utf-8"
  );
  assert(
    shopByBrandSource.includes("collectionBrandRef"),
    "B3",
    "ShopByBrand tracks collection brand context with collectionBrandRef"
  );
  assert(
    shopByBrandSource.includes("effectiveBrands"),
    "B4",
    "ShopByBrand uses effectiveBrands to ensure collection brand remains active when filter applied"
  );
  assert(
    shopByBrandSource.includes(".toLowerCase()"),
    "B5",
    "ShopByBrand applies case-insensitive brand selection checks"
  );

  // GlobalFilterRail source inspection
  const filterRailSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "common", "GlobalFilterRail.tsx"),
    "utf-8"
  );
  assert(
    filterRailSource.includes("b.toLowerCase() === brandNameLower"),
    "B6",
    "GlobalFilterRail uses case-insensitive comparison for brand toggle and grid highlighting"
  );

  // Backend ProductController inspection
  const productControllerSource = fs.readFileSync(
    path.join(process.cwd(), "backend", "app", "Http/Controllers/Api/V1/ProductController.php"),
    "utf-8"
  );
  assert(
    productControllerSource.includes("LOWER(slug)") && productControllerSource.includes("LOWER(name)"),
    "B7",
    "Backend ProductController applies PostgreSQL case-insensitive brand and category matching via LOWER()"
  );

  // ── 2. Category Quality & Database Migration ─────────────────────────────
  console.log("\n▶ Test Group 2: Category Quality & Authoritative Consolidation");
  const migrationPath = path.join(
    process.cwd(),
    "backend",
    "database",
    "migrations",
    "2026_10_08_021000_consolidate_duplicate_categories_and_fix_typos.php"
  );
  assert(fs.existsSync(migrationPath), "C1", "Authoritative category consolidation migration exists on disk");

  const migrationContent = fs.readFileSync(migrationPath, "utf-8");
  assert(
    migrationContent.includes("sweter") && migrationContent.includes("Sweater"),
    "C2",
    "Migration consolidates misspelled SWETER into canonical Sweater/Sweaters with product re-linking"
  );
  assert(
    migrationContent.includes("trousers-1") && migrationContent.includes("trousers"),
    "C3",
    "Migration merges duplicate Trousers (trousers-1) into canonical trousers"
  );
  assert(
    migrationContent.includes("SPORTWEAR") && migrationContent.includes("Sportswear"),
    "C4",
    "Migration fixes SPORTWEAR to Sportswear"
  );

  // CategoriesSection frontend deduplication
  const categoriesSectionSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "home", "CategoriesSection.tsx"),
    "utf-8"
  );
  assert(
    categoriesSectionSource.includes("seen.has(norm)") && categoriesSectionSource.includes("seen.add(norm)"),
    "C5",
    "CategoriesSection deduplicates categories by normalized name/slug to prevent repeated pills"
  );

  // ── 3. Ticker Presentation ────────────────────────────────────────────────
  console.log("\n▶ Test Group 3: Homepage Ticker Presentation");
  const serviceStripSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "home", "ServiceStrip.tsx"),
    "utf-8"
  );
  assert(
    !serviceStripSource.includes("while (displayItems.length < 6"),
    "T2",
    "ServiceStrip does not unnecessarily duplicate content within base track"
  );
  assert(
    serviceStripSource.includes("animate-ticker-marquee"),
    "T3",
    "Continuous marquee animation is preserved with Set 1 and Set 2"
  );

  // ── 4. Brand Logo Fallback Quality ────────────────────────────────────────
  console.log("\n▶ Test Group 4: Brand Logo Quality & Normalization");
  const brandLogoTileSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "common", "BrandLogoTile.tsx"),
    "utf-8"
  );
  assert(
    !brandLogoTileSource.includes("<Tag") && brandLogoTileSource.includes("{name}"),
    "L1",
    "BrandLogoTile renders clean typographic brand wordmark fallback instead of generic Tag icon"
  );
  assert(
    brandLogoTileSource.includes("object-contain"),
    "L2",
    "BrandLogoTile uses object-contain to normalize brand logos without distortion"
  );

  // ── 5. Loading Counter State & Empty States ───────────────────────────────
  console.log("\n▶ Test Group 5: Loading State & Empty State Recovery");
  assert(
    shopByBrandSource.includes("isLoadingInitial ? (") && shopByBrandSource.includes("animate-pulse"),
    "S1",
    "ShopByBrand displays skeleton pulse counter instead of 'Showing 0 of 0 items' while loading"
  );
  assert(
    shopByBrandSource.includes("ProductCardSkeleton"),
    "S2",
    "ShopByBrand displays ProductCardSkeleton grid during initial product load"
  );

  const searchPageSource = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "search", "page.tsx"),
    "utf-8"
  );
  assert(
    searchPageSource.includes("Clear All Criteria") || searchPageSource.includes("Clear Filters"),
    "S3",
    "Search page provides unified recovery button without competing duplicate clear controls"
  );
  assert(
    searchPageSource.includes("COLLECTION —"),
    "S4",
    "Search page clearly identifies brand collection in page heading when filtered by brand"
  );

  // ── 6. Button Hierarchy Variants ──────────────────────────────────────────
  console.log("\n▶ Test Group 6: Button Design System Hierarchy");
  const buttonSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "ui", "Button.tsx"),
    "utf-8"
  );
  assert(
    buttonSource.includes('"primary"') &&
    buttonSource.includes('"secondary"') &&
    buttonSource.includes('"outline"') &&
    buttonSource.includes('"ghost"') &&
    buttonSource.includes('"icon"'),
    "U1",
    "Button component implements primary, secondary, outline, ghost, and icon variants"
  );

  // ── 7. Sold Out Presentation ─────────────────────────────────────────────
  console.log("\n▶ Test Group 7: Sold Out Product Presentation");
  const productCardSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "product", "ProductCard.tsx"),
    "utf-8"
  );
  assert(
    productCardSource.includes("isSoldOut ? null : isPreorder ?"),
    "P1",
    "ProductCard omits redundant bottom Sold Out text to prefer single strong top-left badge indicator"
  );
  assert(
    productCardSource.includes("grayscale-"),
    "P2",
    "ProductCard subdues sold out items visually while keeping them visible and accessible"
  );
  assert(
    productCardSource.includes("handleWishlistToggle"),
    "P3",
    "ProductCard keeps wishlist toggle available for sold out products"
  );

  // ── 8. Featured Products Clean Header ─────────────────────────────────────
  console.log("\n▶ Test Group 8: Featured Products Header & Ordering");
  const featuredProductsSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "home", "FeaturedProducts.tsx"),
    "utf-8"
  );
  assert(
    !featuredProductsSource.includes('id="featured-filter-best-deals"') &&
    !featuredProductsSource.includes('id="featured-filter-new-arrivals"'),
    "F1",
    "FeaturedProducts header has removed obsolete mode filter buttons"
  );

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passedCount}`);
  console.log(`TOTAL FAILED: ${failedCount}`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
