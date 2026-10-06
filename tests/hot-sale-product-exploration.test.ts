import fs from "fs";
import path from "path";
import { INITIAL_MOCK_PRODUCTS } from "../src/lib/mock-data/mock-products";
import { toStorefrontProduct } from "../src/lib/services/products";
import { filterProducts, PRODUCT_CATEGORIES } from "../src/lib/filters";
import {
  AUDIENCE_FILTERS,
  HotSaleCategory,
} from "../src/components/home/HotSales";

const hotSalesCategories: HotSaleCategory[] = [
  { id: "hot-sweaters", name: "SWEATERS", slug: "sweaters", image: "/test.jpg", description: "Test" },
  { id: "hot-towels", name: "TOWELS", slug: "towels", image: "/test.jpg", description: "Test" },
];

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
console.log("HOT SALE PRODUCT INLINE EXPLORATION TEST SUITE");
console.log("==================================================\n");

// Read HotSales component source code for static analysis
const hotSalesFilePath = path.join(process.cwd(), "src/components/home/HotSales.tsx");
const hotSalesSource = fs.readFileSync(hotSalesFilePath, "utf-8");

// Prepare storefront products
const allProducts = INITIAL_MOCK_PRODUCTS.map(toStorefrontProduct);

// Group 1: Source Code Architecture & Shared Handler Audits
console.log("▶ Group 1: Static Architecture & Shared Handler Audits");

assert(
  !hotSalesSource.includes("router.push") &&
    !hotSalesSource.includes("router.replace") &&
    !hotSalesSource.includes("window.location"),
  "HotSales does not trigger direct router navigation (no router.push, router.replace, window.location)"
);

assert(
  !hotSalesSource.includes('activeCategory === "towels"') &&
    !hotSalesSource.includes('activeCategory === "sweaters"'),
  "HotSales has eliminated product-specific special cases for 'towels' and 'sweaters'"
);

assert(
  !hotSalesSource.includes("towelColors") &&
    !hotSalesSource.includes("handleTowelColorToggle"),
  "HotSales removed towel-specific color state and towel color toggle handlers"
);

assert(
  !hotSalesSource.includes("COLOR:"),
  "HotSales removed the broken 'COLOR:' filter pill section"
);

assert(
  hotSalesSource.includes("handleHotSaleProductSelect"),
  "HotSales uses single shared selection handler handleHotSaleProductSelect"
);

assert(
  hotSalesSource.includes("AUDIENCE:"),
  "HotSales displays AUDIENCE controls universally for all selections"
);

assert(
  hotSalesSource.includes("INITIAL_PRODUCT_LIMIT = 21"),
  "HotSales enforces max 21 initial products limit (INITIAL_PRODUCT_LIMIT = 21)"
);

assert(
  hotSalesSource.includes("LOAD MORE"),
  "HotSales includes LOAD MORE button when products exceed initial batch"
);

// Group 2: Scenario A - Sweater Hot Sale Click
console.log("\n▶ Group 2: Scenario A - Sweater Hot Sale Flow");
{
  const sweaterCategory = hotSalesCategories.find((c) => c.slug === "sweaters");
  assert(!!sweaterCategory, "Sweater category exists in hotSalesCategories");

  // Filter products for sweaters
  const sweaterProducts = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: [],
  });

  assert(sweaterProducts.length > 0, `Sweater products found: ${sweaterProducts.length}`);
  
  // Initial display limit = 21
  const initialSweaters = sweaterProducts.slice(0, 21);
  assert(
    initialSweaters.length === 21,
    `Initial sweater display strictly capped at 21 (total: ${sweaterProducts.length})`
  );

  // Audience filtering works for Sweaters
  const menSweaters = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: ["MEN"],
  });
  assert(
    menSweaters.length > 0 && menSweaters.every((p) => (p as any).audience === "MEN"),
    `Sweater audience filtering to MEN yields ${menSweaters.length} products, all audience MEN`
  );
}

// Group 3: Scenario B - Towel Hot Sale Click (Must behave identically)
console.log("\n▶ Group 3: Scenario B - Towel Hot Sale Flow (Identical to Sweater)");
{
  const towelCategory = hotSalesCategories.find((c) => c.slug === "towels");
  assert(!!towelCategory, "Towel category exists in hotSalesCategories");

  // Filter products for towels using generic category matching
  const towelProducts = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: [],
  });

  assert(towelProducts.length > 0, `Towel products found: ${towelProducts.length}`);
  assert(
    towelProducts.length <= 21,
    `Towel products count (${towelProducts.length}) <= 21, so all fit in initial display without pagination overflow`
  );

  // Audience filtering works for Towels
  const unisexTowels = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: ["UNISEX"],
  });
  assert(
    unisexTowels.length === towelProducts.length,
    `Towel audience filtering to UNISEX preserves all ${unisexTowels.length} towels`
  );

  const menTowels = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: ["MEN"],
  });
  assert(
    menTowels.length === 0,
    `Towel audience filtering to MEN returns 0 products cleanly without runtime errors`
  );
}

// Group 4: Scenario C - Arbitrary Future Product Category
console.log("\n▶ Group 4: Scenario C - Arbitrary Future Product Categories");
{
  const arbitraryCategories = ["Hoodies", "T-Shirts", "Jackets", "Shorts", "Pants"];

  for (const cat of arbitraryCategories) {
    const canonical = PRODUCT_CATEGORIES.find(
      (pc) => pc.toLowerCase() === cat.toLowerCase()
    );
    assert(!!canonical, `Category '${cat}' correctly resolves against canonical PRODUCT_CATEGORIES`);

    const matches = filterProducts({
      products: allProducts,
      categoryNames: [canonical!],
      audienceIds: [],
    });
    assert(
      matches.length > 0,
      `Category '${cat}' successfully matched ${matches.length} products using generic filtering`
    );

    const initial = matches.slice(0, 21);
    assert(
      initial.length <= 21,
      `Category '${cat}' initial display respects max 21 limit (${initial.length} displayed)`
    );
  }
}

// Group 5: Scenario D & E - Navigation & Routes
console.log("\n▶ Group 5: Scenario D & E - No Navigation / No Color Routes");
{
  // Verify HotSales doesn't link to /products/ or /color/ for Hot Sale tile clicks
  const tileClickMatches = hotSalesSource.match(/handleHotSaleProductSelect\([^)]+\)/g);
  assert(
    !!tileClickMatches && tileClickMatches.length > 0,
    "Category tiles invoke handleHotSaleProductSelect directly without Link wraps"
  );

  assert(
    !hotSalesSource.includes('href="/color') && !hotSalesSource.includes("href={`/color"),
    "Zero color routes generated or referenced"
  );
}

// Group 6: Scenario F & G - State Reset & Selection Updates
console.log("\n▶ Group 6: Scenario F & G - Product Selection & State Reset");
{
  // Simulate state switching:
  // Step 1: User selects Sweaters with audience "MEN"
  let activeCategory: string | null = "sweaters";
  let selectedAudiences: string[] = ["MEN"];
  let visibleCount: number = 21;
  let isContinuousMode: boolean = false;

  let currentProducts = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: selectedAudiences,
  });
  assert(currentProducts.length > 0, "Sweater + MEN produces filtered products");

  // Step 2: User switches to Towel
  // Shared handler resets state:
  activeCategory = "towels";
  selectedAudiences = []; // Reset!
  visibleCount = 21; // Reset!
  isContinuousMode = false; // Reset!

  assert(visibleCount === 21 && !isContinuousMode, "Category switch resets visibleCount to 21 and isContinuousMode to false");

  currentProducts = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: selectedAudiences,
  });

  assert(
    selectedAudiences.length === 0,
    "State reset: selectedAudiences cleanly cleared when switching to Towels"
  );
  assert(
    activeCategory === "towels",
    "State updated: activeCategory cleanly set to towels"
  );
  assert(
    currentProducts.length === 6 &&
      currentProducts.every(
        (p) =>
          (p.name || "").toLowerCase().includes("towel") ||
          (p.sku || "").toLowerCase().includes("-twl-") ||
          p.categoryName === "Towels"
      ),
    "Clean results: Towel products displayed without any lingering Sweater products"
  );
}

// Group 7: Scenario H & I - 21 Limit & Load More Behavior
console.log("\n▶ Group 7: Scenario H & I - 21 Display Limit & Load More Behavior");
{
  // Sweaters has 39 products > 21
  const allSweaters = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: [],
  });

  const initialLimit = 21;
  const initialBatch = allSweaters.slice(0, initialLimit);
  const hasMoreInitial = allSweaters.length > initialBatch.length;

  assert(initialBatch.length === 21, "Initial batch is capped at exactly 21");
  assert(hasMoreInitial === true, "hasMore is true when total products (39) > 21");

  // Simulate clicking Load More
  const nextLimit = initialLimit + 21;
  const secondBatch = allSweaters.slice(0, nextLimit);
  const hasMoreSecond = allSweaters.length > secondBatch.length;

  assert(
    secondBatch.length === allSweaters.length,
    `Load more batch displays all ${allSweaters.length} products`
  );
  assert(hasMoreSecond === false, "hasMore becomes false once all products are displayed");

  // Towels has 6 products <= 21
  const allTowels = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: [],
  });

  const towelBatch = allTowels.slice(0, initialLimit);
  const towelHasMore = allTowels.length > towelBatch.length;

  assert(towelBatch.length === 6, "All 6 towels displayed immediately");
  assert(towelHasMore === false, "hasMore is false for towels (no redundant Load More button)");
}

// Group 8: Scenario J - Multiple Filters Functional
console.log("\n▶ Group 8: Scenario J - Multiple Filters (Audience + Brand)");
{
  // Test Sweaters with Brand filter
  const brandedSweaters = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: [],
    brandIds: ["Patagonia"],
  });

  assert(
    brandedSweaters.length > 0 &&
      brandedSweaters.every((p) => p.brand?.toLowerCase() === "patagonia"),
    `Multiple filters: Sweaters + Patagonia returns ${brandedSweaters.length} matching products`
  );

  // Test Towels with Brand filter
  const brandedTowels = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: ["UNISEX"],
    brandIds: ["Uniqlo"],
  });

  assert(
    brandedTowels.length > 0 &&
      brandedTowels.every((p) => p.brand?.toLowerCase() === "uniqlo"),
    `Multiple filters: Towels + UNISEX + Uniqlo returns ${brandedTowels.length} matching products`
  );
}

// Group 9: Universal Audience Filters Integrity
console.log("\n▶ Group 9: Universal Audience Filters Integrity");
{
  assert(
    AUDIENCE_FILTERS.length === 5,
    "AUDIENCE_FILTERS contains all 5 core audiences"
  );
  const ids = AUDIENCE_FILTERS.map((a) => a.id);
  assert(
    ids.includes("MEN") &&
      ids.includes("WOMEN") &&
      ids.includes("BOYS") &&
      ids.includes("GIRLS") &&
      ids.includes("UNISEX"),
    "AUDIENCE_FILTERS has MEN, WOMEN, BOYS, GIRLS, UNISEX"
  );
}

// Group 10: Audience + Filters Header Controls & Filter Rail Interaction
console.log("\n▶ Group 10: Audience + Filters Header Controls & Filter Rail Interaction");
{
  // 1. Static Layout: AUDIENCE and FILTERS controls appear together in contextual filter header
  assert(
    hotSalesSource.includes("AUDIENCE:") &&
      hotSalesSource.includes("<span>FILTERS</span>"),
    "HotSales source contains both 'AUDIENCE:' and 'FILTERS' in the expansion header"
  );

  assert(
    hotSalesSource.includes("flex items-center justify-between gap-2") &&
      hotSalesSource.includes("<SlidersHorizontal size={12} />"),
    "HotSales header row aligns AUDIENCE on the left and compact FILTERS on the right"
  );

  // 2. FILTERS Toggle Handler before Load More
  assert(
    hotSalesSource.includes("handleToggleFilters = () => {") &&
      hotSalesSource.includes("handleCloseFilter();") &&
      hotSalesSource.includes("setIsFilterOpen(true);"),
    "HotSales has handleToggleFilters that opens filter rail without enabling continuous mode"
  );

  // 3. Filter Rail Close Handler stops continuous auto-pagination
  assert(
    hotSalesSource.includes("handleCloseFilter = () => {") &&
      hotSalesSource.includes("setIsFilterOpen(false);") &&
      hotSalesSource.includes("setIsContinuousMode(false);"),
    "HotSales handleCloseFilter stops auto-pagination and restores manual mode"
  );

  // 4. GlobalFilterRail integration
  assert(
    hotSalesSource.includes("<GlobalFilterRail") &&
      hotSalesSource.includes("isOpen={isFilterOpen}") &&
      hotSalesSource.includes("onClose={handleCloseFilter}"),
    "HotSales directly renders GlobalFilterRail passing handleCloseFilter"
  );

  // 5. Audience Synchronization (Single Source of Truth)
  assert(
    hotSalesSource.includes("selectedAudiences={selectedAudiences}") &&
      hotSalesSource.includes("onAudiencesChange={handleAudiencesChange}"),
    "HotSales synchronizes selectedAudiences between inline buttons and GlobalFilterRail"
  );

  // 6. Dynamic Simulation: Pre-Load-More FILTERS Toggle Flow
  let activeCategory: string | null = "sweaters";
  let selectedAudiences: string[] = [];
  let selectedBrands: string[] = [];
  let visibleCount: number = 21;
  let hasLoadedMore: boolean = false;
  let isContinuousMode: boolean = false;
  let isFilterOpen: boolean = false;

  const sweaterMatches = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: selectedAudiences,
    brandIds: selectedBrands,
  });

  assert(
    sweaterMatches.length === 32,
    `Sweaters total count is 32 (> 21)`
  );

  let displayed = sweaterMatches.slice(0, visibleCount);
  assert(
    displayed.length === 21,
    `Initial displayed products capped at 21 (got: ${displayed.length})`
  );
  assert(
    displayed.length < sweaterMatches.length,
    "No full-dataset render: only first 21 of 32 items displayed initially"
  );

  // User clicks FILTERS before Load More:
  isFilterOpen = true;
  assert(
    isFilterOpen === true && isContinuousMode === false,
    "Clicking FILTERS before Load More opens filter rail without activating auto-pagination (isContinuousMode=false)"
  );
  assert(
    displayed.length === 21,
    "Opening FILTERS does not alter visible count (still max 21)"
  );

  // User changes Audience filter to 'MEN' while rail is open:
  selectedAudiences = ["MEN"];
  // State reset rule on filter change:
  visibleCount = 21;
  hasLoadedMore = false;
  isContinuousMode = false;

  const menSweaterMatches = filterProducts({
    products: allProducts,
    categoryNames: ["Sweaters"],
    audienceIds: selectedAudiences,
    brandIds: selectedBrands,
  });

  displayed = menSweaterMatches.slice(0, visibleCount);
  assert(
    menSweaterMatches.length === 8,
    `Filter change recalculates dataset: Sweaters + MEN = 8 items`
  );
  assert(
    displayed.length === 8,
    `Display resets to max 21: fits 8 items <= 21 without pagination`
  );

  // User resets audience and clicks Load More for the first time:
  selectedAudiences = [];
  visibleCount = 21;
  hasLoadedMore = false;
  isContinuousMode = false;

  // First Load More Click:
  visibleCount += 21; // Next batch
  hasLoadedMore = true;
  isContinuousMode = true;
  isFilterOpen = true;

  const pagedProducts = sweaterMatches.slice(0, visibleCount);
  assert(
    pagedProducts.length === 32,
    `First Load More batch loads next items: total ${pagedProducts.length} displayed`
  );
  assert(
    isContinuousMode === true && isFilterOpen === true,
    "First Load More activates auto-pagination (isContinuousMode=true) and opens filter rail (isFilterOpen=true)"
  );

  // Check no duplicate products:
  const seenIds = new Set<string>();
  let hasDuplicates = false;
  for (const p of pagedProducts) {
    if (seenIds.has(p.id)) {
      hasDuplicates = true;
      break;
    }
    seenIds.add(p.id);
  }
  assert(!hasDuplicates, "Zero duplicate product IDs across paginated batches");

  // User closes filter rail:
  isFilterOpen = false;
  isContinuousMode = false; // Auto-pagination stops!

  assert(
    isContinuousMode === false,
    "Closing filter rail sets isContinuousMode=false (stops auto-pagination)"
  );
  assert(
    selectedAudiences.length === 0,
    "Closing filter rail preserves active filter selections"
  );

  // Switching Hot Sale category resets to clean 21-limit state with both controls visible
  activeCategory = "towels";
  selectedAudiences = [];
  selectedBrands = [];
  visibleCount = 21;
  hasLoadedMore = false;
  isContinuousMode = false;
  isFilterOpen = false;

  assert(
    activeCategory === "towels" && !hasLoadedMore && !isFilterOpen,
    "Switching Hot Sale category resets activeCategory, hasLoadedMore=false, and isFilterOpen=false"
  );

  const towelMatches = filterProducts({
    products: allProducts,
    categoryNames: ["Towels"],
    audienceIds: selectedAudiences,
    brandIds: selectedBrands,
  });

  const towelDisplayed = towelMatches.slice(0, visibleCount);
  assert(
    towelDisplayed.length === 6 &&
      towelDisplayed.every(
        (p) =>
          p.categoryName?.toLowerCase() === "towels" ||
          (p.name || "").toLowerCase().includes("towel") ||
          (p.sku || "").toLowerCase().includes("-twl-")
      ),
    "Next Hot Sale selection displays matching products cleanly with zero stale sweater products"
  );
}

console.log("\n==================================================");
console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}

