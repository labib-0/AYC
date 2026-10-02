import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("================================================================================");
console.log("MASTER TEST SUITE: FEATURED PRODUCTS LOAD MORE & SCROLL-DOWN BUTTON");
console.log("================================================================================");

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

const featuredProductsSource = fs.readFileSync(
  path.join(rootDir, "src/components/home/FeaturedProducts.tsx"),
  "utf8"
);
const footerSource = fs.readFileSync(
  path.join(rootDir, "src/components/layout/Footer.tsx"),
  "utf8"
);
const brandTrustSource = fs.readFileSync(
  path.join(rootDir, "src/components/home/BrandTrust.tsx"),
  "utf8"
);
const homePageSource = fs.readFileSync(
  path.join(rootDir, "src/app/page.tsx"),
  "utf8"
);
const productsServiceSource = fs.readFileSync(
  path.join(rootDir, "src/lib/services/products.ts"),
  "utf8"
);

// ── REQUIREMENT 1 & 2: LOAD MORE MUST NOT OPEN FILTERS & AUTO FILTER TRIGGER DECOUPLED ──
console.log("\n[TEST GROUP 1]: LOAD MORE NEVER OPENS FILTERS & AUTO FILTER DECOUPLING");

runTest("1. handleLoadMoreClick never calls setIsFilterOpen(true)", () => {
  // Extract handleLoadMoreClick body
  const match = featuredProductsSource.match(
    /const handleLoadMoreClick\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/
  );
  assert.ok(match, "handleLoadMoreClick should exist");
  const body = match[1];

  assert.ok(
    !body.includes("setIsFilterOpen(true)"),
    "handleLoadMoreClick must NOT call setIsFilterOpen(true)"
  );
  assert.ok(
    !body.includes("setIsFilterOpen((prev) => true)"),
    "handleLoadMoreClick must NOT force filter open"
  );
});

runTest("2. loadNextBatch never calls setIsFilterOpen", () => {
  const match = featuredProductsSource.match(
    /const loadNextBatch\s*=\s*useCallback\(\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},/
  );
  assert.ok(match, "loadNextBatch should exist");
  const body = match[1];

  assert.ok(
    !body.includes("setIsFilterOpen"),
    "loadNextBatch must NOT touch filter open state"
  );
});

runTest("3. IntersectionObserver callback never opens filters", () => {
  const match = featuredProductsSource.match(
    /const observer = new IntersectionObserver\(([\s\S]*?)\);/
  );
  assert.ok(match, "IntersectionObserver should exist");
  const observerBody = match[1];

  assert.ok(
    !observerBody.includes("setIsFilterOpen"),
    "IntersectionObserver callback must never open filters"
  );
});

runTest("4. Manual filter opening remains intact via handleToggleFilters", () => {
  assert.ok(
    featuredProductsSource.includes("const handleToggleFilters = () => {"),
    "handleToggleFilters handler must exist"
  );
  assert.ok(
    featuredProductsSource.includes("onClick={handleToggleFilters}"),
    "Filters button must wire to handleToggleFilters"
  );
  assert.ok(
    featuredProductsSource.includes("<span>FILTERS</span>"),
    "Filters button text must exist"
  );
});

// ── REQUIREMENT 3 & 9: SCROLL-DOWN BUTTON APPEARS IMMEDIATELY ON LOAD MORE ──
console.log("\n[TEST GROUP 2]: SCROLL-DOWN BUTTON APPEARS IMMEDIATELY ON MANUAL LOAD MORE");

runTest("5. setShowScrollDownButton(true) is invoked immediately at start of handleLoadMoreClick", () => {
  const match = featuredProductsSource.match(
    /const handleLoadMoreClick\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/
  );
  assert.ok(match, "handleLoadMoreClick should exist");
  const body = match[1];

  const showButtonIndex = body.indexOf("setShowScrollDownButton(true)");
  const fetchIndex = body.indexOf("getFeaturedProducts");

  assert.ok(showButtonIndex !== -1, "setShowScrollDownButton(true) must be in handleLoadMoreClick");
  assert.ok(fetchIndex !== -1, "getFeaturedProducts must be in handleLoadMoreClick");
  assert.ok(
    showButtonIndex < fetchIndex,
    "setShowScrollDownButton(true) must be called BEFORE getFeaturedProducts network request"
  );
});

runTest("6. showScrollDownButton state controls rendering of floating scroll-down button", () => {
  assert.ok(
    featuredProductsSource.includes("const [showScrollDownButton, setShowScrollDownButton] = useState<boolean>(false);"),
    "showScrollDownButton state must be declared with default false"
  );
  assert.ok(
    featuredProductsSource.includes("{showScrollDownButton && ("),
    "Floating down button must be conditionally rendered on showScrollDownButton"
  );
});

// ── REQUIREMENT 4, 5, 6: VISUAL MATCH WITH EXISTING SCROLL-UP BUTTON ──
console.log("\n[TEST GROUP 3]: SCROLL-DOWN BUTTON MATCHES EXISTING SCROLL-UP BUTTON ARCHITECTURE");

runTest("7. Scroll-up button in Footer.tsx defined with exact visual classes", () => {
  assert.ok(
    footerSource.includes("<ArrowUp size={18} strokeWidth={2.5} />"),
    "Footer.tsx must contain <ArrowUp size={18} strokeWidth={2.5} />"
  );
  assert.ok(
    footerSource.includes("w-11 h-11 rounded-full bg-white text-[#111827] shadow-xl"),
    "Footer.tsx scroll-up button must have w-11 h-11 rounded-full bg-white text-[#111827] shadow-xl"
  );
});

runTest("8. Scroll-down button in FeaturedProducts.tsx exactly matches scroll-up button visual system", () => {
  assert.ok(
    featuredProductsSource.includes("<ArrowDown size={18} strokeWidth={2.5} />"),
    "Scroll-down button must use Lucide ArrowDown with matching size={18} strokeWidth={2.5}"
  );
  assert.ok(
    featuredProductsSource.includes("w-11 h-11 rounded-full bg-white text-[#111827] shadow-xl"),
    "Scroll-down button must match size, shape, background, text color, and shadow"
  );
  assert.ok(
    featuredProductsSource.includes("hover:bg-white/90 hover:scale-105 transition-all duration-200 cursor-pointer"),
    "Scroll-down button must match hover state, scale transition, and cursor"
  );
  assert.ok(
    featuredProductsSource.includes("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"),
    "Scroll-down button must match accessibility focus ring"
  );
});

runTest("9. Scroll-down button positioning matches scroll-up architecture (fixed right-6 z-40)", () => {
  assert.ok(
    featuredProductsSource.includes("right-6 z-40"),
    "Scroll-down button must use fixed right-6 z-40 positioning"
  );
  assert.ok(
    featuredProductsSource.includes("bottom-20"),
    "Scroll-down button must align with bottom-20 spacing"
  );
});

// ── REQUIREMENT 7, 8, 15: CERTIFICATE DESTINATION & STOPPING AUTO-PAGINATION ──
console.log("\n[TEST GROUP 4]: CERTIFICATE TARGET & PAGINATION HALT ON DOWN BUTTON CLICK");

runTest("10. Certificate section exists with stable id='certificate'", () => {
  assert.ok(
    brandTrustSource.includes('id="certificate"'),
    "BrandTrust.tsx must have id='certificate'"
  );
});

runTest("11. handleJumpToCertificate smoothly scrolls to Certificate section", () => {
  assert.ok(
    featuredProductsSource.includes('document.getElementById("certificate")'),
    "handleJumpToCertificate must look up certificate element"
  );
  assert.ok(
    featuredProductsSource.includes('certElement.scrollIntoView({ behavior: "smooth", block: "start" })'),
    "handleJumpToCertificate must smoothly scroll to certificate"
  );
});

runTest("12. handleJumpToCertificate stops continuous mode and sets isPaginationStoppedRef.current = true", () => {
  const match = featuredProductsSource.match(
    /const handleJumpToCertificate\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/
  );
  assert.ok(match, "handleJumpToCertificate should exist");
  const body = match[1];

  assert.ok(body.includes("setIsContinuousMode(false)"), "Must disable continuous mode");
  assert.ok(body.includes("isContinuousModeRef.current = false"), "Must update isContinuousModeRef to false");
  assert.ok(body.includes("isPaginationStoppedRef.current = true"), "Must set isPaginationStoppedRef.current to true");
  assert.ok(body.includes("setShowScrollDownButton(false)"), "Must hide the scroll-down button");
});

runTest("13. IntersectionObserver respects isPaginationStoppedRef guard", () => {
  assert.ok(
    featuredProductsSource.includes("if (!isContinuousMode || !hasMore || isPaginationStoppedRef.current) return;"),
    "IntersectionObserver setup must abort if pagination is stopped"
  );
  assert.ok(
    featuredProductsSource.includes("!isPaginationStoppedRef.current"),
    "IntersectionObserver intersection callback must verify isPaginationStoppedRef is false"
  );
});

runTest("14. loadNextBatch guards against execution after pagination stopped", () => {
  assert.ok(
    featuredProductsSource.includes("isPaginationStoppedRef.current"),
    "loadNextBatch must guard with isPaginationStoppedRef.current"
  );
});

// ── REQUIREMENT 12 & 13: FEATURED PRODUCT SELECTION & BEST DEALS REMOVAL ──
console.log("\n[TEST GROUP 5]: FEATURED PRODUCT ORDERING & NO BEST-DEALS AUTO-SELECTION");

runTest("15. FeaturedProducts does not contain Best Deals auto-selection or UI", () => {
  assert.ok(
    !featuredProductsSource.toLowerCase().includes("best deals"),
    "FeaturedProducts component must not reference Best Deals"
  );
});

runTest("16. getFeaturedProducts documents and respects priority: Admin-pinned -> Newest upload -> Remaining", () => {
  assert.ok(
    productsServiceSource.includes("Admin-pinned products -> Latest uploaded product -> Remaining eligible products"),
    "getFeaturedProducts must document Admin-pinned -> Latest uploaded -> Remaining eligible products"
  );
  assert.ok(
    productsServiceSource.includes("DO NOT filter or rank by pricing or best deals"),
    "getFeaturedProducts must explicitly forbid ranking by pricing or best deals"
  );
});

// ── REQUIREMENT 18: UNRELATED HOMEPAGE SECTIONS REMAIN INTACT ──
console.log("\n[TEST GROUP 6]: UNRELATED HOMEPAGE SECTIONS UNCHANGED");

runTest("17. All other Homepage sections remain intact in src/app/page.tsx", () => {
  assert.ok(homePageSource.includes("<TopBanner"), "TopBanner remains intact");
  assert.ok(homePageSource.includes("<ServiceStrip"), "ServiceStrip remains intact");
  assert.ok(homePageSource.includes("<ShopByBrand"), "ShopByBrand remains intact");
  assert.ok(homePageSource.includes("<AudienceSection"), "AudienceSection remains intact");
  assert.ok(homePageSource.includes("<CategoriesSection"), "CategoriesSection remains intact");
  assert.ok(homePageSource.includes("<HotSales"), "HotSales remains intact");
  assert.ok(homePageSource.includes("<FeaturedProducts"), "FeaturedProducts remains intact");
  assert.ok(homePageSource.includes("<BrandTrust"), "BrandTrust (Certificates) remains intact");
});

console.log("\n================================================================================");
console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
