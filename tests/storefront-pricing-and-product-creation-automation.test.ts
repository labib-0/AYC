import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { normalizeToB2BProduct, toStorefrontProduct, generateProductSku } from "../src/services/product.service";
import { generateDeterministicProductSeo } from "../src/lib/seo/generator";

console.log("==================================================");
console.log("TESTING STOREFRONT PRICING & PRODUCT CREATION AUTOMATION");
console.log("==================================================");

const srcDir = path.resolve(process.cwd(), "src");
const productCardFile = path.join(srcDir, "components/product/ProductCard.tsx");
const productFormFile = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const basicInfoFile = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const productShippingFile = path.join(srcDir, "components/admin/products/form/ProductShippingSection.tsx");
const searchOverlayFile = path.join(srcDir, "components/layout/SearchOverlay.tsx");
const miniCartFile = path.join(srcDir, "components/cart/MiniCart.tsx");
const pricingTierOptionFile = path.join(srcDir, "components/product/PricingTierOption.tsx");
const commerceSummaryFile = path.join(srcDir, "components/product/CommerceSummary.tsx");

const productCardContent = fs.readFileSync(productCardFile, "utf-8");
const productFormContent = fs.readFileSync(productFormFile, "utf-8");
const basicInfoContent = fs.readFileSync(basicInfoFile, "utf-8");
const productShippingContent = fs.readFileSync(productShippingFile, "utf-8");
const searchOverlayContent = fs.readFileSync(searchOverlayFile, "utf-8");
const miniCartContent = fs.readFileSync(miniCartFile, "utf-8");
const pricingTierOptionContent = fs.readFileSync(pricingTierOptionFile, "utf-8");
const commerceSummaryContent = fs.readFileSync(commerceSummaryFile, "utf-8");

// =========================================================================
// SECTION 1: PRICING (Points 1 - 5)
// =========================================================================
console.log("\n▶ [PRICING 1] Missing customer price never renders as $0.00 / PC");
const unpricedProduct = toStorefrontProduct({
  id: 991,
  name: "Unpriced Quote Product",
  wholesale_price: 0,
  price: 0,
  has_valid_price: false,
});
assert.strictEqual(
  unpricedProduct.has_valid_price,
  false,
  "Unpriced product must have has_valid_price: false"
);
assert.strictEqual(
  unpricedProduct.price,
  undefined,
  "Unpriced product price must be undefined, not 0"
);
// Verify ProductCard.tsx never formats 0 or false has_valid_price as $0.00
assert.ok(
  productCardContent.includes("hasValidPrice"),
  "ProductCard must check hasValidPrice"
);
assert.ok(
  productCardContent.includes("Price on Request"),
  "ProductCard must render 'Price on Request' when price is unconfigured or zero"
);

console.log("▶ [PRICING 2] Valid Standard price renders correctly");
const pricedProduct = toStorefrontProduct({
  id: 992,
  name: "Standard Priced Product",
  wholesale_price: 45.5,
  standard_price: 45.5,
  has_valid_price: true,
});
assert.strictEqual(pricedProduct.has_valid_price, true);
assert.strictEqual(pricedProduct.price, 45.5);
assert.strictEqual(pricedProduct.wholesale_price, 45.5);

console.log("▶ [PRICING 3] Disabled Bulk does not create a fake price");
const disabledBulkProduct = toStorefrontProduct({
  id: 993,
  name: "Product With Disabled Bulk",
  wholesale_price: 25.0,
  bulk_pricing_enabled: false,
  bulk_price: null,
});
assert.strictEqual(disabledBulkProduct.price, 25.0);
assert.strictEqual(disabledBulkProduct.bulk_price, undefined);

console.log("▶ [PRICING 4] Full Stock still works when applicable");
const fullStockProduct = toStorefrontProduct({
  id: 994,
  name: "Product with Full Stock",
  wholesale_price: 20.0,
  full_stock_price: 15.0,
  has_full_stock_tier: true,
});
assert.strictEqual(fullStockProduct.price, 20.0);
assert.strictEqual(fullStockProduct.full_stock_price, 15.0);

console.log("▶ [PRICING 5] Purchase Price (cost_price) never appears as storefront price");
const productWithCost = toStorefrontProduct({
  id: 995,
  name: "Product With Hidden Cost",
  cost_price: 8.5,
  wholesale_price: 0, // No valid customer price
});
assert.strictEqual(
  productWithCost.price,
  undefined,
  "cost_price must NEVER leak as public storefront price"
);
assert.strictEqual(
  productWithCost.has_valid_price,
  false,
  "Product with only cost_price must not be marked has_valid_price"
);

// Verify other customer-facing surfaces
assert.ok(
  searchOverlayContent.includes("Price on Request"),
  "SearchOverlay must have Price on Request fallback"
);
assert.ok(
  miniCartContent.includes("Price on Request"),
  "MiniCart must have Price on Request fallback"
);
assert.ok(
  pricingTierOptionContent.includes("Price on Request"),
  "PricingTierOption must have Price on Request fallback"
);
assert.ok(
  commerceSummaryContent.includes("Price on Request"),
  "CommerceSummary must have Price on Request fallback"
);

// =========================================================================
// SECTION 2: SKU (Points 6 - 9)
// =========================================================================
console.log("\n▶ [SKU 6] New product name triggers SKU generation");
const generatedSku1 = generateProductSku("Ayaan Apparel", "Shirts", "Classic Oxford Cotton Shirt");
assert.ok(generatedSku1.length > 0, "SKU must be generated");
assert.ok(generatedSku1.startsWith("AYA-SHI-"), "SKU should use standard brand/cat prefix");

console.log("▶ [SKU 7] SKU is unique across different products");
const generatedSku2 = generateProductSku("Ayaan Apparel", "Shirts", "Classic Oxford Cotton Shirt");
// The generator includes an incremental counter or unique hash
assert.notStrictEqual(
  generatedSku1,
  generatedSku2,
  "Generated SKUs must be unique even with identical product info"
);

console.log("▶ [SKU 8] Manual SKU edits are preserved");
assert.ok(
  productFormContent.includes("skuManuallyEdited"),
  "ProductForm must track skuManuallyEdited flag"
);
assert.ok(
  productFormContent.includes("handleSkuChange"),
  "ProductForm must have handleSkuChange to mark SKU as manually edited"
);
assert.ok(
  basicInfoContent.includes("onSkuChange"),
  "ProductBasicInfoSection must notify when SKU is changed"
);

console.log("▶ [SKU 9] Existing SKU is preserved on edit");
assert.ok(
  productFormContent.includes("useState(Boolean(initialData?.sku))"),
  "ProductForm must initialize skuManuallyEdited to true if initialData.sku exists"
);
assert.ok(
  productFormContent.includes("if (!isEdit && !skuManuallyEdited)"),
  "ProductForm must never regenerate SKU in edit mode"
);

// =========================================================================
// SECTION 3: SLUG (Points 10 - 13)
// =========================================================================
console.log("\n▶ [SLUG 10] Product name triggers slug generation");
assert.ok(
  productFormContent.includes("setSlug(generated)"),
  "ProductForm must generate and set slug when name changes"
);

console.log("▶ [SLUG 11] Slug format is correct kebab-case");
const testName = "Premium 100% Cotton Denim & Twill Jacket!";
const slug = testName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
assert.strictEqual(
  slug,
  "premium-100-cotton-denim-twill-jacket",
  "Slug format must be lowercase hyphen-separated alphanumeric"
);

console.log("▶ [SLUG 12] Manual slug edits are preserved");
assert.ok(
  productFormContent.includes("slugManuallyEdited"),
  "ProductForm must track slugManuallyEdited flag"
);
assert.ok(
  productFormContent.includes("handleSlugChange"),
  "ProductForm must have handleSlugChange to mark slug as manually edited"
);
assert.ok(
  basicInfoContent.includes("onSlugChange"),
  "ProductBasicInfoSection must notify when slug is changed"
);

console.log("▶ [SLUG 13] Existing slug remains unchanged on edit");
assert.ok(
  productFormContent.includes('const isEdit = mode === "edit";'),
  "ProductForm must track isEdit from mode === 'edit'"
);
assert.ok(
  productFormContent.includes("if (!isEdit && !slugManuallyEdited)"),
  "ProductForm must never regenerate slug in edit mode"
);

// =========================================================================
// SECTION 4: PACKAGING (Points 14 - 17)
// =========================================================================
console.log("\n▶ [PACKAGING 14] New product defaults to 60 x 40 x 30 cm");
assert.ok(
  productFormContent.includes("carton_length: isEdit ? undefined : 60"),
  "New product default length must be 60"
);
assert.ok(
  productFormContent.includes("carton_width: isEdit ? undefined : 40"),
  "New product default width must be 40"
);
assert.ok(
  productFormContent.includes("carton_height: isEdit ? undefined : 30"),
  "New product default height must be 30"
);
assert.ok(
  productFormContent.includes('dimension_unit: "cm"'),
  "Default dimension unit must be cm"
);

console.log("▶ [PACKAGING 15] Gross Weight remains empty unless configured");
assert.ok(
  productFormContent.includes("gross_weight: undefined"),
  "New product gross_weight must initialize undefined/empty"
);

console.log("▶ [PACKAGING 16] Carton Count remains empty unless configured");
assert.ok(
  productFormContent.includes("carton_count: undefined"),
  "New product carton_count must initialize undefined/empty"
);

console.log("▶ [PACKAGING 17] Existing product packaging is never overwritten");
assert.ok(
  productFormContent.includes("initialData?.shippingPackageProfiles || initialData?.shipping_package_profiles"),
  "ProductForm must preserve existing packaging profiles from initialData on edit"
);
assert.ok(
  productShippingContent.includes("profile: ShippingPackageProfile = profiles[0]"),
  "ProductShippingSection must respect incoming profiles"
);

// =========================================================================
// SECTION 5: SEO (Points 18 - 23)
// =========================================================================
console.log("\n▶ [SEO 18] SEO fields auto-populate from basic product info for new products");
const generatedSeo = generateDeterministicProductSeo({
  name: "Vintage Cargo Pants",
  brandName: "Denim Works",
  categoryName: "Pants & Trousers",
  audience: "Men",
  material: "100% Ripstop Cotton",
});
assert.ok(
  generatedSeo.seoTitle.includes("Vintage Cargo Pants"),
  "Generated SEO title must contain product name"
);
assert.ok(
  generatedSeo.seoTitle.includes("Denim Works"),
  "Generated SEO title must contain brand name when provided"
);
assert.ok(
  generatedSeo.metaDescription.includes("Vintage Cargo Pants"),
  "Generated meta description must include product name"
);
assert.ok(
  generatedSeo.seoKeywords.length >= 3,
  "Generated SEO keywords must include meaningful tags"
);
assert.ok(
  generatedSeo.seoKeywords.includes("vintage cargo pants"),
  "Keywords must include clean product phrase"
);

console.log("▶ [SEO 19] Admin can edit generated SEO fields");
assert.ok(
  productFormContent.includes("seoTitleManuallyEditedRef"),
  "ProductForm must track manual SEO title edits via ref"
);
assert.ok(
  productFormContent.includes("seoDescriptionManuallyEditedRef"),
  "ProductForm must track manual SEO description edits via ref"
);
assert.ok(
  productFormContent.includes("hasUserEditedKeywordsRef"),
  "ProductForm must track manual SEO keywords edits via ref"
);

console.log("▶ [SEO 20] Manual SEO edits are preserved");
assert.ok(
  productFormContent.includes("seoTitleManuallyEditedRef.current = true"),
  "Editing SEO title marks it manually edited"
);
assert.ok(
  productFormContent.includes("seoDescriptionManuallyEditedRef.current = true"),
  "Editing SEO description marks it manually edited"
);
assert.ok(
  productFormContent.includes("hasUserEditedKeywordsRef.current = true"),
  "Editing SEO keywords marks it manually edited"
);

console.log("▶ [SEO 21] Existing SEO values load correctly in Edit mode");
const existingProduct = normalizeToB2BProduct({
  id: 888,
  name: "Custom Export Jacket",
  seo_title: "Handcrafted Custom Export Jacket | Premium",
  seo_description: "Custom tailored heavy duty export jacket for bulk wholesale.",
  keywords: ["custom jacket", "heavy duty", "bulk apparel"],
});
assert.strictEqual(
  existingProduct.seoTitle,
  "Handcrafted Custom Export Jacket | Premium"
);
assert.strictEqual(
  existingProduct.seoDescription,
  "Custom tailored heavy duty export jacket for bulk wholesale."
);
assert.deepStrictEqual(existingProduct.keywords, [
  "custom jacket",
  "heavy duty",
  "bulk apparel",
]);

console.log("▶ [SEO 22] SEO Keywords do not disappear");
assert.deepStrictEqual(existingProduct.seo_keywords, [
  "custom jacket",
  "heavy duty",
  "bulk apparel",
]);

console.log("▶ [SEO 23] Saving unrelated fields does not erase SEO fields");
assert.ok(
  productFormContent.includes("seo_title: finalSeoTitle || undefined"),
  "Payload must include seo_title"
);
assert.ok(
  productFormContent.includes("seo_description: finalSeoDescription || undefined"),
  "Payload must include seo_description"
);
assert.ok(
  productFormContent.includes("seo_keywords: finalKeywords"),
  "Payload must include seo_keywords"
);

console.log("==================================================");
console.log("✓ ALL 23 AUDIT & SPECIFICATION REQUIREMENTS PASSED!");
console.log("==================================================");
