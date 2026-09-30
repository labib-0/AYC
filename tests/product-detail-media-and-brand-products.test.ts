/**
 * TEST SUITE: PRODUCT DETAIL MEDIA LAYOUT & BRAND PRODUCTS SECTION
 *
 * Verifies:
 * 1. Main product image uses the allocated gallery space substantially better (no 290px clamp).
 * 2. Image aspect ratio remains correct (aspect-[3/4] aspect-product preserved).
 * 3. No image distortion or crop was introduced (object-contain preserved, no scale hacks).
 * 4. Thumbnails remain visible directly below main image and correctly connected.
 * 5. Left column maintains complete structure: Media -> Thumbnails -> Description -> Specifications (Design Type + Material).
 * 6. Right-side purchasing functionality remains intact (Volume pricing, Stepper, Logistics row, Matrix, CTAs).
 * 7. "More from {Brand}" appears only as full-width section after all Product Detail content.
 * 8. Related products come from the same brand (dynamic brand query).
 * 9. Current product is excluded by ID and slug.
 * 10. Hidden/draft/archived products are not exposed (storefront visibility rules respected).
 * 11. Empty brand-product results do not create an empty section.
 */

import fs from "fs";
import path from "path";
import assert from "assert";

const repoRoot = path.resolve(__dirname, "..");
const srcDir = path.join(repoRoot, "src");
const backendDir = path.join(repoRoot, "backend");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err?.message || err}`);
    failed++;
  }
}

console.log("==================================================");
console.log("PRODUCT DETAIL MEDIA LAYOUT & BRAND PRODUCTS AUDIT");
console.log("==================================================");

// -----------------------------------------------------------------------------
// 1. LEFT PRODUCT MEDIA AREA & IMAGE ALLOCATION
// -----------------------------------------------------------------------------
console.log("\n▶ 1. Main Product Image & Allocated Media Area:");

const galleryContent = fs.readFileSync(
  path.join(srcDir, "components/product/ProductGallery.tsx"),
  "utf-8"
);
const detailViewContent = fs.readFileSync(
  path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx"),
  "utf-8"
);

test("1.1 ProductGallery removes the restrictive 290px desktop height clamp on detail view", () => {
  assert(
    !galleryContent.includes('lg:max-h-[290px] xl:max-h-[310px]'),
    "Must not clamp detail gallery height to 290px"
  );
  assert(
    galleryContent.includes('const maxHeightConstraint = isModal ? "max-h-[290px] sm:max-h-[330px]" : "";'),
    "Detail view must allow the main image container to scale naturally"
  );
});

test("1.2 Main product image preserves 4:5 aspect ratio and non-destructive object-contain", () => {
  assert(
    galleryContent.includes("aspect-[4/5]"),
    "Main image container must preserve canonical 4:5 aspect ratio"
  );
  // Check main image rendering block
  const mainImgMatch = galleryContent.match(/<button[\s\S]*?ref=\{lightboxTriggerRef\}[\s\S]*?<img([\s\S]*?)\/>[\s\S]*?<\/button>/);
  assert(mainImgMatch, "Must find main image button");
  const mainImgCode = mainImgMatch[1];
  assert(
    mainImgCode.includes("object-contain"),
    "Main image must use object-contain to avoid image crop and distortion"
  );
  assert(
    !mainImgCode.includes("object-cover"),
    "Main image must not crop with object-cover"
  );
  assert(
    !galleryContent.includes("transform: scale"),
    "Must not use arbitrary transform: scale() hacks"
  );
});

test("1.3 Balanced two-column grid allocation on desktop (Left ~40-42%, Right ~58-60%) with controlled gap", () => {
  assert(
    detailViewContent.includes("lg:grid-cols-12"),
    "Grid uses 12-column architecture for balanced desktop proportion"
  );
  assert(
    detailViewContent.includes("lg:col-span-5 xl:col-span-5"),
    "Left column must occupy 5 of 12 columns (~41.67%)"
  );
  assert(
    detailViewContent.includes("lg:col-span-7 xl:col-span-7"),
    "Right purchasing column must occupy 7 of 12 columns (~58.33%)"
  );
  assert(
    detailViewContent.includes("gap-5 lg:gap-6 xl:gap-7"),
    "Left gallery and right purchasing content must be separated by a controlled gap"
  );
});

test("1.4 Thumbnails remain visible directly below main image with responsive sizing", () => {
  assert(
    galleryContent.includes("thumbSizeClass"),
    "Must use thumbSizeClass for thumbnails"
  );
  assert(
    galleryContent.includes("cleanImages.map"),
    "Must render thumbnail rail from cleanImages"
  );
  assert(
    galleryContent.includes("setIndex"),
    "Thumbnail selection must be wired to setIndex"
  );
});

// -----------------------------------------------------------------------------
// 2. COMPLETE LEFT COLUMN STRUCTURE PRESERVATION
// -----------------------------------------------------------------------------
console.log("\n▶ 2. Left Column Structure & Hierarchy:");

test("2.1 Left column contains Gallery -> Description -> Specifications (Design Type + Material)", () => {
  const leftColMatch = detailViewContent.match(/\{\/\* LEFT: GALLERY \/ MEDIA \+ DESCRIPTION \+ SPECIFICATIONS \*\/\}[\s\S]*?\{\/\* RIGHT: WHOLESALE PURCHASE HIERARCHY/);
  assert(leftColMatch, "Must find left column code block");
  const leftCol = leftColMatch[0];

  const galleryIdx = leftCol.indexOf("<ProductGallery");
  const descIdx = leftCol.indexOf('title="Description"');
  const specIdx = leftCol.indexOf('title="Specifications"');
  const designTypeIdx = leftCol.indexOf("Design Type");
  const materialIdx = leftCol.indexOf("Material");

  assert(galleryIdx !== -1, "Must contain ProductGallery");
  assert(descIdx !== -1, "Must contain Description section");
  assert(specIdx !== -1, "Must contain Specifications section");
  assert(designTypeIdx !== -1, "Must contain Design Type");
  assert(materialIdx !== -1, "Must contain Material");

  assert(galleryIdx < descIdx, "ProductGallery must be above Description");
  assert(descIdx < specIdx, "Description must be above Specifications");
  assert(specIdx < designTypeIdx, "Specifications header must be above Design Type");
  assert(designTypeIdx < materialIdx, "Design Type must be alongside Material");
});

test("2.2 Right-side purchasing hierarchy remains intact", () => {
  assert(
    detailViewContent.includes("<PricingTierOption"),
    "Right column must preserve PricingTierOption"
  );
  assert(
    detailViewContent.includes("<QuantityStepper"),
    "Right column must preserve QuantityStepper"
  );
  assert(
    detailViewContent.includes("<CommerceSummary"),
    "Right column must preserve CommerceSummary"
  );
  assert(
    detailViewContent.includes("<ProductSelectedLogisticsRow"),
    "Right column must preserve ProductSelectedLogisticsRow"
  );
  assert(
    detailViewContent.includes("id=\"add-to-cart-button\""),
    "Right column must preserve Add to Cart button"
  );
  assert(
    detailViewContent.includes("id=\"add-to-rfq-button\""),
    "Right column must preserve Add to RFQ button"
  );
});

// -----------------------------------------------------------------------------
// 3. PRODUCTS FROM BRAND SECTION
// -----------------------------------------------------------------------------
console.log("\n▶ 3. Brand Products Section at the Very End:");

test("3.1 'More from {product.brand}' is rendered as the last major section beneath the product grid", () => {
  const mainGridCloseIdx = detailViewContent.indexOf("{/* PRODUCTS FROM BRAND (Full-width section after all product detail content) */}");
  const brandHeadingIdx = detailViewContent.indexOf("More from {product.brand}");
  
  assert(mainGridCloseIdx !== -1, "Must have brand products section after main grid");
  assert(brandHeadingIdx !== -1, "Must have dynamic heading 'More from {product.brand}'");
  assert(mainGridCloseIdx < brandHeadingIdx, "Brand section must follow the main product grid");
});

test("3.2 Brand products grid uses responsive 4-column desktop layout", () => {
  assert(
    detailViewContent.includes("grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"),
    "Must use 4 columns on desktop with responsive fallback on mobile/tablet"
  );
  assert(
    detailViewContent.includes("<ProductCard"),
    "Must reuse existing ProductCard / ProductTile component"
  );
});

test("3.3 Empty brand results completely hide the section (no empty container or placeholder cards)", () => {
  assert(
    detailViewContent.includes("{brandProducts.length > 0 && ("),
    "Must guard entire section with brandProducts.length > 0"
  );
});

test("3.4 getBrandProducts query function exists and enforces brand filtering, exclusion, and visibility", () => {
  const serviceContent = fs.readFileSync(
    path.join(srcDir, "lib/services/products.ts"),
    "utf-8"
  );
  assert(
    serviceContent.includes("export async function getBrandProducts("),
    "Must export getBrandProducts function"
  );
  assert(
    serviceContent.includes("brand: product.brand"),
    "Must filter by product.brand"
  );
  assert(
    serviceContent.includes("String(p.id) !== String(product.id)"),
    "Must exclude current product by ID"
  );
  assert(
    serviceContent.includes("p.slug !== product.slug"),
    "Must exclude current product by slug"
  );
  assert(
    serviceContent.includes('status: "published"'),
    "Must require published status"
  );
  assert(
    serviceContent.includes("!p.isHiddenFromStorefront"),
    "Must exclude storefront-hidden products"
  );
});

// -----------------------------------------------------------------------------
// 4. BACKEND EXCLUDE PARAMETER SUPPORT
// -----------------------------------------------------------------------------
console.log("\n▶ 4. Backend Catalog Exclude Parameter:");

test("4.1 ProductQueryRequest allows exclude parameter", () => {
  const reqContent = fs.readFileSync(
    path.join(backendDir, "app/Http/Requests/Catalog/ProductQueryRequest.php"),
    "utf-8"
  );
  assert(
    reqContent.includes("'exclude' => ['nullable', 'string', 'max:255']"),
    "ProductQueryRequest must validate exclude parameter"
  );
});

test("4.2 ProductController filters out excluded IDs and slugs", () => {
  const ctrlContent = fs.readFileSync(
    path.join(backendDir, "app/Http/Controllers/Api/V1/ProductController.php"),
    "utf-8"
  );
  assert(
    ctrlContent.includes("$request->filled('exclude')"),
    "ProductController must check filled('exclude')"
  );
  assert(
    ctrlContent.includes("whereNotIn('id', array_filter($excludes, 'is_numeric'))"),
    "ProductController must filter out excluded IDs"
  );
  assert(
    ctrlContent.includes("whereNotIn('slug', $excludes)"),
    "ProductController must filter out excluded slugs"
  );
});

console.log("\n==================================================");
console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
