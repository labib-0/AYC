import fs from "fs";
import path from "path";

async function runGlobalProductGridStandardTests() {
  console.log("==================================================");
  console.log("GLOBAL PRODUCT GRID & IMAGE RATIO STANDARD TESTS");
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
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  function readCode(relPath: string): string {
    return fs.readFileSync(path.join(cwd, relPath), "utf-8");
  }

  // A. ProductImageFrame uses 3:4
  console.log("▶ [Item A] ProductImageFrame uses 3:4");
  const commonFrame = readCode("src/components/common/ProductImageFrame.tsx");
  const productFrame = readCode("src/components/product/ProductImageFrame.tsx");
  assert(
    commonFrame.includes('aspect-[3/4]') &&
    commonFrame.includes('aspectRatio: "3 / 4"') &&
    commonFrame.includes('data-aspect-ratio="3:4"'),
    "A1: ProductImageFrame defines canonical 3:4 aspect ratio in container style and classes"
  );
  assert(
    commonFrame.includes("object-contain"),
    "A2: ProductImageFrame uses non-destructive object-contain to avoid cropping"
  );
  assert(
    productFrame.includes("from \"../common/ProductImageFrame\"") || productFrame.includes("from '@/components/common/ProductImageFrame'"),
    "A3: Canonical ProductImageFrame is correctly re-exported under src/components/product/"
  );

  // B. Product card uses 3:4
  console.log("\n▶ [Item B] Product card uses 3:4");
  const productCard = readCode("src/components/product/ProductCard.tsx");
  const productCardSkeleton = readCode("src/components/product/ProductCardSkeleton.tsx");
  assert(
    productCard.includes("aspect-[3/4]") && !productCard.includes("aspect-[4/5]"),
    "B1: ProductCard uses aspect-[3/4] and has removed aspect-[4/5]"
  );
  assert(
    productCard.includes("<ProductImageFrame") || productCard.includes("ProductImageFrame"),
    "B2: ProductCard delegates rendering to canonical ProductImageFrame"
  );
  assert(
    productCardSkeleton.includes("aspect-[3/4]") && !productCardSkeleton.includes("aspect-[4/5]"),
    "B3: ProductCardSkeleton uses aspect-[3/4] placeholder frame"
  );

  // C. Product Detail main image uses 4:5
  console.log("\n▶ [Item C] Product Detail main image uses 4:5");
  const productGallery = readCode("src/components/product/ProductGallery.tsx");
  assert(
    productGallery.includes("aspect-[4/5]") && !productGallery.includes("aspect-[3/4]"),
    "C1: Product Detail main image frame uses aspect-[4/5]"
  );
  assert(
    productGallery.includes("object-contain"),
    "C2: Product Detail main image preserves non-destructive object-contain"
  );
  assert(
    productGallery.includes("currentIndex") && (productGallery.includes("isLightboxOpen") || productGallery.includes("openLightbox")),
    "C3: Product Detail gallery interactive state and lightbox triggers remain intact"
  );

  // D. Product Detail thumbnails use 4:5
  console.log("\n▶ [Item D] Product Detail thumbnails use 4:5");
  assert(
    productGallery.includes("aspect-[4/5]") && productGallery.includes("thumbSizeClass"),
    "D1: Product Detail thumbnails on both vertical and horizontal strips use aspect-[4/5]"
  );
  assert(
    productGallery.includes("setIndex(idx)") && productGallery.includes("mediaMode"),
    "D2: Product Detail thumbnail click and selection handlers are preserved"
  );

  // E. Normal desktop grid = 6 columns
  console.log("\n▶ [Item E] Normal desktop grid = 6 columns");
  const featured = readCode("src/components/home/FeaturedProducts.tsx");
  const hotSales = readCode("src/components/home/HotSales.tsx");
  const shopByBrand = readCode("src/components/home/ShopByBrand.tsx");
  const searchPage = readCode("src/app/search/page.tsx");

  assert(
    featured.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "E1: FeaturedProducts normal desktop grid uses 6 columns"
  );
  assert(
    hotSales.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "E2: HotSales normal desktop grid uses 6 columns"
  );
  assert(
    shopByBrand.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "E3: ShopByBrand normal desktop grid uses 6 columns"
  );
  assert(
    searchPage.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "E4: Search results normal desktop grid uses 6 columns"
  );

  // F. Filter rail open = 5 columns
  console.log("\n▶ [Item F] Filter rail open = 5 columns");
  assert(
    featured.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5"),
    "F1: FeaturedProducts grid adapts to 5 columns when filter rail is open"
  );
  assert(
    hotSales.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5"),
    "F2: HotSales grid adapts to 5 columns when filter rail is open"
  );
  assert(
    shopByBrand.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5"),
    "F3: ShopByBrand grid adapts to 5 columns when filter rail is open"
  );
  assert(
    searchPage.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5"),
    "F4: Search page grid adapts to 5 columns when filter rail is open"
  );

  // G. Filter rail close = 6 columns
  console.log("\n▶ [Item G] Filter rail close = 6 columns");
  assert(
    featured.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5") &&
    featured.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "G1: FeaturedProducts toggles cleanly between 5 columns (open) and 6 columns (closed)"
  );
  assert(
    hotSales.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5") &&
    hotSales.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "G2: HotSales toggles cleanly between 5 columns (open) and 6 columns (closed)"
  );
  assert(
    shopByBrand.includes("min-[1440px]:grid-cols-5 2xl:grid-cols-5") &&
    shopByBrand.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
    "G3: ShopByBrand toggles cleanly between 5 columns (open) and 6 columns (closed)"
  );

  // H. Homepage product explorers follow same rule
  console.log("\n▶ [Item H] Homepage product explorers follow same rule");
  assert(
    featured.includes("INITIAL_PRODUCT_LIMIT = 21"),
    "H1: FeaturedProducts enforces max 21 initial products"
  );
  assert(
    hotSales.includes("INITIAL_PRODUCT_LIMIT = 21"),
    "H2: HotSales enforces max 21 initial products"
  );
  assert(
    featured.includes("setIsContinuousMode(true)") && featured.includes("setIsFilterOpen(true)"),
    "H3: FeaturedProducts first Load More activates auto-pagination, opens filter rail, and density changes"
  );
  assert(
    hotSales.includes("setIsContinuousMode(true)") && hotSales.includes("setIsFilterOpen(true)"),
    "H4: HotSales first Load More activates auto-pagination, opens filter rail, and density changes"
  );

  // I. No duplicate/conflicting product-image ratio remains
  console.log("\n▶ [Item I] No duplicate/conflicting product-image ratio remains");
  const globals = readCode("src/app/globals.css");
  assert(
    globals.includes("--product-image-ratio: 3 / 4;"),
    "I1: globals.css sets --product-image-ratio: 3 / 4;"
  );
  assert(
    !globals.includes("--product-image-ratio: 4 / 5;"),
    "I2: globals.css has no legacy 4 / 5 token"
  );

  // Check that no aspect-[4/5] remains anywhere in src/
  function scanDir(dir: string): string[] {
    let files: string[] = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        files = files.concat(scanDir(full));
      } else if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".tsx") || item.name.endsWith(".css"))) {
        files.push(full);
      }
    }
    return files;
  }

  const allSrcFiles = scanDir(path.join(cwd, "src"));
  const filesWith45: string[] = [];
  for (const f of allSrcFiles) {
    const rel = path.relative(cwd, f);
    if (rel === "src/components/product/ProductGallery.tsx" || rel === "src/components/admin/products/form/ProductImagesSection.tsx") {
      continue;
    }
    const content = fs.readFileSync(f, "utf-8");
    if (content.includes("aspect-[4/5]")) {
      filesWith45.push(rel);
    }
  }

  assert(
    filesWith45.length === 0,
    "I3: Zero files in src/ contain obsolete aspect-[4/5]",
    filesWith45.join(", ")
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runGlobalProductGridStandardTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
