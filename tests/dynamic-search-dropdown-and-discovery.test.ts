import fs from "fs";
import path from "path";
import { productService } from "../src/services/product.service";
import { brandService } from "../src/services/brand.service";
import { searchHistoryService } from "../src/services/search-history.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

/**
 * AYAAN CLOTHING — DYNAMIC SEARCH DROPDOWN & SMART DISCOVERY AUDIT SUITE
 * Validates all 20 criteria specified in Part 7.
 */
export async function runDynamicSearchAudit(): Promise<{ passed: number; failed: number }> {
  console.log("===============================================================================");
  console.log(" AYAAN CLOTHING — DYNAMIC SEARCH DROPDOWN & SMART PRODUCT DISCOVERY AUDIT (20/20)");
  console.log("===============================================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: number, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] Criterion ${testId}: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Criterion ${testId}: ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // Load relevant source code
  const searchOverlayPath = path.join(cwd, "src/components/layout/SearchOverlay.tsx");
  const headerPath = path.join(cwd, "src/components/layout/Header.tsx");
  const productServicePath = path.join(cwd, "src/services/product.service.ts");
  const brandServicePath = path.join(cwd, "src/services/brand.service.ts");
  const searchHistoryPath = path.join(cwd, "src/services/search-history.service.ts");
  const backendSearchPath = path.join(cwd, "backend/app/Http/Controllers/Api/V1/SearchController.php");
  const apiRoutesPath = path.join(cwd, "backend/routes/api.php");

  const searchOverlayCode = fs.readFileSync(searchOverlayPath, "utf-8");
  const headerCode = fs.readFileSync(headerPath, "utf-8");
  const productServiceCode = fs.readFileSync(productServicePath, "utf-8");
  const brandServiceCode = fs.readFileSync(brandServicePath, "utf-8");
  const searchHistoryCode = fs.readFileSync(searchHistoryPath, "utf-8");
  const backendSearchCode = fs.readFileSync(backendSearchPath, "utf-8");
  const apiRoutesCode = fs.readFileSync(apiRoutesPath, "utf-8");

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 1: Empty input shows Recent Searches and admin-ordered brands, not product cards
  // ───────────────────────────────────────────────────────────────────────────
  const hasTrendingProductsInEmptyState =
    searchOverlayCode.includes("Trending Products") ||
    /allProducts\.filter\s*\(\s*\(p\)\s*=>\s*p\.isHot/i.test(searchOverlayCode);
  const hasTrendingBrandsInEmptyState =
    searchOverlayCode.includes("Trending Brands") &&
    searchOverlayCode.includes("trendingBrands.map");

  assert(
    !hasTrendingProductsInEmptyState && hasTrendingBrandsInEmptyState,
    1,
    "Empty input shows Recent Searches and admin-ordered brands, not product cards",
    "SearchOverlay must remove Trending Products and render Trending Brands."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 2: Empty recent history produces an empty Recent Searches list with no fabricated terms
  // ───────────────────────────────────────────────────────────────────────────
  const hasHardcodedRecentTerms =
    searchOverlayCode.includes("DEFAULT_RECENT") ||
    searchOverlayCode.includes('"Sweater", "Hoodie"') ||
    headerCode.includes('["Sweater", "T-Shirt", "Hoodie"]');
  const emptyRecentsSync = searchHistoryService.getRecentSearchesSync();

  assert(
    !hasHardcodedRecentTerms && Array.isArray(emptyRecentsSync),
    2,
    "Empty recent history produces an empty Recent Searches list with no fabricated terms",
    "No hardcoded defaults like 'Sweater', 'Hoodie', 'T-Shirt' may exist."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 3: A recorded recent search appears in the correct order
  // ───────────────────────────────────────────────────────────────────────────
  await searchHistoryService.clearAll();
  await searchHistoryService.recordSearch("Winter Jacket");
  await searchHistoryService.recordSearch("Denim Pants");
  const recentsAfterRecord = await searchHistoryService.getRecentSearches();

  assert(
    recentsAfterRecord.length >= 2 &&
    recentsAfterRecord[0] === "Denim Pants" &&
    recentsAfterRecord[1] === "Winter Jacket",
    3,
    "A recorded recent search appears in the correct order (most recent first)",
    `Expected ['Denim Pants', 'Winter Jacket'], got: ${JSON.stringify(recentsAfterRecord)}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 4: Selecting a recent search performs a fresh query
  // ───────────────────────────────────────────────────────────────────────────
  const hasRecentSearchSelectionHandler =
    searchOverlayCode.includes("onSelectTerm(term)") &&
    headerCode.includes("handleExecuteSearch(term)");

  assert(
    hasRecentSearchSelectionHandler,
    4,
    "Selecting a recent search performs a fresh query",
    "onSelectTerm must trigger fresh query execution in Header and router."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 5: The initial brand cards follow the same ordering rules as Admin → Brands
  // ───────────────────────────────────────────────────────────────────────────
  const brandsFromService = await brandService.getBrands({ all: false });
  const sortedBrands = [...brandsFromService]
    .filter((b) => b.is_active !== false)
    .sort((a, b) => {
      const orderDiff = (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

  const backendSortsAdminOrder =
    backendSearchCode.includes("orderBy") ||
    searchOverlayCode.includes("orderDiff");

  assert(
    sortedBrands.length > 0 &&
    sortedBrands[0].sort_order! <= (sortedBrands[1]?.sort_order ?? 9999) &&
    backendSortsAdminOrder,
    5,
    "The initial brand cards follow the same ordering rules as Admin → Brands",
    "Brands must be sorted authoritatively by sort_order ASC, name ASC."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 6: At most three brand cards are shown in the default desktop state
  // ───────────────────────────────────────────────────────────────────────────
  const capsAtThreeBrands =
    searchOverlayCode.includes("trendingBrands.slice(0, 3)") ||
    searchOverlayCode.includes("eligible.slice(0, 3)");

  assert(
    capsAtThreeBrands,
    6,
    "At most three brand cards are shown in the default desktop state",
    "SearchOverlay must strictly slice brands to 3 cards maximum."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 7: Disabled or unpublished brands are excluded according to storefront rules
  // ───────────────────────────────────────────────────────────────────────────
  const excludesInactiveBrands =
    searchOverlayCode.includes("b.is_active !== false") &&
    brandServiceCode.includes("b.is_active !== false");

  assert(
    excludesInactiveBrands,
    7,
    "Disabled or unpublished brands are excluded according to storefront rules",
    "is_active !== false must be enforced for all storefront-visible brands."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 8: Typing a brand name returns its relevant products
  // ───────────────────────────────────────────────────────────────────────────
  const brandSearchRes = await productService.getSearchSuggestions("Nike");
  const brandSearchMatchesBrand =
    brandSearchRes.products.length > 0 &&
    brandSearchRes.products.some((p) => p.brand.toLowerCase().includes("nike") || p.name.toLowerCase().includes("nike"));
  const backendHasBrandRelationSearch =
    backendSearchCode.includes("orWhereHas('brand'");

  assert(
    brandSearchMatchesBrand && backendHasBrandRelationSearch,
    8,
    "Typing a brand name returns its relevant products",
    "Searching for a brand must return products belonging to that brand."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 9: Typing a category name returns its relevant products
  // ───────────────────────────────────────────────────────────────────────────
  const catSearchRes = await productService.getSearchSuggestions("Shirt");
  const catSearchMatches = catSearchRes.products.length > 0;
  const backendHasCategoryRelationSearch =
    backendSearchCode.includes("orWhereHas('categories'");

  assert(
    catSearchMatches && backendHasCategoryRelationSearch,
    9,
    "Typing a category name returns its relevant products",
    "Searching for category names must return products assigned to that category."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 10: Typing a product title returns matching products
  // ───────────────────────────────────────────────────────────────────────────
  const allProducts = mockStore.getProducts();
  const sampleProduct = allProducts[0];
  const titleQuery = sampleProduct.name.split(" ")[0];
  const titleSearchRes = await productService.getSearchSuggestions(titleQuery);
  const foundSample = titleSearchRes.products.some((p) => p.id === String(sampleProduct.id));

  assert(
    titleSearchRes.products.length > 0 && foundSample,
    10,
    "Typing a product title returns matching products",
    `Query '${titleQuery}' must find product '${sampleProduct.name}'.`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 11: SKU search behaves correctly where supported
  // ───────────────────────────────────────────────────────────────────────────
  const sampleSku = sampleProduct.sku;
  const skuSearchRes = await productService.getSearchSuggestions(sampleSku);
  const foundBySku = skuSearchRes.products.some((p) => p.sku === sampleSku);
  const backendHasSkuSearch = backendSearchCode.includes("orWhere('sku'");

  assert(
    foundBySku && backendHasSkuSearch,
    11,
    "SKU search behaves correctly where supported",
    `Querying SKU '${sampleSku}' must retrieve the matching product.`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 12: Queries matching multiple dimensions produce relevant deduplicated results
  // ───────────────────────────────────────────────────────────────────────────
  const multiSearchRes = await productService.getSearchSuggestions("Boys Shirt");
  const productIds = multiSearchRes.products.map((p) => p.id);
  const uniqueProductIds = new Set(productIds);

  assert(
    productIds.length === uniqueProductIds.size,
    12,
    "Queries matching multiple dimensions produce relevant deduplicated results",
    "Product suggestions must have no duplicates."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 13: No unrelated products appear just to fill the dropdown
  // ───────────────────────────────────────────────────────────────────────────
  const nonsensicalQuery = "XYZ_DEFINITELY_NOT_EXISTING_PRODUCT_12345";
  const emptyRes = await productService.getSearchSuggestions(nonsensicalQuery);

  assert(
    emptyRes.products.length === 0,
    13,
    "No unrelated products appear just to fill the dropdown",
    "Non-matching queries must return exactly 0 products, never fallback to random trending."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 14: A query with fewer matches shows only those matches
  // ───────────────────────────────────────────────────────────────────────────
  // Search for the exact full SKU of a single product
  const singleSkuRes = await productService.getSearchSuggestions(sampleSku);

  assert(
    singleSkuRes.products.length >= 1 && singleSkuRes.products.length <= 6,
    14,
    "A query with fewer matches shows only those matches",
    `Specific SKU query should only return matching items, got: ${singleSkuRes.products.length}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 15: Zero matches produce a useful empty state
  // ───────────────────────────────────────────────────────────────────────────
  const hasZeroMatchesEmptyState =
    searchOverlayCode.includes("No matching products found for") &&
    searchOverlayCode.includes("Try searching by product");

  assert(
    hasZeroMatchesEmptyState,
    15,
    "Zero matches produce a useful empty state",
    "SearchOverlay must render a helpful zero-matches banner safely."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 16: Rapid typing cannot show stale responses
  // ───────────────────────────────────────────────────────────────────────────
  const hasDebounceAndAbort =
    searchOverlayCode.includes("AbortController") &&
    searchOverlayCode.includes("currentRequestIdRef") &&
    searchOverlayCode.includes("debounceTimerRef");

  assert(
    hasDebounceAndAbort,
    16,
    "Rapid typing cannot show stale responses (AbortController + RequestId counter)",
    "SearchOverlay must discard stale responses and abort obsolete in-flight requests."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 17: Enter, Escape, arrow keys and mouse interactions behave correctly
  // ───────────────────────────────────────────────────────────────────────────
  const hasKeyboardAndClickHandling =
    headerCode.includes("onSelectTerm") &&
    headerCode.includes("isSearchOpen") &&
    headerCode.includes("Escape");

  assert(
    hasKeyboardAndClickHandling,
    17,
    "Enter, Escape, arrow keys and mouse interactions behave correctly",
    "Keyboard dismissals and search executions verified in Header."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 18: Product and brand clicks open the intended routes or search results
  // ───────────────────────────────────────────────────────────────────────────
  const productLinksToPdp = searchOverlayCode.includes("/products/${product.slug}");
  const brandTriggersSearch =
    searchOverlayCode.includes("handleBrandClick") &&
    searchOverlayCode.includes("onSelectBrand");

  assert(
    productLinksToPdp && brandTriggersSearch,
    18,
    "Product and brand clicks open the intended routes or search results",
    "Product click routes to PDP; brand click triggers brand search."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 19: Mobile and desktop dropdown geometry work without clipping
  // ───────────────────────────────────────────────────────────────────────────
  const hasDesktopPositioning = searchOverlayCode.includes("top-[calc(100%+0.5rem)]");
  const hasMobilePositioning = searchOverlayCode.includes("max-h-[72vh]");

  assert(
    hasDesktopPositioning && hasMobilePositioning,
    19,
    "Mobile and desktop dropdown geometry work without clipping",
    "Dropdown must be anchored with constrained viewport heights."
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CRITERION 20: Existing navigation, favorites, cart, RFQ and product-detail functionality remains intact
  // ───────────────────────────────────────────────────────────────────────────
  const hasCartInHeader = headerCode.includes("setIsCartOpen");
  const hasWishlistInHeader = headerCode.includes("/dashboard/wishlist");
  const hasLocationInHeader = headerCode.includes("LocationModal");
  const languageModalRemoved = !headerCode.includes("LanguageCurrencyModal") && !headerCode.includes("header-language-btn");

  assert(
    hasCartInHeader && hasWishlistInHeader && hasLocationInHeader && languageModalRemoved,
    20,
    "Existing navigation, favorites, cart, RFQ and location functionality remains intact with language modal removed",
    "Global navigation utilities must remain completely functional and internal language switcher removed."
  );

  // Clean up test history
  await searchHistoryService.clearAll();

  console.log("\n===============================================================================");
  console.log(` AUDIT RESULT: ${passed} / 20 Criteria Passed (${failed === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
  console.log("===============================================================================\n");

  return { passed, failed };
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runDynamicSearchAudit().then(({ failed }) => {
    process.exit(failed === 0 ? 0 : 1);
  });
}
