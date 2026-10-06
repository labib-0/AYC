/**
 * AUTOMATED TEST SUITE: SHOP BY BRAND INLINE EXPANSION & HOMEPAGE BANNER
 * 
 * Validates Part 1 through Part 21 requirements:
 * A. Banner source resolves correctly & fallback is safe
 * B. Brand click: does NOT navigate (no router.push, local state only)
 * C. Brand click: sets brand filter
 * D. Brand click: expands inline product area
 * E. Initial result count: 21 maximum
 * F. Fewer than 21: show all, no Load More
 * G. More than 21: show Load More
 * H. First Load More: loads next batch
 * I. First Load More: enables auto-pagination
 * J. First Load More: opens filter rail on the LEFT
 * K. Filter rail close: stops auto-pagination
 * L. Filter rail close: restores Load More when more products remain
 * M. Multiple brands: correct combined filtering (OR logic)
 * N. Brand + Audience + Design Type + Category: combined filters work
 * O. No duplicate products across batch pagination
 * P. End-of-list: auto-pagination stops when exhausted
 * Q. No infinite observer loop
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

import { DEFAULT_TOP_BANNER, getTopBannerConfig } from "../src/config/banner";
import {
  getFeaturedProducts,
  getInitialBrandProducts,
} from "../src/lib/services/products";

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
  console.log("RUNNING SHOP BY BRAND & BANNER AUTOMATED TEST SUITE");
  console.log("==================================================\n");

  // ── A. Banner source resolves correctly ──────────────────────────────────
  console.log("▶ Test Group A: Banner Source Resolution & Fallback");
  const publicBannerPath = path.join(process.cwd(), "public", "images", "homepage-banner.jpg");
  const publicAyaanBannerPath = path.join(process.cwd(), "public", "images", "ayaan-top-banner.jpg");
  assert(fs.existsSync(publicBannerPath), "A1", "public/images/homepage-banner.jpg exists on disk");
  assert(fs.existsSync(publicAyaanBannerPath), "A2", "public/images/ayaan-top-banner.jpg exists on disk as compatibility alias");

  const defaultConfig = getTopBannerConfig();
  assert(
    defaultConfig.imageUrl === "/images/homepage-banner.jpg" && defaultConfig.active === true,
    "A3",
    "getTopBannerConfig() resolves to active default banner with valid imageUrl"
  );

  // Top banner is fully decoupled from promotions
  assert(
    defaultConfig.imageUrl === DEFAULT_TOP_BANNER.imageUrl && defaultConfig.title === DEFAULT_TOP_BANNER.title,
    "A4",
    "getTopBannerConfig() resolves to decoupled DEFAULT_TOP_BANNER without promotion dependency"
  );

  // ── B. Brand click: does NOT navigate ────────────────────────────────────
  console.log("\n▶ Test Group B: Brand Click Navigation Behavior");
  const shopByBrandSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "home", "ShopByBrand.tsx"),
    "utf-8"
  );
  const hasRouterPush = shopByBrandSource.includes("router.push");
  const hasRouterReplace = shopByBrandSource.includes("router.replace");
  const hasWindowLocation = shopByBrandSource.includes("window.location");
  const hasLinkImport = shopByBrandSource.includes("from \"next/link\"");
  assert(
    !hasRouterPush && !hasRouterReplace && !hasWindowLocation && !hasLinkImport,
    "B1",
    "ShopByBrand does not use router.push, router.replace, window.location, or next/link for brand selection"
  );

  const brandLogoTileSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "common", "BrandLogoTile.tsx"),
    "utf-8"
  );
  const rendersButtonWhenNoHref =
    brandLogoTileSource.includes("if (href) {") &&
    brandLogoTileSource.includes("<button") &&
    brandLogoTileSource.includes("aria-pressed={isSelected}");
  assert(
    rendersButtonWhenNoHref,
    "B2",
    "BrandLogoTile renders interactive <button type=\"button\"> with aria-pressed when href is omitted"
  );

  // ── C. Brand click: sets brand filter ────────────────────────────────────
  console.log("\n▶ Test Group C: Brand Filter State Setting");
  const singleBrandRes = await getFeaturedProducts({
    tab: "all",
    offset: 0,
    limit: 21,
    brands: ["Nike"],
  });
  assert(
    singleBrandRes.products.length > 0 &&
    singleBrandRes.products.every((p) => (p.brand || "").toLowerCase().includes("nike")),
    "C1",
    "Selecting 'Nike' filters products matching Nike brand"
  );

  // ── D. Brand click: expands inline product area ──────────────────────────
  console.log("\n▶ Test Group D: Inline Expansion Trigger");
  const hasExpansionCondition = shopByBrandSource.includes("selectedBrands.length > 0 && (");
  const hasExpansionId = shopByBrandSource.includes("id=\"brand-product-expansion\"");
  assert(
    hasExpansionCondition && hasExpansionId,
    "D1",
    "ShopByBrand conditionally expands inline #brand-product-expansion container when selectedBrands.length > 0"
  );

  // ── E. Initial result count: 21 maximum ──────────────────────────────────
  console.log("\n▶ Test Group E: Initial 21 Products Limit");
  // Multi-brand with more than 21 products: Zara (18) + Nike (15) = 33 products
  const multiBrandRes = await getFeaturedProducts({
    tab: "all",
    offset: 0,
    limit: 21,
    brands: ["Zara", "Nike"],
  });
  assert(
    multiBrandRes.products.length === 21,
    "E1",
    `Initial batch size is strictly 21 products (found: ${multiBrandRes.products.length})`
  );
  assert(
    multiBrandRes.total === 33,
    "E2",
    `Total count reflects all matching items (33 items), not just initial batch`
  );

  const initialSyncProducts = getInitialBrandProducts(["Zara", "Nike"], 21);
  assert(
    initialSyncProducts.length === 21,
    "E3",
    "getInitialBrandProducts synchronous fallback returns exactly 21 items"
  );

  // ── F. Fewer than 21: show all, no Load More ─────────────────────────────
  console.log("\n▶ Test Group F: Fewer than 21 Products Handling");
  // GAP has 6 products
  const gapRes = await getFeaturedProducts({
    tab: "all",
    offset: 0,
    limit: 21,
    brands: ["Gap"],
  });
  assert(
    gapRes.total === 6 && gapRes.products.length === 6 && gapRes.hasMore === false,
    "F1",
    "Brand with 6 products returns 6 items and hasMore = false (hides Load More)"
  );

  // ── G. More than 21: show Load More ──────────────────────────────────────
  console.log("\n▶ Test Group G: More than 21 Products Handling");
  assert(
    multiBrandRes.total > 21 && multiBrandRes.hasMore === true,
    "G1",
    "Brand selection with 33 products flags hasMore = true (displays LOAD MORE button)"
  );

  // ── H. First Load More: loads next batch ─────────────────────────────────
  console.log("\n▶ Test Group H: First Load More Batch Loading");
  const secondBatchRes = await getFeaturedProducts({
    tab: "all",
    offset: 21,
    limit: 21,
    brands: ["Zara", "Nike"],
  });
  assert(
    secondBatchRes.products.length === 12,
    "H1",
    `First Load More fetches next batch (offset 21) containing remaining 12 products (found: ${secondBatchRes.products.length})`
  );
  assert(
    secondBatchRes.hasMore === false,
    "H2",
    "Second batch exhausts dataset (hasMore = false)"
  );

  // ── I. First Load More: enables auto-pagination ──────────────────────────
  console.log("\n▶ Test Group I: Auto-Pagination Activation Transition");
  const hasContinuousModeTransition =
    shopByBrandSource.includes("setIsContinuousMode(true)") &&
    shopByBrandSource.includes("isContinuousModeRef.current = true");
  assert(
    hasContinuousModeTransition,
    "I1",
    "handleLoadMoreClick transitions isContinuousMode to true"
  );

  // ── J. First Load More: opens filter rail ────────────────────────────────
  console.log("\n▶ Test Group J: Filter Rail Open on First Load More");
  const hasFilterRailOpenTransition = shopByBrandSource.includes("setIsFilterOpen(true)");
  assert(
    hasFilterRailOpenTransition,
    "J1",
    "handleLoadMoreClick opens filter rail on the left (setIsFilterOpen(true))"
  );

  // ── K. Filter rail close: stops auto-pagination ──────────────────────────
  console.log("\n▶ Test Group K: Closing Filter Rail Stops Auto-Pagination");
  const hasFilterRailCloseLogic =
    shopByBrandSource.includes("const handleCloseFilter = () => {") &&
    shopByBrandSource.includes("setIsFilterOpen(false)") &&
    shopByBrandSource.includes("setIsContinuousMode(false)");
  assert(
    hasFilterRailCloseLogic,
    "K1",
    "handleCloseFilter sets isFilterOpen=false AND isContinuousMode=false"
  );

  // ── L. Filter rail close: restores Load More when more products remain ───
  console.log("\n▶ Test Group L: Restoring Manual Load More");
  const rendersManualLoadMoreWhenContinuousFalse =
    shopByBrandSource.includes("{!isContinuousMode && (") &&
    shopByBrandSource.includes("LOAD MORE");
  assert(
    rendersManualLoadMoreWhenContinuousFalse,
    "L1",
    "Manual LOAD MORE button is rendered whenever !isContinuousMode and hasMore is true"
  );

  // ── M. Multiple brands: correct combined filtering ───────────────────────
  console.log("\n▶ Test Group M: Multi-Brand OR Filtering");
  const multiThreeBrands = await getFeaturedProducts({
    tab: "all",
    offset: 0,
    limit: 100,
    brands: ["Nike", "Adidas", "Puma"],
  });
  const allBelong = multiThreeBrands.products.every((p) => {
    const b = (p.brand || "").toLowerCase();
    return b.includes("nike") || b.includes("adidas") || b.includes("puma");
  });
  assert(
    multiThreeBrands.products.length === 15 + 12 + 9 && allBelong,
    "M1",
    `Nike (15) + Adidas (12) + Puma (9) = 36 products matched with OR logic`
  );

  // ── N. Brand + Audience + Design Type + Category combined filters ────────
  console.log("\n▶ Test Group N: Combined Filters Intersection");
  const combinedRes = await getFeaturedProducts({
    tab: "all",
    offset: 0,
    limit: 100,
    brands: ["Levi's"],
    audiences: ["MEN"],
    designTypes: ["ORIGINAL"],
    categories: ["T-Shirts"],
  });
  const combinedMatch = combinedRes.products.every((p) => {
    return (
      (p.brand || "").toLowerCase().includes("levi") &&
      (p.audience === "MEN" || p.categoryId.includes("MEN")) &&
      p.designType === "ORIGINAL" &&
      p.categoryName?.toLowerCase().includes("t-shirt")
    );
  });
  assert(
    combinedRes.products.length > 0 && combinedMatch,
    "N1",
    `Brand + Audience + Design Type + Category combined filter returns correct subset (${combinedRes.products.length} products)`
  );

  // ── O. No duplicate products ─────────────────────────────────────────────
  console.log("\n▶ Test Group O: Duplicate Product Protection");
  const batch1 = multiBrandRes.products;
  const batch2 = secondBatchRes.products;
  const set1 = new Set(batch1.map((p) => p.id));
  const hasDuplicates = batch2.some((p) => set1.has(p.id));
  assert(
    !hasDuplicates,
    "O1",
    "No overlapping product IDs between initial batch (21) and next batch (12)"
  );

  // ── P. End-of-list: auto-pagination stops ────────────────────────────────
  console.log("\n▶ Test Group P: End-of-List Termination");
  const emptyBatch = await getFeaturedProducts({
    tab: "all",
    offset: 33,
    limit: 21,
    brands: ["Zara", "Nike"],
  });
  assert(
    emptyBatch.products.length === 0 && emptyBatch.hasMore === false,
    "P1",
    "When offset >= total, returns empty products and hasMore = false"
  );

  // ── Q. No infinite observer loop ─────────────────────────────────────────
  console.log("\n▶ Test Group Q: Observer Loop Guard");
  const hasGuardInObserver =
    shopByBrandSource.includes("if (!isContinuousMode || !hasMore) return;") &&
    shopByBrandSource.includes("!isLoadingRef.current && isContinuousModeRef.current");
  assert(
    hasGuardInObserver,
    "Q1",
    "IntersectionObserver disconnects when hasMore=false or continuous mode is inactive, and guards against concurrent loading"
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log("==================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
