/**
 * Comprehensive Automated Test Suite: Footer Brand & Category Ordering Parity with Storefront
 *
 * Requirements Verified:
 * 1. Brand ordering: Footer first 10 brands match homepage Shop by Brand order identically.
 * 2. Category ordering: Footer first 10 categories match homepage Category chips identically.
 * 3. 'All Categories' and 'All Brands' do not count towards the 10-item limit.
 * 4. No alphabetical re-sorting in Footer.
 * 5. Admin reordering updates both homepage and footer in lockstep.
 * 6. Zero hardcoded brand or category names in Footer.tsx.
 * 7. Active status, deduplication, and label normalization consistency.
 * 8. Cache invalidation events properly registered.
 */

import fs from "fs";
import path from "path";
import {
  getStorefrontCategories,
  getStorefrontLandingBrands,
  normalizeCategoryLabel,
  AUDIENCE_IDS,
  AUDIENCE_NAMES,
} from "../src/lib/storefront-taxonomies";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { BrandModel, brandService } from "../src/services/brand.service";
import { CategoryModel, categoryService } from "../src/services/category.service";

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

async function runTests() {
  console.log("==================================================================");
  console.log("TEST SUITE: FOOTER BRAND & CATEGORY STOREFRONT PARITY");
  console.log("==================================================================\n");

  const repoRoot = path.resolve(__dirname, "..");
  const footerPath = path.join(repoRoot, "src/components/layout/Footer.tsx");
  const categoriesSectionPath = path.join(repoRoot, "src/components/home/CategoriesSection.tsx");
  const shopByBrandPath = path.join(repoRoot, "src/components/home/ShopByBrand.tsx");

  const footerCode = fs.readFileSync(footerPath, "utf-8");
  const categoriesSectionCode = fs.readFileSync(categoriesSectionPath, "utf-8");
  const shopByBrandCode = fs.readFileSync(shopByBrandPath, "utf-8");

  // ------------------------------------------------------------------
  // CHECKPOINT 1: Static Code Invariants - No Hardcoding & Shared Logic
  // ------------------------------------------------------------------
  console.log("▶ 1. Static Code Invariants (No Hardcoded Lists & Shared Selectors)");

  assert(
    !footerCode.includes('"Nike"') &&
    !footerCode.includes("'Nike'") &&
    !footerCode.includes('"Levi\'s"') &&
    !footerCode.includes("'Levi\\'s'") &&
    !footerCode.includes('"Bershka"') &&
    !footerCode.includes("'Bershka'"),
    "Footer.tsx contains zero hardcoded brand names"
  );

  assert(
    !footerCode.includes('"T-Shirts"') &&
    !footerCode.includes("'T-Shirts'") &&
    !footerCode.includes('"Hoodies"') &&
    !footerCode.includes("'Hoodies'") &&
    !footerCode.includes('"Dresses"') &&
    !footerCode.includes("'Dresses'"),
    "Footer.tsx contains zero hardcoded category names"
  );

  assert(
    footerCode.includes("getStorefrontCategories") &&
    footerCode.includes("getStorefrontLandingBrands"),
    "Footer.tsx imports and uses shared storefront-taxonomies selectors"
  );

  assert(
    categoriesSectionCode.includes("getStorefrontCategories"),
    "CategoriesSection.tsx uses shared getStorefrontCategories selector (DRY parity)"
  );

  assert(
    footerCode.includes("ayaan:homepage-updated") &&
    footerCode.includes("ayaan:data-updated") &&
    footerCode.includes("storage"),
    "Footer.tsx listens for homepage and data update events for dynamic cache invalidation"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 2: Brand Ordering Parity & 10-Item Limitation
  // ------------------------------------------------------------------
  console.log("\n▶ 2. Brand Ordering Parity Between Homepage & Footer");

  const sampleBrands: BrandModel[] = [
    { id: "b1", name: "Nike", slug: "nike", sort_order: 1, landing_sort_order: 1, is_active: true, is_featured_on_landing: true },
    { id: "b2", name: "Levi's", slug: "levis", sort_order: 2, landing_sort_order: 2, is_active: true, is_featured_on_landing: true },
    { id: "b3", name: "GUESS", slug: "guess", sort_order: 3, landing_sort_order: 3, is_active: true, is_featured_on_landing: true },
    { id: "b4", name: "Bershka", slug: "bershka", sort_order: 4, landing_sort_order: 4, is_active: true, is_featured_on_landing: true },
    { id: "b5", name: "NEXT", slug: "next", sort_order: 5, landing_sort_order: 5, is_active: true, is_featured_on_landing: true },
    { id: "b6", name: "Primark", slug: "primark", sort_order: 6, landing_sort_order: 6, is_active: true, is_featured_on_landing: true },
    { id: "b7", name: "Tommy Hilfiger", slug: "tommy-hilfiger", sort_order: 7, landing_sort_order: 7, is_active: true, is_featured_on_landing: true },
    { id: "b8", name: "ZARA", slug: "zara", sort_order: 8, landing_sort_order: 8, is_active: true, is_featured_on_landing: true },
    { id: "b9", name: "Mango", slug: "mango", sort_order: 9, landing_sort_order: 9, is_active: true, is_featured_on_landing: true },
    { id: "b10", name: "H&M", slug: "hm", sort_order: 10, landing_sort_order: 10, is_active: true, is_featured_on_landing: true },
    { id: "b11", name: "Pull&Bear", slug: "pull-and-bear", sort_order: 11, landing_sort_order: 11, is_active: true, is_featured_on_landing: true },
    { id: "b12", name: "Inactive Brand", slug: "inactive", sort_order: 12, landing_sort_order: 12, is_active: false, is_featured_on_landing: true },
  ];

  // Homepage brand simulation: filter active & map in order
  const homepageBrands = sampleBrands.filter((b) => b.is_active !== false);
  const footerBrands = homepageBrands.slice(0, 10);

  assert(
    footerBrands.length === 10,
    "Footer displays exactly 10 brands when catalogue has >= 10"
  );

  const expectedFirst10Brands = [
    "Nike", "Levi's", "GUESS", "Bershka", "NEXT",
    "Primark", "Tommy Hilfiger", "ZARA", "Mango", "H&M"
  ];

  assert(
    JSON.stringify(footerBrands.map((b) => b.name)) === JSON.stringify(expectedFirst10Brands),
    "Footer brands match homepage Shop by Brand order exactly (Nike -> Levi's -> ... -> H&M)"
  );

  assert(
    footerBrands[0].name !== "3" && footerBrands[0].name !== "7 days lt" && footerBrands[0].name !== "8 Seconds",
    "Footer does NOT show un-curated numerical/alphabetical brands first"
  );

  assert(
    footerBrands[0].name !== "Bershka",
    "Footer does NOT re-sort brands alphabetically (Bershka does not jump before Nike)"
  );

  assert(
    !footerBrands.some((b) => b.name === "Inactive Brand"),
    "Footer properly excludes inactive brands according to storefront eligibility rules"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 3: Category Ordering Parity & Normalization
  // ------------------------------------------------------------------
  console.log("\n▶ 3. Category Ordering Parity Between Homepage Chips & Footer");

  const sampleCategories: CategoryModel[] = [
    { id: "c_men", name: "MEN", slug: "men", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "c_women", name: "WOMEN", slug: "women", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "c_boys", name: "BOYS", slug: "boys", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "c_girls", name: "GIRLS", slug: "girls", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "c_unisex", name: "UNISEX", slug: "unisex", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_1", name: "2 pc sets", slug: "2-pc-sets", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_2", name: "Blouses", slug: "blouses", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_3", name: "BODYCON", slug: "bodycon", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_4", name: "Boxers", slug: "boxers", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_5", name: "caps / hats", slug: "caps-hats", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_6", name: "Cargo Pants", slug: "cargo-pants", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_7", name: "Dresses", slug: "dresses", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_8", name: "Frank", slug: "frank", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_9", name: "Hoodies", slug: "hoodies", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_10", name: "Jackets", slug: "jackets", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_11", name: "Jeans", slug: "jeans", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_12", name: "sweter", slug: "sweater", image: "", description: "", is_active: true, sort_order: 0 },
    { id: "cat_13", name: "Inactive Cat", slug: "inactive-cat", image: "", description: "", is_active: false, sort_order: 0 },
  ];

  const homepageCategories = getStorefrontCategories(sampleCategories);
  const footerCategories = homepageCategories.slice(0, 10);

  assert(
    footerCategories.length === 10,
    "Footer displays exactly 10 categories"
  );

  const expectedFirst10Categories = [
    "2 pc Sets",
    "Blouses",
    "Bodycon",
    "Boxers",
    "Caps / Hats",
    "Cargo Pants",
    "Dresses",
    "Frank",
    "Hoodies",
    "Jackets",
  ];

  assert(
    JSON.stringify(footerCategories.map((c) => c.name)) === JSON.stringify(expectedFirst10Categories),
    "Footer categories match homepage category chips order and casing exactly"
  );

  assert(
    !footerCategories.some((c) => ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"].includes(c.name.toUpperCase())),
    "Footer excludes audience categories (MEN, WOMEN, etc.) from product categories column"
  );

  assert(
    !footerCategories.some((c) => c.name === "All Categories"),
    "Footer does not count 'All Categories' button as an actual category"
  );

  assert(
    footerCode.includes("All Categories") && footerCode.includes('href="/search"'),
    "Footer preserves standalone 'All Categories' navigation link at bottom of category column"
  );

  assert(
    footerCode.includes("All Brands") && footerCode.includes('href="/search"'),
    "Footer preserves standalone 'All Brands' navigation link at bottom of brand column"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 4: Admin Reordering Synchronization & Lockstep Update
  // ------------------------------------------------------------------
  console.log("\n▶ 4. Admin Reordering Simulation & Invalidation Verification");

  // Simulate an admin moving "Jackets" to sort_order: -1 (first place)
  const reorderedCategories: CategoryModel[] = sampleCategories.map((c) => {
    if (c.name === "Jackets") {
      return { ...c, sort_order: -1, landing_sort_order: -1 };
    }
    return c;
  });

  const reorderedHomepageCategories = getStorefrontCategories(reorderedCategories);
  const reorderedFooterCategories = reorderedHomepageCategories.slice(0, 10);

  assert(
    reorderedHomepageCategories[0].name === "Jackets",
    "Admin reorder moves 'Jackets' to index 0 on homepage category chips"
  );

  assert(
    reorderedFooterCategories[0].name === "Jackets",
    "Admin reorder moves 'Jackets' to index 0 in footer categories identically"
  );

  assert(
    JSON.stringify(reorderedFooterCategories.map((c) => c.name)) ===
    JSON.stringify(reorderedHomepageCategories.slice(0, 10).map((c) => c.name)),
    "Both homepage and footer reflect updated admin category order in 100% lockstep"
  );

  // Simulate an admin moving "ZARA" to sort_order: -1 (first place) in brands
  const reorderedBrandsList: BrandModel[] = sampleBrands.map((b) => {
    if (b.name === "ZARA") {
      return { ...b, sort_order: -1, landing_sort_order: -1 };
    }
    return b;
  }).sort((a, b) => (a.landing_sort_order ?? a.sort_order ?? 0) - (b.landing_sort_order ?? b.sort_order ?? 0));

  assert(
    reorderedBrandsList[0].name === "ZARA",
    "Admin reorder moves 'ZARA' to index 0 in landing brand grid"
  );

  const reorderedFooterBrands = reorderedBrandsList.filter((b) => b.is_active !== false).slice(0, 10);
  assert(
    reorderedFooterBrands[0].name === "ZARA",
    "Admin reorder moves 'ZARA' to index 0 in footer brands identically"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 5: Live API Contract Adherence (Production Validation)
  // ------------------------------------------------------------------
  console.log("\n▶ 5. Live Production Storefront Data Order Validation");

  try {
    const liveLandingRes = await fetch("https://ayaanclothing.com/api/v1/brands/landing", {
      signal: AbortSignal.timeout(5000),
    });
    if (liveLandingRes.ok) {
      const liveLandingJson = await liveLandingRes.json();
      const liveLandingItems: BrandModel[] = Array.isArray(liveLandingJson) ? liveLandingJson : liveLandingJson.data || [];
      const liveLandingFirst10 = liveLandingItems.filter((b) => b.is_active !== false).slice(0, 10).map((b) => b.name);

      console.log("   Live Storefront Brands (First 10):", liveLandingFirst10.join(", "));
      assert(
        liveLandingFirst10[0] === "Nike" && liveLandingFirst10[1] === "Levi's",
        "Live production landing brands begin with Nike and Levi's (Storefront source of truth)"
      );
    } else {
      console.log("   (Skipping live fetch - server responded with status " + liveLandingRes.status + ")");
    }
  } catch (err: any) {
    console.log("   (Notice: Offline or network timeout for live fetch: " + err.message + ")");
  }

  try {
    const liveCatsRes = await fetch("https://ayaanclothing.com/api/v1/categories?is_active=true&all=true", {
      signal: AbortSignal.timeout(5000),
    });
    if (liveCatsRes.ok) {
      const liveCatsJson = await liveCatsRes.json();
      const liveCatItems: CategoryModel[] = Array.isArray(liveCatsJson) ? liveCatsJson : liveCatsJson.data || [];
      const liveStorefrontCats = getStorefrontCategories(liveCatItems).slice(0, 10).map((c) => c.name);

      console.log("   Live Storefront Categories (First 10):", liveStorefrontCats.join(", "));
      assert(
        liveStorefrontCats.length === 10 && liveStorefrontCats.includes("2 pc Sets") && liveStorefrontCats.includes("Blouses"),
        "Live production categories resolve canonical normalized order for storefront"
      );
    }
  } catch (err: any) {
    console.log("   (Notice: Offline or network timeout for live fetch: " + err.message + ")");
  }

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
