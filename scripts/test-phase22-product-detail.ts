import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

const rootDir = process.cwd();
const productDetailPath = path.join(rootDir, "src/app/products/[slug]/ProductDetailView.tsx");
const productGalleryPath = path.join(rootDir, "src/components/product/ProductGallery.tsx");
const productCardPath = path.join(rootDir, "src/components/product/ProductCard.tsx");
const quickAddModalPath = path.join(rootDir, "src/components/product/ProductQuickAddModal.tsx");

const productDetailContent = fs.readFileSync(productDetailPath, "utf-8");
const productGalleryContent = fs.readFileSync(productGalleryPath, "utf-8");
const productCardContent = fs.readFileSync(productCardPath, "utf-8");
const quickAddModalContent = fs.readFileSync(quickAddModalPath, "utf-8");

console.log("=== PHASE 22 STATIC VALIDATION ===\n");

// 1. Image Area: Design Type removed, Brand Logo & Badges remain
assert(
  productDetailContent.includes("<ProductPromotionBadges product={product} variant=\"detail\" />"),
  "ProductPromotionBadges (NEW/HOT) is present in ProductDetailView image overlay"
);

assert(
  productDetailContent.includes("<ProductBrandLogoOverlay") &&
  productDetailContent.includes("brandName={product.brand}") &&
  productDetailContent.includes("brandLogo={product.brandLogo}"),
  "ProductBrandLogoOverlay is present in ProductDetailView image overlay"
);

// Verify no Design Type overlay inside overlayContent of ProductGallery in ProductDetailView
const overlayMatch = productDetailContent.match(/overlayContent=\{([\s\S]*?)\}/);
assert(Boolean(overlayMatch), "ProductDetailView passes overlayContent to ProductGallery");
if (overlayMatch) {
  const overlayInner = overlayMatch[1];
  assert(
    !overlayInner.includes("designType") && !overlayInner.includes("DesignType"),
    "No Design Type overlay or badge exists within image overlayContent"
  );
}

// 2. Metadata Sequence: BRAND -> DESIGN TYPE -> SKU -> AUDIENCE -> CATEGORY
const metadataStart = productDetailContent.indexOf("Structured Metadata Row");
const metadataEnd = productDetailContent.indexOf("{/* Product Title */}");
assert(metadataStart !== -1 && metadataEnd !== -1, "Found Structured Metadata Row section");

const metadataRowSnippet = productDetailContent.substring(metadataStart, metadataEnd);

assert(
  metadataRowSnippet.includes("product.brand") &&
  metadataRowSnippet.includes("product.designType") &&
  metadataRowSnippet.includes("product.sku") &&
  metadataRowSnippet.includes("product.audience") &&
  metadataRowSnippet.includes("product.categoryName"),
  "All metadata attributes (brand, designType, sku, audience, categoryName) are rendered in the metadata row"
);

const brandIndex = metadataRowSnippet.indexOf("product.brand");
const designTypeIndex = metadataRowSnippet.indexOf("product.designType");
const skuIndex = metadataRowSnippet.indexOf("product.sku");
const audienceIndex = metadataRowSnippet.indexOf("product.audience");
const categoryIndex = metadataRowSnippet.indexOf("product.categoryName");

assert(
  brandIndex < designTypeIndex &&
  designTypeIndex < skuIndex &&
  skuIndex < audienceIndex &&
  audienceIndex < categoryIndex,
  "Product metadata line adheres to strict order: BRAND -> DESIGN TYPE -> SKU -> AUDIENCE -> CATEGORY"
);

// 3. Terminology & Full Wording
assert(
  productDetailContent.includes('? "MASTER COPY" : "ORIGINAL"'),
  "Product Detail uses canonical full wording: 'MASTER COPY' or 'ORIGINAL'"
);

// Check that top metadata line has no "DESIGN TYPE:" prefix
const metadataLineArea = productDetailContent.substring(brandIndex, categoryIndex + 200);
assert(
  !metadataLineArea.includes("DESIGN TYPE:") && !metadataLineArea.includes("Design Type:"),
  "Top metadata row does NOT display 'DESIGN TYPE:' prefix"
);

// Check that compact product card still uses MC / ORIGINAL
assert(
  productCardContent.includes('? "MC" : "ORIGINAL"'),
  "ProductCard preserves compact rule with 'MC' or 'ORIGINAL'"
);

// 4. No active customer-facing REPLICA
assert(
  !productDetailContent.includes('"REPLICA"') && !productDetailContent.includes("'REPLICA'"),
  "No active REPLICA classification in ProductDetailView"
);

// 5. Typography Standardization
assert(
  productDetailContent.includes("font-display font-bold uppercase") &&
  productDetailContent.includes("font-sans"),
  "Headings use Manrope (font-display) and body uses Inter (font-sans)"
);

assert(
  productDetailContent.includes("text-[14px] sm:text-[15px]") && // Brand size
  productDetailContent.includes("text-[13px] sm:text-[13.5px]"), // Design Type size
  "Brand font size (14-15px) is more prominent than secondary metadata"
);

assert(
  productDetailContent.includes("text-2xl sm:text-3xl lg:text-[32px] font-sans font-bold"),
  "Price hierarchy remains large and dominant"
);

// 6. QuickAddModal metadata alignment
const modalBrandIdx = quickAddModalContent.indexOf("brandName");
const modalDtIdx = quickAddModalContent.indexOf("product.designType");
const modalSkuIdx = quickAddModalContent.indexOf("product.sku");

assert(
  modalBrandIdx < modalDtIdx && modalDtIdx < modalSkuIdx,
  "ProductQuickAddModal header metadata also follows BRAND -> DESIGN TYPE -> SKU sequence"
);

console.log("\nAll Phase 22 static validation checks passed successfully!");
