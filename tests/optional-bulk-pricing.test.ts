import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { ProductService, normalizeToB2BProduct, toStorefrontProduct } from "../src/services/product.service";
import { CartService } from "../src/services/cart.service";
import { Product } from "../src/types";

console.log("==================================================");
console.log("TESTING OPTIONAL BULK PRICING IMPLEMENTATION");
console.log("==================================================");

const srcDir = path.resolve(process.cwd(), "src");
const pricingSectionFile = path.join(srcDir, "components/admin/products/form/ProductPricingSection.tsx");
const productFormFile = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const productDetailFile = path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx");
const cartServiceFile = path.join(srcDir, "services/cart.service.ts");
const productServiceFile = path.join(srcDir, "services/product.service.ts");

const pricingSectionContent = fs.readFileSync(pricingSectionFile, "utf-8");
const productFormContent = fs.readFileSync(productFormFile, "utf-8");
const productDetailContent = fs.readFileSync(productDetailFile, "utf-8");
const cartServiceContent = fs.readFileSync(cartServiceFile, "utf-8");
const productServiceContent = fs.readFileSync(productServiceFile, "utf-8");

// 1. ADMIN UI - OPTIONAL BADGE & TOGGLE
console.log("\n▶ 1. Admin UI: Bulk marked explicitly as OPTIONAL with enable toggle");
assert(
  pricingSectionContent.includes("BULK") &&
  pricingSectionContent.includes("OPTIONAL"),
  "Admin UI clearly shows 'BULK' and 'OPTIONAL' badge"
);
assert(
  pricingSectionContent.includes("Enable Bulk Pricing") &&
  pricingSectionContent.includes("enable_bulk_pricing"),
  "Admin UI provides an explicit 'Enable Bulk Pricing' checkbox toggle"
);
assert(
  pricingSectionContent.includes("bulkPricingEnabled") &&
  pricingSectionContent.includes("Disabled"),
  "When bulk pricing is disabled, inputs are replaced with Disabled placeholders"
);

// 2. ADMIN FORM STATE & VALIDATION RULES
console.log("\n▶ 2. Admin Form Validation: Bulk validation conditional on bulkPricingEnabled");
assert(
  productFormContent.includes("bulkPricingEnabled"),
  "ProductForm maintains explicit bulkPricingEnabled state"
);
assert(
  productFormContent.includes("if (bulkPricingEnabled) {") &&
  productFormContent.includes("errs.bulkThreshold = `Bulk threshold"),
  "Validation for bulk threshold & price runs ONLY when bulkPricingEnabled is true"
);
assert(
  productFormContent.includes("wholesalePrice === undefined || wholesalePrice <= 0"),
  "Standard wholesale price remains strictly required"
);

// 3. PRODUCT SERVICE NORMALIZATION & STOREFRONT MAPPING
console.log("\n▶ 3. Product Service: Handles null/absent bulk pricing without fallback pollution");
// Legacy fallback removal
assert(
  !productServiceContent.includes(": 200;") &&
  !productServiceContent.includes("wholesalePrice * 0.8"),
  "Product service no longer injects arbitrary 200 fallback or 0.8 discount"
);

// Case A: Product with Bulk Disabled
const productDisabledRaw = {
  id: "prod_1",
  name: "Basic Sweater",
  price: 30,
  wholesale_price: 30,
  moq: 80,
  stock: 80,
  available_stock: 80,
  full_stock_price: 20,
  bulk_pricing_enabled: false,
  bulk_threshold: null,
  bulk_price: null,
};

const normalizedDisabled = normalizeToB2BProduct(productDisabledRaw);
assert.strictEqual(normalizedDisabled.bulkPricingEnabled, false, "Case A: bulkPricingEnabled is false");
assert.strictEqual(normalizedDisabled.bulkThreshold, undefined, "Case A: bulkThreshold is undefined");
assert.strictEqual(normalizedDisabled.bulkPrice, undefined, "Case A: bulkPrice is undefined");
assert.strictEqual(normalizedDisabled.isFullStockEligible, true, "Case A: full stock eligible when stock == moq and bulk disabled");
assert.strictEqual(normalizedDisabled.pricingTiers?.length, 2, "Case A: standard and full stock tiers generated");
assert.strictEqual(normalizedDisabled.pricingTiers?.some(t => t.unit_price === 25), false, "Case A: no bulk pricing tier exists");

const storefrontDisabled = toStorefrontProduct(normalizedDisabled);
assert.strictEqual(storefrontDisabled.bulkPricingEnabled, false, "Storefront product has bulkPricingEnabled = false");
assert.strictEqual(storefrontDisabled.bulkThreshold, undefined, "Storefront product has no bulkThreshold");
assert.strictEqual(storefrontDisabled.bulkPrice, undefined, "Storefront product has no bulkPrice");

// Case C: Product with Bulk Enabled
const productEnabledRaw = {
  id: "prod_2",
  name: "Bulk Sweater",
  price: 30,
  wholesale_price: 30,
  moq: 80,
  stock: 200,
  available_stock: 200,
  full_stock_price: 18,
  bulk_pricing_enabled: true,
  bulk_threshold: 160,
  bulk_price: 25,
};

const normalizedEnabled = normalizeToB2BProduct(productEnabledRaw);
assert.strictEqual(normalizedEnabled.bulkPricingEnabled, true, "Case C: bulkPricingEnabled is true");
assert.strictEqual(normalizedEnabled.bulkThreshold, 160, "Case C: bulkThreshold is 160");
assert.strictEqual(normalizedEnabled.bulkPrice, 25, "Case C: bulkPrice is 25");
assert.strictEqual(normalizedEnabled.pricingTiers?.length, 3, "Case C: standard, bulk, and full stock tiers exist");

// 4. CART SERVICE TIER PRICING CALCULATION
console.log("\n▶ 4. Cart Service: Authoritative tier calculation with and without Bulk");
const cartService = new CartService();

// With Bulk Disabled:
const cartProdNoBulk: Product = {
  id: "p_nobulk",
  name: "No Bulk Product",
  slug: "no-bulk",
  price: 30,
  wholesalePrice: 30,
  standardPrice: 30,
  bulkPricingEnabled: false,
  fullStockPrice: 20,
  availableStock: 80,
  moq: 80,
  categoryId: "c1",
  images: ["/img.jpg"],
  sizes: ["S", "M", "L"],
};

// Buying MOQ (80) in standard mode -> $30
const priceStandard = cartService.calculateTierUnitPrice(cartProdNoBulk, 80, "standard");
assert.strictEqual(priceStandard, 30, "Cart pricing: Buying standard qty gives standard wholesale price ($30)");

// Buying in full_stock mode -> $20
const priceFullStock = cartService.calculateTierUnitPrice(cartProdNoBulk, 80, "full_stock");
assert.strictEqual(priceFullStock, 20, "Cart pricing: Buying full stock gives full stock price ($20) when available == MOQ");

// Buying 100 pcs without full stock mode and no bulk -> standard price $30 (never falls back to non-existent bulk)
const priceOverMoq = cartService.calculateTierUnitPrice(cartProdNoBulk, 100);
assert.strictEqual(priceOverMoq, 30, "Cart pricing: Without bulk configured, higher quantity retains standard price ($30)");

// With Bulk Enabled:
const cartProdWithBulk: Product = {
  id: "p_withbulk",
  name: "With Bulk Product",
  slug: "with-bulk",
  price: 30,
  wholesalePrice: 30,
  standardPrice: 30,
  bulkPricingEnabled: true,
  bulkThreshold: 160,
  bulkPrice: 25,
  fullStockPrice: 18,
  availableStock: 300,
  moq: 80,
  categoryId: "c1",
  images: ["/img.jpg"],
  sizes: ["S", "M", "L"],
};

assert.strictEqual(cartService.calculateTierUnitPrice(cartProdWithBulk, 80), 30, "Standard qty gives $30");
assert.strictEqual(cartService.calculateTierUnitPrice(cartProdWithBulk, 160), 25, "Bulk threshold qty gives $25");
assert.strictEqual(cartService.calculateTierUnitPrice(cartProdWithBulk, 300, "full_stock"), 18, "Full stock qty gives $18");

// 5. STOREFRONT PRODUCT DETAIL CHECKS
console.log("\n▶ 5. Customer Storefront Product Detail View Verification");
assert(
  productDetailContent.includes("hasBulkTier && bulkThreshold !== undefined ? `${moq}–${bulkThreshold - 1} pcs` : `${moq}+ pcs`"),
  "Storefront formats Standard tier range as `${moq}+ pcs` when Bulk is not configured"
);
assert(
  productDetailContent.includes("{hasBulkTier && bulkThreshold !== undefined && bulkPrice !== undefined && (") &&
  productDetailContent.includes('name="Bulk"'),
  "Storefront conditionally renders the Bulk tier option ONLY when hasBulkTier is true"
);
assert(
  productDetailContent.includes("hasBulkTier && bulkThreshold !== undefined") &&
  productDetailContent.includes("availableInventory > bulkThreshold") &&
  productDetailContent.includes("availableInventory >= moq"),
  "Full Stock qualification respects whether Bulk is enabled: > bulkThreshold if enabled, >= moq if disabled"
);

console.log("\n==================================================");
console.log("✓ ALL OPTIONAL BULK PRICING TESTS PASSED!");
console.log("==================================================");
