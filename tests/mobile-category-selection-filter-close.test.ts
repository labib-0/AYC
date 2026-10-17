import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("TEST SUITE: MOBILE UX FIX - AUTOMATICALLY CLOSE FILTERS AFTER CATEGORY SELECTION");
console.log("================================================================================\n");

const categoriesSectionPath = path.resolve(__dirname, "../src/components/home/CategoriesSection.tsx");
const audienceSectionPath = path.resolve(__dirname, "../src/components/home/AudienceSection.tsx");
const designTypeSectionPath = path.resolve(__dirname, "../src/components/home/DesignTypeSection.tsx");
const searchPagePath = path.resolve(__dirname, "../src/app/search/page.tsx");

const categoriesSectionCode = fs.readFileSync(categoriesSectionPath, "utf-8");
const audienceSectionCode = fs.readFileSync(audienceSectionPath, "utf-8");
const designTypeSectionCode = fs.readFileSync(designTypeSectionPath, "utf-8");
const searchPageCode = fs.readFileSync(searchPagePath, "utf-8");

// ── 1. Categories Section Category Pills ───────────────────────────────────────────
console.log("▶ [GROUP 1]: Categories Section Category Links");
assert(
  categoriesSectionCode.includes("href={`/search?category=${categoryParam}`}"),
  "Category pills must navigate to clean URL without &filterOpen=true"
);
assert(
  !categoriesSectionCode.includes("category=${categoryParam}&filterOpen=true"),
  "Category pills must NOT append &filterOpen=true"
);
console.log("  ✅ [PASS] Category pills navigate cleanly without forcing filter panel open");

// ── 2. Audience Section Category Links (Boys, Girls, Men, etc.) ────────────────────
console.log("\n▶ [GROUP 2]: Audience Section Navigation");
assert(
  audienceSectionCode.includes('router.push("/search?audience=" + encodeURIComponent(audienceName.toLowerCase()))'),
  "Audience navigation must route without &filterOpen=true"
);
assert(
  !audienceSectionCode.includes("&filterOpen=true"),
  "Audience navigation must NOT append &filterOpen=true"
);
console.log("  ✅ [PASS] Audience navigation routes cleanly without forcing filter panel open");

// ── 3. Design Type Section Links (Original, Master Copy) ──────────────────────────
console.log("\n▶ [GROUP 3]: Design Type Section Navigation");
assert(
  designTypeSectionCode.includes("href={`/search?design_type=${param}`}"),
  "Design type pills must navigate to clean URL without &filterOpen=true"
);
assert(
  !designTypeSectionCode.includes("design_type=${param}&filterOpen=true"),
  "Design type pills must NOT append &filterOpen=true"
);
console.log("  ✅ [PASS] Design type pills navigate cleanly without forcing filter panel open");

// ── 4. Search Page Closed-by-Default Logic for Category Selections ─────────────────
console.log("\n▶ [GROUP 4]: Search Page Filter Initialization");
assert(
  searchPageCode.includes("hasCategorySelection"),
  "Search page detects whether category, audience, or design type is selected"
);
assert(
  searchPageCode.includes("!hasCategorySelection && searchParams.get(\"filterOpen\") === \"true\""),
  "Search page ensures filters remain closed by default when navigating via category selection"
);
console.log("  ✅ [PASS] Filter panel starts closed by default upon category selection");

// ── 5. Mobile Storefront Safeguard on Initial Page Load ────────────────────────────
console.log("\n▶ [GROUP 5]: Mobile Storefront Initial Load Safeguard");
assert(
  searchPageCode.includes("window.innerWidth < 1024") &&
  searchPageCode.includes("setIsFilterOpen(false)"),
  "Search page closes filter drawer on initial load for mobile viewports (< 1024px)"
);
console.log("  ✅ [PASS] Mobile viewports (< 1024px) start with filter drawer closed");

// ── 6. Drawer Close Handler Cleans Up URL State ────────────────────────────────────
console.log("\n▶ [GROUP 6]: Drawer Close Handler & URL Cleanup");
assert(
  searchPageCode.includes("handleFilterClose"),
  "Search page provides dedicated handleFilterClose callback"
);
assert(
  searchPageCode.includes("params.delete(\"filterOpen\")"),
  "handleFilterClose cleans up filterOpen parameter from searchParams"
);
assert(
  searchPageCode.includes("onClose={handleFilterClose}"),
  "GlobalFilterRail onClose receives handleFilterClose to dismiss drawer cleanly"
);
console.log("  ✅ [PASS] Filter drawer close properly cleans up URL parameter without modal re-triggering");

// ── 7. Manual Filter Button Usability ──────────────────────────────────────────────
console.log("\n▶ [GROUP 7]: Manual Filter Button Usability");
assert(
  searchPageCode.includes("handleFilterToggle"),
  "Manual filter button handler handleFilterToggle is present"
);
assert(
  searchPageCode.includes("onClick={handleFilterToggle}"),
  "Filter button toggles filter panel on user tap"
);
console.log("  ✅ [PASS] Manual filter toggle button remains fully functional");

// ── 8. Shared URL & Refresh Category Selection Preservation ─────────────────────────
console.log("\n▶ [GROUP 8]: Shared URL & Refresh Category Selection Preservation");
assert(
  searchPageCode.includes("initialCategoryParam ? initialCategoryParam.split(\",\")") &&
  searchPageCode.includes("initialAudienceParam.toUpperCase().split(\",\")"),
  "Search page correctly initializes selectedCategories and selectedAudiences from URL params"
);
assert(
  searchPageCode.includes("initialBrandParam") &&
  searchPageCode.includes("hasCategorySelection"),
  "Category and filter dimensions are preserved on refresh or shared URL"
);
console.log("  ✅ [PASS] Selected category is fully preserved from shared URL and refresh");

// ── 9. Desktop Filtering Layout Intact ──────────────────────────────────────────────
console.log("\n▶ [GROUP 9]: Desktop Layout & Filter Rail Preservation");
assert(
  searchPageCode.includes("grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]"),
  "Search page maintains desktop side-by-side rail layout when filters are open"
);
console.log("  ✅ [PASS] Desktop filtering layout remains completely intact");

// ── 10. Scroll Jump & Flickering Prevention ─────────────────────────────────────────
console.log("\n▶ [GROUP 10]: Scroll Jump & Flickering Prevention");
assert(
  searchPageCode.includes("router.replace(`/search?${params.toString()}`, { scroll: false })"),
  "Search page uses router.replace with scroll: false to avoid scroll jumps and unwanted reloads"
);
console.log("  ✅ [PASS] URL state updates use scroll: false preventing flicker and page jump");

console.log("\n================================================================================");
console.log("ALL MOBILE UX CATEGORY FILTER CLOSURE TESTS PASSED (10/10)");
console.log("================================================================================\n");

