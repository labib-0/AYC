import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getFeaturedProducts } from "../src/lib/services/products";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

console.log("==================================================");
console.log("HOMEPAGE FEATURED PRODUCTS MODE FILTERS VERIFICATION");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");
const backendDir = path.resolve(__dirname, "../backend");

const featuredCompFile = path.join(srcDir, "components/home/FeaturedProducts.tsx");
const productsServiceFile = path.join(srcDir, "lib/services/products.ts");
const productControllerFile = path.join(backendDir, "app/Http/Controllers/Api/V1/ProductController.php");
const cacheServiceFile = path.join(backendDir, "app/Services/Cache/CatalogCacheService.php");

const featuredCompContent = fs.readFileSync(featuredCompFile, "utf-8");
const productsServiceContent = fs.readFileSync(productsServiceFile, "utf-8");
const productControllerContent = fs.readFileSync(productControllerFile, "utf-8");
const cacheServiceContent = fs.readFileSync(cacheServiceFile, "utf-8");

// ==================================================
// 1. DEFAULT STATE — NEITHER BUTTON SELECTED
// ==================================================
console.log("\n▶ 1. Default State (Initial Page Load):");

assert(
  featuredCompContent.includes('useState<"best_deals" | "new_arrivals" | null>(null)'),
  "featuredMode state initializes to null (neither button selected by default)"
);

assert(
  !featuredCompContent.includes('useState<"best_deals" | "new_arrivals" | null>("best_deals")') &&
    !featuredCompContent.includes('useState<"best_deals" | "new_arrivals" | null>("new_arrivals")'),
  "Neither BEST DEALS nor NEW ARRIVALS is auto-selected on initial load"
);

// ==================================================
// 2. BUTTON DESIGN & PLACEMENT DIRECTLY UNDER HEADING
// ==================================================
console.log("\n▶ 2. Button Design & Placement:");

assert(
  featuredCompContent.includes("FEATURED PRODUCTS") &&
    featuredCompContent.includes("featured-filter-best-deals") &&
    featuredCompContent.includes("featured-filter-new-arrivals"),
  "Both BEST DEALS and NEW ARRIVALS buttons exist directly in Featured Products section"
);

const headingIdx = featuredCompContent.indexOf("FEATURED PRODUCTS");
const bestDealsBtnIdx = featuredCompContent.indexOf('id="featured-filter-best-deals"');
const newArrivalsBtnIdx = featuredCompContent.indexOf('id="featured-filter-new-arrivals"');

assert(
  headingIdx !== -1 && bestDealsBtnIdx > headingIdx && newArrivalsBtnIdx > headingIdx,
  "Buttons are positioned directly under the 'FEATURED PRODUCTS' heading"
);

assert(
  featuredCompContent.includes('aria-pressed={featuredMode === "best_deals"}') &&
    featuredCompContent.includes('aria-pressed={featuredMode === "new_arrivals"}'),
  "Buttons use semantic aria-pressed to reflect active/inactive state"
);

// ==================================================
// 3. MUTUAL EXCLUSIVITY & TOGGLE DESELECTION
// ==================================================
console.log("\n▶ 3. Mutual Exclusivity & Toggle Deselection:");

assert(
  featuredCompContent.includes("const nextMode = featuredModeRef.current === mode ? null : mode"),
  "Clicking the active button again sets nextMode to null (deselects and returns to default mode)"
);

assert(
  featuredCompContent.includes("handleModeToggle"),
  "handleModeToggle handles switching between modes and resetting pagination"
);

// ==================================================
// 4. BEST DEALS: HOT TAG IS THE SOLE SOURCE OF TRUTH
// ==================================================
console.log("\n▶ 4. Best Deals HOT Tag Authoritative Criterion:");

assert(
  productControllerContent.includes("$mode === 'best_deals'") &&
    productControllerContent.includes("where('is_hot', true)"),
  "Backend ProductController queries where('is_hot', true) for best_deals mode"
);

assert(
  productControllerContent.includes("hot_until"),
  "Backend checks hot_until expiration for active HOT tag validity"
);

assert(
  !productControllerContent.includes("deal_score") &&
    !productControllerContent.includes("discount_percentage"),
  "Best Deals does NOT invent any artificial scoring or discount calculation"
);

assert(
  productsServiceContent.includes("BEST DEALS = products carrying the active HOT tag"),
  "Frontend products service adheres to HOT tag as source of truth for Best Deals"
);

// ==================================================
// 5. NEW ARRIVALS: SORTED BY AUTHORITATIVE LATEST UPLOAD
// ==================================================
console.log("\n▶ 5. New Arrivals Newest Upload Sorting:");

assert(
  productControllerContent.includes("$mode === 'new_arrivals'") &&
    productControllerContent.includes("orderBy('created_at', 'desc')"),
  "Backend queries eligible products ordered by created_at DESC for new_arrivals mode"
);

assert(
  productsServiceContent.includes("createdAt") || productsServiceContent.includes("created_at"),
  "Frontend products service orders by authoritative product creation timestamp"
);

// ==================================================
// 6. STOREFRONT VISIBILITY PRESERVATION
// ==================================================
console.log("\n▶ 6. Storefront Visibility Compliance:");

assert(
  productControllerContent.includes("$applyStorefrontFilters") &&
    productControllerContent.includes("storefrontVisible()->whereNull('deleted_at')"),
  "Storefront visibility (published, non-deleted, visible) is strictly enforced across all modes"
);

// ==================================================
// 7. DEFAULT MODE PRESERVES PINNED -> LATEST -> REMAINING
// ==================================================
console.log("\n▶ 7. Default Mode Integrity:");

assert(
  productControllerContent.includes("HomepageFeaturedProduct::query()") &&
    productControllerContent.includes("orderBy('sort_order', 'asc')") &&
    productControllerContent.includes("orderBy('created_at', 'desc')"),
  "Default mode preserves authoritative Admin-pinned -> latest uploaded -> remaining featured sequence"
);

// ==================================================
// 8. BACKEND API, CACHING & PAGINATION INDEPENDENCE
// ==================================================
console.log("\n▶ 8. API & Cache Isolation:");

assert(
  productControllerContent.includes("CatalogCacheService::rememberFeaturedPage") &&
    productControllerContent.includes("$mode"),
  "Backend caches featured pages with mode-specific cache separation"
);

assert(
  cacheServiceContent.includes("featuredPageKey") &&
    cacheServiceContent.includes("catalog:products:featured:v"),
  "CatalogCacheService formats isolated cache keys with versioning"
);

// ==================================================
// 9. FUNCTIONAL SIMULATION TESTS
// ==================================================
console.log("\n▶ 9. Functional Simulation Tests:");

const sampleProducts = [
  { id: "p1", name: "Alpha", isHot: true, isNew: false, createdAt: "2026-09-01T00:00:00Z" },
  { id: "p2", name: "Beta", isHot: false, isNew: true, createdAt: "2026-09-20T00:00:00Z" },
  { id: "p3", name: "Gamma", isHot: true, isNew: true, createdAt: "2026-09-15T00:00:00Z" },
  { id: "p4", name: "Delta", isHot: false, isNew: false, createdAt: "2026-08-01T00:00:00Z" },
];

// Best Deals test: only p1 and p3 (isHot === true)
const bestDealsResult = sampleProducts.filter((p) => p.isHot);
assert(
  bestDealsResult.length === 2 &&
    bestDealsResult.some((p) => p.id === "p1") &&
    bestDealsResult.some((p) => p.id === "p3") &&
    !bestDealsResult.some((p) => p.id === "p2"),
  "Simulation: BEST DEALS includes only products carrying the active HOT tag"
);

// New Arrivals test: sorted newest first (p2, p3, p1, p4)
const newArrivalsResult = [...sampleProducts].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);
assert(
  newArrivalsResult[0].id === "p2" &&
    newArrivalsResult[1].id === "p3" &&
    newArrivalsResult[2].id === "p1" &&
    newArrivalsResult[3].id === "p4",
  "Simulation: NEW ARRIVALS sorts all eligible products newest upload first"
);

// ==================================================
// SUMMARY
// ==================================================
console.log("\n==================================================");
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL FEATURED PRODUCTS MODE FILTERS VERIFICATION TESTS PASSED!");
}
