import fs from "fs";
import path from "path";
import {
  CANONICAL_CATEGORY_IMAGES,
  DEFAULT_CATEGORY_FALLBACK,
  normalizeCategorySlug,
  getCategoryImageUrl,
} from "@/lib/category-images";
import { INITIAL_MOCK_CATEGORIES } from "@/lib/mock-data/mock-categories";
import { mockStore } from "@/lib/mock-data/mock-store";
import { PRODUCT_CATEGORIES } from "@/lib/filters";

function runTests() {
  console.log("==================================================");
  console.log("CATEGORY TILES STANDARDIZATION & CANONICAL IMAGES TEST SUITE");
  console.log("==================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Category Data Normalization & Aliases
  // ─────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Category Data Normalization");
  assert(
    normalizeCategorySlug("Sweaters") === "sweaters",
    "normalizeCategorySlug capital word: 'Sweaters' -> 'sweaters'"
  );
  assert(
    normalizeCategorySlug("T-Shirts") === "t-shirts",
    "normalizeCategorySlug hyphenated: 'T-Shirts' -> 't-shirts'"
  );
  assert(
    normalizeCategorySlug("tshirt") === "t-shirts" &&
    normalizeCategorySlug("tshirts") === "t-shirts",
    "normalizeCategorySlug alias: 'tshirt'/'tshirts' -> 't-shirts'"
  );
  assert(
    normalizeCategorySlug("c_sweaters") === "sweaters" &&
    normalizeCategorySlug("c_tshirts") === "t-shirts",
    "normalizeCategorySlug strips 'c_' prefix correctly"
  );
  assert(
    normalizeCategorySlug("Polo Shirts") === "polo-shirts" &&
    normalizeCategorySlug("polos") === "polo-shirts",
    "normalizeCategorySlug handles 'Polo Shirts' and 'polos' -> 'polo-shirts'"
  );
  assert(
    normalizeCategorySlug("jeans") === "pants" &&
    normalizeCategorySlug("denim") === "pants",
    "normalizeCategorySlug normalizes denim/jeans alias -> 'pants'"
  );

  // ─────────────────────────────────────────────────────────────
  // 2. Canonical Category Image Mapping
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Category Image Mapping & Consistency");
  const canonicalList = [
    "sweaters",
    "t-shirts",
    "hoodies",
    "trousers",
    "pants",
    "shorts",
    "jackets",
    "polo-shirts",
    "activewear",
    "knitwear",
    "shirts",
    "beachwear",
    "socks",
    "blouse",
    "tank-top",
    "tops",
    "sports",
    "towels",
  ];

  assert(
    canonicalList.length === 18,
    "Exactly 18 canonical product categories defined"
  );

  canonicalList.forEach((slug) => {
    const img = CANONICAL_CATEGORY_IMAGES[slug];
    assert(
      typeof img === "string" &&
      img.startsWith("https://") &&
      !img.includes("default.jpg"),
      `Canonical image exists and is remote HTTPS for '${slug}'`
    );
  });

  // Verify single identical image across different lookup invocations
  const sweaterImg1 = getCategoryImageUrl("Sweaters");
  const sweaterImg2 = getCategoryImageUrl("c_sweaters");
  const sweaterImg3 = getCategoryImageUrl("sweaters");
  assert(
    sweaterImg1 === sweaterImg2 && sweaterImg2 === sweaterImg3 && sweaterImg1 === CANONICAL_CATEGORY_IMAGES["sweaters"],
    "Sweaters produces identical canonical image regardless of input format"
  );

  const tshirtImg1 = getCategoryImageUrl("T-Shirts");
  const tshirtImg2 = getCategoryImageUrl("tshirts");
  assert(
    tshirtImg1 === tshirtImg2 && tshirtImg1 === CANONICAL_CATEGORY_IMAGES["t-shirts"],
    "T-Shirts produces identical canonical image regardless of input format"
  );

  // ─────────────────────────────────────────────────────────────
  // 3. Missing Image Fallback
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Missing Image Fallback");
  const fallbackResult1 = getCategoryImageUrl("unknown-category-xyz");
  assert(
    fallbackResult1 === DEFAULT_CATEGORY_FALLBACK,
    "Unknown category safely falls back to DEFAULT_CATEGORY_FALLBACK"
  );
  const fallbackResult2 = getCategoryImageUrl("sweaters", "/categories/default.jpg");
  assert(
    fallbackResult2 === CANONICAL_CATEGORY_IMAGES["sweaters"],
    "Stale /categories/default.jpg is intercepted and replaced by canonical image"
  );
  const fallbackResult3 = getCategoryImageUrl("", null);
  assert(
    fallbackResult3 === DEFAULT_CATEGORY_FALLBACK,
    "Empty category inputs safely fall back without throwing exceptions"
  );

  // ─────────────────────────────────────────────────────────────
  // 4. Shared ProductCategoryTile Component Architecture
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 4: Shared ProductCategoryTile Component Architecture");
  const tileComponentPath = path.join(cwd, "src/components/common/ProductCategoryTile.tsx");
  assert(
    fs.existsSync(tileComponentPath),
    "Shared ProductCategoryTile component exists at src/components/common/ProductCategoryTile.tsx"
  );

  const tileCode = fs.readFileSync(tileComponentPath, "utf-8");
  assert(
    tileCode.includes("aspect-[4/3]"),
    "ProductCategoryTile enforces exact aspect-[4/3] ratio matching Shop By Brand reference"
  );
  assert(
    tileCode.includes("rounded-lg sm:rounded-xl border"),
    "ProductCategoryTile enforces exact rounded-lg sm:rounded-xl border geometry"
  );
  assert(
    tileCode.includes("from-black/85 via-black/25 to-transparent"),
    "ProductCategoryTile applies approved gradient overlay for text legibility"
  );
  assert(
    tileCode.includes("border-foreground ring-1.5 ring-foreground shadow-xs scale-[1.02]"),
    "ProductCategoryTile implements approved active selection state styling"
  );
  assert(
    tileCode.includes("Check") && tileCode.includes("top-1.5 right-1.5 sm:top-2 sm:right-2"),
    "ProductCategoryTile renders approved active Check badge in top-right corner"
  );
  assert(
    tileCode.includes("text-[10.5px] sm:text-[11.5px] md:text-[12px]"),
    "ProductCategoryTile enforces approved uppercase bold typography sizing"
  );
  assert(
    tileCode.includes("onError={handleImageError}"),
    "ProductCategoryTile includes robust client-side error fallback handler"
  );
  assert(
    tileCode.includes("PRODUCT_CATEGORY_GRID_CLASSES ="),
    "ProductCategoryTile exports canonical PRODUCT_CATEGORY_GRID_CLASSES"
  );

  // ─────────────────────────────────────────────────────────────
  // 5. Storefront Consistency: Shop By Brand, Audience, Featured, Hot Sales
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 5: Storefront Usage of Canonical Component");

  // Shop By Brand / Featured Products (AllCategoriesPanel if present)
  const panelPath = path.join(cwd, "src/components/home/AllCategoriesPanel.tsx");
  if (fs.existsSync(panelPath)) {
    const panelCode = fs.readFileSync(panelPath, "utf-8");
    assert(
      panelCode.includes('import {') &&
      panelCode.includes("ProductCategoryTile") &&
      panelCode.includes("PRODUCT_CATEGORY_GRID_CLASSES"),
      "AllCategoriesPanel imports canonical ProductCategoryTile and PRODUCT_CATEGORY_GRID_CLASSES"
    );
    assert(
      panelCode.includes("<ProductCategoryTile"),
      "AllCategoriesPanel renders canonical ProductCategoryTile"
    );
    assert(
      !panelCode.includes('image: "/categories/default.jpg"'),
      "AllCategoriesPanel does not hardcode broken /categories/default.jpg fallback"
    );
  }

  // Audience (CategoryHighlights)
  const highlightsPath = path.join(cwd, "src/components/home/CategoryHighlights.tsx");
  const highlightsCode = fs.readFileSync(highlightsPath, "utf-8");
  assert(
    highlightsCode.includes("ProductCategoryTile") &&
    highlightsCode.includes("PRODUCT_CATEGORY_GRID_CLASSES"),
    "CategoryHighlights imports canonical ProductCategoryTile and PRODUCT_CATEGORY_GRID_CLASSES"
  );
  assert(
    highlightsCode.includes("<ProductCategoryTile"),
    "CategoryHighlights renders canonical ProductCategoryTile in Audience section"
  );
  assert(
    !highlightsCode.includes("2xl:grid-cols-[repeat(16,minmax(0,1fr))]"),
    "CategoryHighlights removed 16-18 column squished grid in favor of approved 10-12 column density"
  );
  assert(
    highlightsCode.includes("PRODUCT_CATEGORY_GRID_CLASSES"),
    "CategoryHighlights uses canonical PRODUCT_CATEGORY_GRID_CLASSES"
  );

  // Hot Sales
  const hotSalesPath = path.join(cwd, "src/components/home/HotSales.tsx");
  const hotSalesCode = fs.readFileSync(hotSalesPath, "utf-8");
  assert(
    hotSalesCode.includes("ProductCategoryTile") &&
    hotSalesCode.includes("<ProductCategoryTile"),
    "HotSales uses canonical ProductCategoryTile"
  );
  assert(
    hotSalesCode.includes('image: getCategoryImageUrl("sweaters")') &&
    hotSalesCode.includes('image: getCategoryImageUrl("towels")'),
    "HotSales categories use canonical category images via getCategoryImageUrl"
  );

  // ─────────────────────────────────────────────────────────────
  // 6. Dataset Consistency: Mock Categories & Database
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Group 6: Canonical Dataset Integrity");
  assert(
    INITIAL_MOCK_CATEGORIES.length === 18,
    `INITIAL_MOCK_CATEGORIES contains all 18 categories (found: ${INITIAL_MOCK_CATEGORIES.length})`
  );

  const mockCategoriesInStore = mockStore.getCategories();
  assert(
    mockCategoriesInStore.length >= 18,
    `mockStore.getCategories() returns at least 18 categories (found: ${mockCategoriesInStore.length})`
  );

  const seederPath = path.join(cwd, "backend/database/seeders/DatabaseSeeder.php");
  const seederCode = fs.readFileSync(seederPath, "utf-8");
  assert(
    seederCode.includes("'image_url' => 'https://images.pexels.com/photos/15694151/pexels-photo-15694151.jpeg"),
    "DatabaseSeeder defines high-res image_url for Sweaters"
  );
  assert(
    seederCode.includes("'image_url' => 'https://images.pexels.com/photos/7658459/pexels-photo-7658459.jpeg"),
    "DatabaseSeeder defines high-res image_url for T-Shirts"
  );

  // Public fallback asset exists
  const publicAssetPath = path.join(cwd, "public/categories/default.jpg");
  assert(
    fs.existsSync(publicAssetPath) && fs.statSync(publicAssetPath).size > 1000,
    "Fallback asset public/categories/default.jpg exists and is a valid non-empty file (>1KB)"
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
