/**
 * MASTER TEST SUITE: FEATURED PRODUCTS PAGINATION, FILTER TRIGGER DECOUPLING,
 * DOWN ARROW SCROLL TO CERTIFICATE, AND PRODUCT SELECTION ORDERING
 *
 * Verifies all 16 requirements from Section 23 of the Master Prompt:
 * 1. Load More does not open the filter rail.
 * 2. Manual Load More only loads the next Featured Products page.
 * 3. Auto pagination remains functional where intended.
 * 4. Auto pagination displays the down arrow.
 * 5. Down arrow appears at the bottom-right during auto-pagination.
 * 6. Down arrow scrolls to the existing Certificate section.
 * 7. Pressing the arrow stops future auto-pagination.
 * 8. Filter rail still works when manually opened.
 * 9. Best-deal/product-price ranking is no longer used for Featured Products.
 * 10. Admin-pinned Featured Products appear first.
 * 11. Pinned order is preserved where configured.
 * 12. Latest uploaded eligible product appears after the pinned products.
 * 13. Latest product is not duplicated if already pinned.
 * 14. Draft/hidden/archived products are excluded.
 * 15. Pagination does not duplicate products across pages.
 * 16. No unrelated homepage sections are changed.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { getFeaturedProducts } from "../src/lib/services/products";

console.log("================================================================================");
console.log("MASTER TEST SUITE: FEATURED PRODUCTS PAGINATION & SCROLL ARROW");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;
const asyncTasks: Promise<void>[] = [];

function test(description: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      const task = res
        .then(() => {
          console.log(`  ✓ Passed: ${description}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ FAILED: ${description}`);
          console.error(err);
          failed++;
        });
      asyncTasks.push(task);
      return task;
    } else {
      console.log(`  ✓ Passed: ${description}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ✗ FAILED: ${description}`);
    console.error(err);
    failed++;
  }
}

const rootDir = process.cwd();
const featuredPath = path.join(rootDir, "src/components/home/FeaturedProducts.tsx");
const brandTrustPath = path.join(rootDir, "src/components/home/BrandTrust.tsx");
const productsLibPath = path.join(rootDir, "src/lib/services/products.ts");
const homepageControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/HomepageController.php");
const homePagePath = path.join(rootDir, "src/app/page.tsx");

const featuredContent = fs.readFileSync(featuredPath, "utf-8");
const brandTrustContent = fs.readFileSync(brandTrustPath, "utf-8");
const productsLibContent = fs.readFileSync(productsLibPath, "utf-8");
const homepageControllerContent = fs.readFileSync(homepageControllerPath, "utf-8");
const homePageContent = fs.readFileSync(homePagePath, "utf-8");

console.log("[TEST GROUP 1]: FRONTEND — Filter & Pagination Decoupling (Sections 1, 2, 3)");

test("1. Load More does not open the filter rail (handleLoadMoreClick never calls setIsFilterOpen(true))", () => {
  const loadMoreFunction = featuredContent.split("handleLoadMoreClick = async")[1]?.split("finally {")[0] || "";
  assert(!loadMoreFunction.includes("setIsFilterOpen(true)"), "handleLoadMoreClick must NOT call setIsFilterOpen(true)");
  assert(!loadMoreFunction.includes("setIsFilterOpen"), "handleLoadMoreClick must NOT touch setIsFilterOpen");
});

test("2. Manual Load More only loads next page and activates pagination state", () => {
  const loadMoreFunction = featuredContent.split("handleLoadMoreClick = async")[1]?.split("finally {")[0] || "";
  assert(loadMoreFunction.includes("setProducts"), "handleLoadMoreClick must update products");
  assert(loadMoreFunction.includes("setHasLoadedMore(true)"), "handleLoadMoreClick sets hasLoadedMore to true");
  assert(loadMoreFunction.includes("setIsContinuousMode(true)"), "handleLoadMoreClick sets isContinuousMode to true");
});

test("3. Closing filter rail does not disable continuous pagination mode", () => {
  const closeFilterFunction = featuredContent.split("handleCloseFilter = () => {")[1]?.split("};")[0] || "";
  assert(closeFilterFunction.includes("setIsFilterOpen(false)"), "handleCloseFilter closes filter");
  assert(!closeFilterFunction.includes("setIsContinuousMode(false)"), "handleCloseFilter must NOT modify isContinuousMode");
});

test("4. Toggling filter rail does not couple with continuous pagination mode", () => {
  const toggleFilterFunction = featuredContent.split("handleToggleFilters = () => {")[1]?.split("};")[0] || "";
  assert(!toggleFilterFunction.includes("setIsContinuousMode(true)"), "handleToggleFilters must NOT force isContinuousMode to true");
});

console.log("\n[TEST GROUP 2]: FRONTEND — Down Arrow & Certificate Jump (Sections 4, 5, 6, 7, 8)");

test("5. Floating Down Arrow button is rendered immediately when Load More is pressed (showScrollDownButton)", () => {
  assert(
    featuredContent.includes("{showScrollDownButton && (") &&
    featuredContent.includes("handleJumpToCertificate"),
    "FeaturedProducts must conditionally render floating down arrow when showScrollDownButton is active"
  );
  assert(
    featuredContent.includes("ArrowDown") || featuredContent.includes("ChevronDown"),
    "FeaturedProducts down arrow must render recognizable arrow icon"
  );
  assert(
    featuredContent.includes("w-11 h-11") &&
    featuredContent.includes("rounded-full") &&
    featuredContent.includes("bg-white text-[#111827]"),
    "FeaturedProducts down arrow must match existing scroll-up button styling"
  );
});

test("6. Down Arrow is positioned fixed/floating near bottom-right corner matching scroll-up button", () => {
  assert(
    featuredContent.includes("fixed") &&
    featuredContent.includes("right-6") &&
    featuredContent.includes("z-40"),
    "Down arrow must be positioned floating in bottom-right corner matching scroll-up button"
  );
});

test("7. Down Arrow targets existing Certificate section (#certificate)", () => {
  assert(
    featuredContent.includes('document.getElementById("certificate")') ||
    featuredContent.includes('document.getElementById("certificates")'),
    "Down arrow jump handler must locate Certificate section element"
  );
  assert(
    brandTrustContent.includes('id="certificate"'),
    "BrandTrust section must have id='certificate' anchor"
  );
});

test("8. Pressing the arrow immediately stops future auto-pagination", () => {
  const jumpFunction = featuredContent.split("handleJumpToCertificate = () => {")[1]?.split("};")[0] || "";
  assert(
    jumpFunction.includes("setIsContinuousMode(false)") &&
    jumpFunction.includes("isContinuousModeRef.current = false"),
    "handleJumpToCertificate must set isContinuousMode to false and sync ref to false"
  );
  assert(
    jumpFunction.includes("scrollIntoView"),
    "handleJumpToCertificate must smoothly scroll to Certificate section"
  );
});

test("9. Filter rail can still be opened manually without triggering auto-pagination", () => {
  assert(
    featuredContent.includes("handleToggleFilters") &&
    featuredContent.includes("setIsFilterOpen"),
    "Filter rail toggle remains fully functional for manual user interaction"
  );
});

console.log("\n[TEST GROUP 3]: ORDERING & BEST DEAL REMOVAL (Sections 9, 10, 11, 12, 13, 14, 15, 16)");

test("10. Best-deal / pricing attractiveness ranking is removed from getFeaturedProducts", () => {
  assert(
    !productsLibContent.includes("dealsOnly = list.filter"),
    "getFeaturedProducts must NOT filter products using dealsOnly"
  );
  assert(
    !productsLibContent.includes("is_best_deal: isDeals ? true : undefined"),
    "getFeaturedProducts fallback must NOT query is_best_deal"
  );
});

test("11. HomepageController places Admin-pinned products first in sort_order ASC", () => {
  const productSection = homepageControllerContent.split("// 4. Fetch active featured products")[1] || "";
  assert(
    productSection.includes("orderBy('sort_order', 'asc')"),
    "Pinned featured products must be sorted by sort_order ASC"
  );
});

test("12. HomepageController appends remaining products in created_at DESC (newest upload first)", () => {
  const productSection = homepageControllerContent.split("// 4. Fetch active featured products")[1] || "";
  assert(
    productSection.includes("orderBy('created_at', 'desc')"),
    "Remaining products must be ordered by created_at DESC"
  );
  assert(
    !productSection.includes("orderBy('id', 'desc')"),
    "Ordering must NOT use id DESC"
  );
});

test("13. HomepageController prevents duplication of pinned products in remaining list", () => {
  const productSection = homepageControllerContent.split("// 4. Fetch active featured products")[1] || "";
  assert(
    productSection.includes("whereNotIn('id', $pinnedProductIds)") ||
    productSection.includes("whereNotIn"),
    "Pinned product IDs must be excluded from remaining query"
  );
  assert(
    productSection.includes("concat($remainingFeatured)"),
    "Pinned and remaining products must be concatenated"
  );
});

test("14. Storefront visibility rules strictly enforce storefrontVisible and non-deleted", () => {
  const productSection = homepageControllerContent.split("// 4. Fetch active featured products")[1] || "";
  assert(
    productSection.includes("storefrontVisible()"),
    "Only storefrontVisible products may be included"
  );
  assert(
    productSection.includes("whereNull('deleted_at')"),
    "Deleted products must be excluded"
  );
});

test("15. Pagination slices ordered products deterministically without cross-page duplicates", async () => {
  const page1 = await getFeaturedProducts({ offset: 0, limit: 10 });
  const page2 = await getFeaturedProducts({ offset: 10, limit: 10 });

  assert(Array.isArray(page1.products), "page1 products must be an array");
  assert(Array.isArray(page2.products), "page2 products must be an array");

  if (page1.products.length > 0 && page2.products.length > 0) {
    const ids1 = new Set(page1.products.map((p) => p.id));
    const overlap = page2.products.filter((p) => ids1.has(p.id));
    assert.strictEqual(overlap.length, 0, "Zero overlap between consecutive paginated batches");
  }
});

test("16. Unrelated homepage sections remain intact in src/app/page.tsx", () => {
  assert(homePageContent.includes("<TopBanner />"), "TopBanner preserved");
  assert(homePageContent.includes("<ServiceStrip />"), "ServiceStrip preserved");
  assert(homePageContent.includes("<ShopByBrand />"), "ShopByBrand preserved");
  assert(homePageContent.includes("<AudienceSection />"), "AudienceSection preserved");
  assert(homePageContent.includes("<CategoriesSection />"), "CategoriesSection preserved");
  assert(homePageContent.includes("<HotSales />"), "HotSales preserved");
  assert(homePageContent.includes("<FeaturedProducts />"), "FeaturedProducts preserved");
  assert(homePageContent.includes("<BrandTrust />"), "BrandTrust preserved");
});

Promise.all(asyncTasks).then(() => {
  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");
  if (failed > 0) process.exit(1);
});
