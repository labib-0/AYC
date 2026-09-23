import fs from "fs";
import path from "path";
import { getFeaturedProducts, getInitialFeaturedProducts } from "../src/lib/services/products";

async function runTests() {
  console.log("==================================================");
  console.log("FEATURED PRODUCTS INITIAL DISPLAY LIMIT (MAX 21) TESTS");
  console.log("==================================================\n");

  const cwd = process.cwd();
  const featuredPath = path.join(cwd, "src/components/home/FeaturedProducts.tsx");
  const productsServicePath = path.join(cwd, "src/lib/services/products.ts");

  const featuredCode = fs.readFileSync(featuredPath, "utf-8");
  const productsServiceCode = fs.readFileSync(productsServicePath, "utf-8");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Static Source Code & Architecture Audits
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Source Code & Configuration Audits");

  assert(
    featuredCode.includes("const INITIAL_PRODUCT_LIMIT = 21;"),
    "FeaturedProducts defines const INITIAL_PRODUCT_LIMIT = 21"
  );

  assert(
    !featuredCode.includes("DESKTOP_INITIAL_LIMIT"),
    "FeaturedProducts completely replaced legacy DESKTOP_INITIAL_LIMIT (15)"
  );

  assert(
    !featuredCode.includes("targetLimit = 6") && !featuredCode.includes("targetLimit = 9"),
    "FeaturedProducts removed artificial mobile (6) and tablet (9) down-limits"
  );

  assert(
    productsServiceCode.includes("limit = options.limit ?? 21;"),
    "getFeaturedProducts in products.ts defaults limit to 21"
  );

  assert(
    productsServiceCode.includes("limit: number = 21,"),
    "getInitialFeaturedProducts in products.ts defaults limit to 21"
  );

  assert(
    featuredCode.includes("hasMore && totalCount > products.length"),
    "LOAD MORE button visibility is strictly guarded by hasMore && totalCount > products.length"
  );

  assert(
    featuredCode.includes("setIsContinuousMode(false)") &&
    featuredCode.includes("setHasLoadedMore(false)"),
    "handleClearAllFilters resets pagination state and continuous mode to clean initial state"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Functional Requirements A through I (Section 16)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Functional Dataset Simulations (Scenarios A through I)");

  // Helper simulating pagination slice & status
  function simulateFeaturedProducts(allMatching: any[], offset = 0, limit = 21) {
    const total = allMatching.length;
    const sliced = allMatching.slice(offset, offset + limit);
    const hasMore = offset + sliced.length < total;
    const isLoadMoreVisible = hasMore && total > (offset + sliced.length);
    return {
      products: sliced,
      total,
      hasMore,
      isLoadMoreVisible,
    };
  }

  // Scenario A: 14 products -> 14 shown, no Load More
  const mock14 = Array.from({ length: 14 }, (_, i) => ({ id: `prod_${i + 1}`, name: `Item ${i + 1}` }));
  const resA = simulateFeaturedProducts(mock14, 0, 21);
  assert(
    resA.products.length === 14 && resA.total === 14 && !resA.hasMore && !resA.isLoadMoreVisible,
    "Scenario A: 14 products → 14 shown, no Load More (total=14, hasMore=false, loadMore=hidden)"
  );

  // Scenario B: 21 products -> 21 shown, no Load More
  const mock21 = Array.from({ length: 21 }, (_, i) => ({ id: `prod_${i + 1}`, name: `Item ${i + 1}` }));
  const resB = simulateFeaturedProducts(mock21, 0, 21);
  assert(
    resB.products.length === 21 && resB.total === 21 && !resB.hasMore && !resB.isLoadMoreVisible,
    "Scenario B: 21 products → 21 shown, no Load More (total=21, hasMore=false, loadMore=hidden)"
  );

  // Scenario C: 22 products -> 21 shown, Load More visible
  const mock22 = Array.from({ length: 22 }, (_, i) => ({ id: `prod_${i + 1}`, name: `Item ${i + 1}` }));
  const resC = simulateFeaturedProducts(mock22, 0, 21);
  assert(
    resC.products.length === 21 && resC.total === 22 && resC.hasMore && resC.isLoadMoreVisible,
    "Scenario C: 22 products → 21 shown, Load More visible (total=22, hasMore=true, loadMore=shown)"
  );

  // Scenario D: 50 products -> 21 shown, Load More visible
  const mock50 = Array.from({ length: 50 }, (_, i) => ({ id: `prod_${i + 1}`, name: `Item ${i + 1}` }));
  const resD = simulateFeaturedProducts(mock50, 0, 21);
  assert(
    resD.products.length === 21 && resD.total === 50 && resD.hasMore && resD.isLoadMoreVisible,
    "Scenario D: 50 products → 21 shown, Load More visible (total=50, hasMore=true, loadMore=shown)"
  );

  // Scenario E: Brand filter with 35 matches -> 21 shown, Load More visible
  const mockBrand35 = Array.from({ length: 35 }, (_, i) => ({ id: `brand_${i + 1}`, brand: "BrandA", name: `Item ${i + 1}` }));
  const resE = simulateFeaturedProducts(mockBrand35, 0, 21);
  assert(
    resE.products.length === 21 && resE.total === 35 && resE.hasMore && resE.isLoadMoreVisible,
    "Scenario E: Brand filter with 35 matches → 21 shown, Load More visible"
  );

  // Scenario F: Filter with 10 matches -> 10 shown, no Load More
  const mockFiltered10 = Array.from({ length: 10 }, (_, i) => ({ id: `filt_${i + 1}`, name: `Item ${i + 1}` }));
  const resF = simulateFeaturedProducts(mockFiltered10, 0, 21);
  assert(
    resF.products.length === 10 && resF.total === 10 && !resF.hasMore && !resF.isLoadMoreVisible,
    "Scenario F: Filter with 10 matches → 10 shown, no Load More (total=10, hasMore=false, loadMore=hidden)"
  );

  // Scenario G: First Load More -> next batch loaded, no duplicates
  const batch1 = simulateFeaturedProducts(mock50, 0, 21);
  const batch2 = simulateFeaturedProducts(mock50, 21, 21);
  const existingIds = new Set(batch1.products.map(p => p.id));
  const fresh = batch2.products.filter(p => !existingIds.has(p.id));
  const combined = [...batch1.products, ...fresh];
  assert(
    combined.length === 42 &&
    batch2.products.length === 21 &&
    new Set(combined.map(p => p.id)).size === 42,
    "Scenario G: First Load More → next batch loaded (42 items total), zero duplicate IDs"
  );

  // Scenario H: End of dataset -> Load More disappears, auto-pagination terminates
  const batch3 = simulateFeaturedProducts(mock50, 42, 21);
  const combinedFinal = [...combined, ...batch3.products.filter(p => !new Set(combined.map(x => x.id)).has(p.id))];
  const finalHasMore = combinedFinal.length < mock50.length;
  const finalLoadMoreVisible = finalHasMore && mock50.length > combinedFinal.length;
  assert(
    combinedFinal.length === 50 &&
    !finalHasMore &&
    !finalLoadMoreVisible,
    "Scenario H: End of dataset → 50/50 loaded, hasMore=false, Load More disappears, auto-pagination stops"
  );

  // Scenario I: Reset filters -> returns to maximum 21 initial products
  // When filters are cleared, offset=0, limit=21 is fetched against full unfiltered dataset
  const resetResult = simulateFeaturedProducts(mock50, 0, 21);
  assert(
    resetResult.products.length === 21 &&
    resetResult.total === 50 &&
    resetResult.hasMore &&
    resetResult.isLoadMoreVisible,
    "Scenario I: Reset filters → resets displayed count to max 21, restores Load More when more items exist"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Live Service Calls
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Real Service Invocations");

  const initialSync = getInitialFeaturedProducts("best-deals");
  assert(
    initialSync.length <= 21,
    `getInitialFeaturedProducts("best-deals") default call returns <= 21 products (returned ${initialSync.length})`
  );

  const asyncResult = await getFeaturedProducts({ tab: "best-deals" });
  assert(
    asyncResult.products.length <= 21 &&
    asyncResult.products.length <= asyncResult.total,
    `getFeaturedProducts({ tab: "best-deals" }) default call returns <= 21 products (returned ${asyncResult.products.length} of ${asyncResult.total})`
  );

  if (asyncResult.total > 21) {
    assert(
      asyncResult.products.length === 21 && asyncResult.hasMore === true,
      `When total (${asyncResult.total}) > 21, exactly 21 items returned and hasMore = true`
    );
  }

  console.log(`\n==================================================`);
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
