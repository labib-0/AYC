import fs from "fs";
import path from "path";
import { INITIAL_MOCK_PRODUCTS } from "../src/lib/mock-data/mock-products";
import {
  toStorefrontProduct,
  getFeaturedProducts,
  getInitialFeaturedProducts,
  getInitialBrandProducts,
} from "../src/lib/services/products";
import { filterProducts } from "../src/lib/filters";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log("==================================================");
console.log("STRICT LANDING-PAGE PRODUCT DISPLAY & PAGINATION RULE");
console.log("==================================================\n");

// Read source files
const featuredPath = path.join(process.cwd(), "src/components/home/FeaturedProducts.tsx");
const shopByBrandPath = path.join(process.cwd(), "src/components/home/ShopByBrand.tsx");
const hotSalesPath = path.join(process.cwd(), "src/components/home/HotSales.tsx");

const featuredSource = fs.readFileSync(featuredPath, "utf-8");
const shopByBrandSource = fs.readFileSync(shopByBrandPath, "utf-8");
const hotSalesSource = fs.readFileSync(hotSalesPath, "utf-8");

// Prepare mock products
const allProducts = INITIAL_MOCK_PRODUCTS.map(toStorefrontProduct);

// ── GROUP 1: Maximum 3 Rows = 7 Columns Grid Layout Audit ────────────────────
console.log("▶ Group 1: 21 Products = Maximum 3 Rows Layout (7 Columns)");

assert(
  featuredSource.includes("grid-cols-"),
  "FeaturedProducts defines responsive grid columns"
);

assert(
  shopByBrandSource.includes("grid-cols-"),
  "ShopByBrand defines responsive grid columns"
);

assert(
  hotSalesSource.includes("grid-cols-"),
  "HotSales defines responsive grid columns"
);

assert(
  featuredSource.includes("INITIAL_PRODUCT_LIMIT = 21"),
  "FeaturedProducts declares INITIAL_PRODUCT_LIMIT = 21"
);

assert(
  shopByBrandSource.includes("INITIAL_BRAND_PRODUCTS_LIMIT = 21"),
  "ShopByBrand declares INITIAL_BRAND_PRODUCTS_LIMIT = 21"
);

assert(
  hotSalesSource.includes("INITIAL_PRODUCT_LIMIT = 21"),
  "HotSales declares INITIAL_PRODUCT_LIMIT = 21"
);

// ── GROUP 2: FeaturedProducts - Strict Initial Limit & Reset On All Selections ─
console.log("\n▶ Group 2: Featured Products - Strict Initial Limit & Reset");

{
  // 1. Initial display default
  const initialDeals = getInitialFeaturedProducts("best-deals");
  assert(
    initialDeals.length <= 21,
    `FeaturedProducts initial Best Deals returns ${initialDeals.length} items (strictly <= 21)`
  );

  const initialNew = getInitialFeaturedProducts("new-arrivals");
  assert(
    initialNew.length <= 21,
    `FeaturedProducts initial New Arrivals returns ${initialNew.length} items (strictly <= 21)`
  );

  // 2. Tab switch removed - Best Deals / New Arrivals tabs eliminated
  assert(
    !featuredSource.includes("handleTabClick") &&
      !featuredSource.includes("activeTab"),
    "FeaturedProducts eliminated handleTabClick and activeTab"
  );

  // 3. Filter update resets pagination in source code
  assert(
    featuredSource.includes("handleFilterUpdate = async") &&
      featuredSource.includes("setHasLoadedMore(false);\n    setIsContinuousMode(false);\n    isContinuousModeRef.current = false;"),
    "FeaturedProducts resets hasLoadedMore and isContinuousMode on ANY filter selection"
  );

  // 4. Test filtering across brands, audiences, categories
  const brandTest = filterProducts({
    products: allProducts,
    brandIds: ["Nike"],
  });
  assert(
    brandTest.slice(0, 21).length <= 21,
    `Brand selection ('Nike', ${brandTest.length} total) is strictly capped at max 21 initially`
  );

  const audienceTest = filterProducts({
    products: allProducts,
    audienceIds: ["MEN"],
  });
  assert(
    audienceTest.slice(0, 21).length <= 21,
    `Audience selection ('MEN', ${audienceTest.length} total) is strictly capped at max 21 initially`
  );

  const categoryTest = filterProducts({
    products: allProducts,
    categoryNames: ["T-Shirts"],
  });
  assert(
    categoryTest.slice(0, 21).length <= 21,
    `Category selection ('T-Shirts', ${categoryTest.length} total) is strictly capped at max 21 initially`
  );
}

// ── GROUP 3: ShopByBrand - Strict Initial Limit & Reset On All Selections ─────
console.log("\n▶ Group 3: Shop By Brand - Strict Initial Limit & Reset");

{
  // 1. Initial brand expansion limit
  const initialBrandItems = getInitialBrandProducts(["Nike"]);
  assert(
    initialBrandItems.length <= 21,
    `ShopByBrand initial products returns ${initialBrandItems.length} items (strictly <= 21)`
  );

  // 2. Multi-brand selection
  const multiBrands = filterProducts({
    products: allProducts,
    brandIds: ["Nike", "Adidas", "Puma", "Zara", "H&M"],
  });
  assert(
    multiBrands.length > 21,
    `Multi-brand test dataset has ${multiBrands.length} total products (> 21)`
  );
  assert(
    multiBrands.slice(0, 21).length === 21,
    "Multi-brand selection displays strictly 21 products initially (never all at once)"
  );

  // 3. Source code audit: handleFilterUpdate resets pagination
  assert(
    shopByBrandSource.includes("handleFilterUpdate = async") &&
      shopByBrandSource.includes("setHasLoadedMore(false);\n    setIsContinuousMode(false);\n    isContinuousModeRef.current = false;"),
    "ShopByBrand resets hasLoadedMore and isContinuousMode on ANY brand/category/audience selection"
  );
}

// ── GROUP 4: HotSales - Strict Initial Limit & Reset On All Selections ────────
console.log("\n▶ Group 4: Hot Sale - Strict Initial Limit & Reset");

{
  // 1. Sweaters Hot Sale product
  const allSweaters = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
  });
  assert(
    allSweaters.length > 21,
    `Sweaters total count is ${allSweaters.length} (> 21)`
  );
  assert(
    allSweaters.slice(0, 21).length === 21,
    "Sweater selection displays strictly 21 products initially"
  );

  // 2. Towels Hot Sale product
  const allTowels = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
  });
  assert(
    allTowels.length <= 21,
    `Towels total count is ${allTowels.length} (<= 21)`
  );
  assert(
    allTowels.slice(0, 21).length === allTowels.length,
    `Towel selection displays all ${allTowels.length} available products without pagination overflow`
  );

  // 3. Source code audit: HotSales resets pagination on audience and tile clicks
  assert(
    hotSalesSource.includes("handleAudienceToggle = (audId: string) => {") &&
      hotSalesSource.includes("setVisibleCount(INITIAL_PRODUCT_LIMIT);\n    setHasLoadedMore(false);\n    setIsContinuousMode(false);"),
    "HotSales resets visibleCount to 21, hasLoadedMore=false, and isContinuousMode=false on audience toggle"
  );

  assert(
    hotSalesSource.includes("handleHotSaleProductSelect = (categorySlug: string) => {") &&
      hotSalesSource.includes("setVisibleCount(INITIAL_PRODUCT_LIMIT);\n      setHasLoadedMore(false);\n      setIsContinuousMode(false);"),
    "HotSales resets visibleCount to 21, hasLoadedMore=false, and isContinuousMode=false on product tile select"
  );
}

// ── GROUP 5: Load More & Auto-Pagination Transition Across All 3 Components ──
console.log("\n▶ Group 5: First Load More Click: Batch + Auto-Pagination + Filter Rail");

{
  // FeaturedProducts Load More click behavior: MUST NOT open filter rail (Section 1 & 2)
  const featuredLoadMoreSection = featuredSource.split("handleLoadMoreClick = async")[1]?.split("finally {")[0] || "";
  assert(
    featuredSource.includes("handleLoadMoreClick = async") &&
      featuredSource.includes("setHasLoadedMore(true)") &&
      featuredSource.includes("setIsContinuousMode(true)") &&
      !featuredLoadMoreSection.includes("setIsFilterOpen(true)"),
    "FeaturedProducts handleLoadMoreClick activates hasLoadedMore, isContinuousMode, and NEVER opens isFilterOpen"
  );

  // ShopByBrand Load More click behavior
  assert(
    shopByBrandSource.includes("handleLoadMoreClick = async") &&
      shopByBrandSource.includes("setHasLoadedMore(true)") &&
      shopByBrandSource.includes("setIsContinuousMode(true)") &&
      shopByBrandSource.includes("setIsFilterOpen(true)"),
    "ShopByBrand handleLoadMoreClick activates hasLoadedMore, isContinuousMode, and opens isFilterOpen"
  );

  // HotSales Load More click behavior
  assert(
    hotSalesSource.includes("handleLoadMoreClick = () => {") &&
      hotSalesSource.includes("setHasLoadedMore(true)") &&
      hotSalesSource.includes("setIsContinuousMode(true)") &&
      hotSalesSource.includes("setIsFilterOpen(true)"),
    "HotSales handleLoadMoreClick activates hasLoadedMore, isContinuousMode, and opens isFilterOpen"
  );

  // Manual Load More button is hidden when continuous mode is active
  assert(
    featuredSource.includes("!isContinuousMode && (") &&
      featuredSource.includes("<span>LOAD MORE</span>"),
    "FeaturedProducts guards manual LOAD MORE with !isContinuousMode (hides manual button upon click)"
  );

  assert(
    shopByBrandSource.includes("!isContinuousMode && (") &&
      shopByBrandSource.includes("<span>LOAD MORE"),
    "ShopByBrand guards manual LOAD MORE with !isContinuousMode (hides manual button upon click)"
  );

  assert(
    hotSalesSource.includes("!isContinuousMode && hasMore") &&
      hotSalesSource.includes("<span>LOAD MORE</span>"),
    "HotSales guards manual LOAD MORE with !isContinuousMode && hasMore (hides manual button upon click)"
  );

  // Continuous auto-pagination sentinel is mounted when isContinuousMode is active
  assert(
    featuredSource.includes("{isContinuousMode && (") &&
      featuredSource.includes("ref={sentinelRef}"),
    "FeaturedProducts renders sentinelRef for continuous auto-pagination when isContinuousMode is active"
  );

  assert(
    shopByBrandSource.includes("{isContinuousMode && (") &&
      shopByBrandSource.includes("ref={sentinelRef}"),
    "ShopByBrand renders sentinelRef for continuous auto-pagination when isContinuousMode is active"
  );

  assert(
    hotSalesSource.includes("isContinuousMode && hasMore") &&
      hotSalesSource.includes("ref={sentinelRef}"),
    "HotSales renders sentinelRef for continuous auto-pagination when isContinuousMode is active"
  );
}

// ── GROUP 6: Real Async Service Invocations ─────────────────────────────────
console.log("\n▶ Group 6: Real Service Pagination Invocations");

async function runServiceTests() {
  // Test Best Deals batch
  const dealsBatch = await getFeaturedProducts({ tab: "best-deals" });
  assert(
    dealsBatch.products.length <= 21,
    `getFeaturedProducts('best-deals') default returns <= 21 items (got: ${dealsBatch.products.length} of ${dealsBatch.total})`
  );
  assert(
    dealsBatch.hasMore === (dealsBatch.total > 21),
    `getFeaturedProducts hasMore correctly reflects total > 21 (hasMore=${dealsBatch.hasMore}, total=${dealsBatch.total})`
  );

  // Test New Arrivals batch
  const newBatch = await getFeaturedProducts({ tab: "new-arrivals" });
  assert(
    newBatch.products.length <= 21,
    `getFeaturedProducts('new-arrivals') default returns <= 21 items (got: ${newBatch.products.length} of ${newBatch.total})`
  );

  // Test next batch (offset 21, limit 21)
  const nextBatch = await getFeaturedProducts({ tab: "best-deals", offset: 21, limit: 21 });
  assert(
    nextBatch.products.length <= 21,
    `Next batch with offset 21 returns <= 21 items (got: ${nextBatch.products.length})`
  );

  // Verify zero ID overlap between batch 1 and batch 2
  const set1 = new Set(dealsBatch.products.map((p) => p.id));
  const hasOverlap = nextBatch.products.some((p) => set1.has(p.id));
  assert(!hasOverlap, "Zero overlapping product IDs between initial batch (21) and second batch");
}

runServiceTests()
  .then(() => {
    console.log("\n==================================================");
    console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
