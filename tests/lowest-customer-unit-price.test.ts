import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  getLowestValidCustomerUnitPrice,
  formatProductTilePrice,
} from "../src/lib/product-pricing";
import { toStorefrontProduct } from "../src/services/product.service";
import { Product } from "../src/types";

console.log("==================================================");
console.log("TESTING LOWEST VALID CUSTOMER UNIT PRICE ON PRODUCT TILES");
console.log("==================================================");

// =========================================================================
// 1. UNIT TESTS: PRICING PRIORITY & SELECTION LOGIC
// =========================================================================
console.log("\n▶ 1. Priority & Candidate Price Selection Rules");

// CASE A: Standard = $5.00, Bulk = $4.50, Full Stock = $4.20 -> $4.20
const productCaseA = {
  id: "prod_a",
  name: "Case A T-Shirt",
  slug: "case-a-t-shirt",
  moq: 10,
  availableStock: 500,
  wholesalePrice: 5.0,
  standardPrice: 5.0,
  bulkPricingEnabled: true,
  bulkThreshold: 100,
  bulkPrice: 4.5,
  fullStockPrice: 4.2,
  isFullStockEligible: true,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseA),
  4.2,
  "CASE A: Full stock is lowest valid tier ($4.20) and must be returned."
);
console.log("✓ CASE A Passed: Full Stock lower than Bulk and Standard -> $4.20");

// CASE B: Standard = $5.00, Bulk = $4.50, Full Stock unavailable -> $4.50
const productCaseB = {
  id: "prod_b",
  name: "Case B T-Shirt",
  slug: "case-b-t-shirt",
  moq: 10,
  availableStock: 50,
  wholesalePrice: 5.0,
  standardPrice: 5.0,
  bulkPricingEnabled: true,
  bulkThreshold: 100,
  bulkPrice: 4.5,
  fullStockPrice: 4.2,
  isFullStockEligible: false, // Ineligible because stock (50) < bulk threshold (100)
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseB),
  4.5,
  "CASE B: Full stock unavailable -> Bulk price ($4.50) must be returned."
);
console.log("✓ CASE B Passed: Full stock unavailable -> Bulk price ($4.50)");

// CASE C: Standard = $5.00, Bulk disabled, Full Stock = $4.20 -> $4.20
const productCaseC = {
  id: "prod_c",
  name: "Case C T-Shirt",
  slug: "case-c-t-shirt",
  moq: 10,
  availableStock: 200,
  wholesalePrice: 5.0,
  standardPrice: 5.0,
  bulkPricingEnabled: false, // Disabled
  bulkThreshold: 100,
  bulkPrice: 4.5,
  fullStockPrice: 4.2,
  isFullStockEligible: true,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseC),
  4.2,
  "CASE C: Bulk disabled, Full Stock ($4.20) is eligible -> $4.20 returned."
);
console.log("✓ CASE C Passed: Bulk disabled, Full Stock available -> $4.20");

// CASE D: Standard = $5.00, Bulk disabled, Full Stock unavailable -> $5.00
const productCaseD = {
  id: "prod_d",
  name: "Case D T-Shirt",
  slug: "case-d-t-shirt",
  moq: 10,
  availableStock: 0,
  wholesalePrice: 5.0,
  standardPrice: 5.0,
  bulkPricingEnabled: false,
  fullStockPrice: 4.2,
  isFullStockEligible: false,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseD),
  5.0,
  "CASE D: Bulk disabled and Full Stock unavailable -> Standard fallback ($5.00) returned."
);
console.log("✓ CASE D Passed: Bulk disabled, Full stock unavailable -> Standard ($5.00)");

// CASE E: Standard = $5.00, Bulk = NULL, Full Stock = NULL -> $5.00
const productCaseE = {
  id: "prod_e",
  name: "Case E T-Shirt",
  slug: "case-e-t-shirt",
  moq: 10,
  wholesalePrice: 5.0,
  bulkPrice: null,
  fullStockPrice: null,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseE),
  5.0,
  "CASE E: No bulk or full stock configured -> Standard ($5.00) returned."
);
console.log("✓ CASE E Passed: Bulk and Full stock null -> Standard ($5.00)");

// CASE F: Standard = NULL, Bulk disabled, Full Stock unavailable -> NULL (never 0.00!)
const productCaseF = {
  id: "prod_f",
  name: "Case F T-Shirt",
  slug: "case-f-t-shirt",
  moq: 10,
  wholesalePrice: null,
  standardPrice: null,
  price: null,
  costPrice: 2.0, // Internal cost price must NEVER leak as customer price!
  bulkPricingEnabled: false,
  fullStockPrice: null,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseF),
  null,
  "CASE F: Unpriced product must return null, NEVER 0.00!"
);
const tileFormatF = formatProductTilePrice(productCaseF);
assert.strictEqual(tileFormatF.hasValidPrice, false, "Must not have valid price");
assert.strictEqual(tileFormatF.priceText, "Price on Request", "Must display Price on Request, never $0.00 / PC");
console.log("✓ CASE F Passed: Missing prices return null and display 'Price on Request', NEVER $0.00");

// CASE G: Standard = $5.00, Bulk = $4.50 but Bulk Pricing disabled -> $5.00
const productCaseG = {
  id: "prod_g",
  name: "Case G T-Shirt",
  slug: "case-g-t-shirt",
  moq: 10,
  wholesalePrice: 5.0,
  bulkPricingEnabled: false, // Disabled!
  bulkThreshold: 50,
  bulkPrice: 4.5,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseG),
  5.0,
  "CASE G: Bulk pricing disabled -> Bulk price must be ignored, standard ($5.00) returned."
);
console.log("✓ CASE G Passed: Bulk disabled -> Bulk price ignored, Standard ($5.00)");

// CASE H: Standard = $5.00, Bulk = $4.50 but invalid Bulk threshold (threshold <= MOQ) -> $5.00
const productCaseH = {
  id: "prod_h",
  name: "Case H T-Shirt",
  slug: "case-h-t-shirt",
  moq: 100,
  wholesalePrice: 5.0,
  bulkPricingEnabled: true,
  bulkThreshold: 50, // Invalid: threshold (50) is less than MOQ (100)
  bulkPrice: 4.5,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseH),
  5.0,
  "CASE H: Invalid bulk threshold (<= moq) -> Bulk price ignored, standard ($5.00) returned."
);
console.log("✓ CASE H Passed: Invalid bulk threshold (<= MOQ) ignored -> Standard ($5.00)");

// CASE I: Full Stock price higher than Standard price -> Standard price returned (always lowest!)
const productCaseI = {
  id: "prod_i",
  name: "Case I T-Shirt",
  slug: "case-i-t-shirt",
  moq: 10,
  availableStock: 200,
  wholesalePrice: 5.0,
  fullStockPrice: 6.0, // Configured higher than standard
  isFullStockEligible: true,
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseI),
  5.0,
  "CASE I: Even if full stock price is configured higher, lowest valid price ($5.00) must win."
);
console.log("✓ CASE I Passed: Compares candidates and selects the real lowest ($5.00)");

// CASE J: Authoritative backend field takes precedence
const productCaseJ = {
  id: "prod_j",
  name: "Case J T-Shirt",
  slug: "case-j-t-shirt",
  wholesalePrice: 5.0,
  effectiveCustomerUnitPrice: 4.1, // Authoritative backend field
};
assert.strictEqual(
  getLowestValidCustomerUnitPrice(productCaseJ),
  4.1,
  "CASE J: Authoritative backend field effectiveCustomerUnitPrice ($4.10) is respected directly."
);
console.log("✓ CASE J Passed: Authoritative backend field takes immediate precedence ($4.10)");

// =========================================================================
// 2. STOREFRONT CONVERSION (toStorefrontProduct)
// =========================================================================
console.log("\n▶ 2. toStorefrontProduct Service Transformation");

const rawApiProduct = {
  id: "1834",
  name: "Ladies' Embroidered Mesh Brief",
  slug: "ladies-embroidered-mesh-brief",
  moq: 50,
  wholesale_price: 6.0,
  bulk_pricing_enabled: true,
  bulk_threshold: 200,
  bulk_price: 5.2,
  full_stock_price: 4.8,
  is_full_stock_eligible: true,
  available_stock: 1000,
};

const storefrontProduct = toStorefrontProduct(rawApiProduct);
assert.strictEqual(
  storefrontProduct.price,
  4.8,
  "toStorefrontProduct sets .price to lowest valid unit price ($4.80)"
);
assert.strictEqual(
  storefrontProduct.effectiveCustomerUnitPrice,
  4.8,
  "toStorefrontProduct sets .effectiveCustomerUnitPrice to 4.80"
);
assert.strictEqual(
  storefrontProduct.standardPrice,
  6.0,
  "toStorefrontProduct preserves base .standardPrice ($6.00) for detail view"
);
assert.strictEqual(
  storefrontProduct.bulkPrice,
  5.2,
  "toStorefrontProduct preserves .bulkPrice ($5.20) for detail view"
);
console.log("✓ toStorefrontProduct sets lowest unit price while preserving tier breakdown.");

// =========================================================================
// 3. PRODUCT CARD COMPONENT STATIC INSPECTION
// =========================================================================
console.log("\n▶ 3. ProductCard Source Code Inspection");

const rootDir = path.resolve(__dirname, "..");
const cardPath = path.join(rootDir, "src/components/product/ProductCard.tsx");
const cardContent = fs.readFileSync(cardPath, "utf8");

assert(
  cardContent.includes("getLowestValidCustomerUnitPrice(product)"),
  "ProductCard must use getLowestValidCustomerUnitPrice helper"
);
assert(
  cardContent.includes("formatPrice(lowestUnitPrice)"),
  "ProductCard must format the lowest unit price"
);
assert(
  cardContent.includes("/ pc"),
  "ProductCard must retain the / pc unit indicator"
);
assert(
  !cardContent.includes("product.price || 0") && !cardContent.includes("product.price ?? 0"),
  "ProductCard must NOT contain unsafe fallback 'product.price || 0'"
);
assert(
  !cardContent.includes("costPrice") && !cardContent.includes("purchasePrice"),
  "ProductCard must NEVER display Purchase/Cost Price"
);

console.log("✓ ProductCard static inspection passed: displays lowest unit price, / pc, and safe fallback.");

// =========================================================================
// 4. SEARCH OVERLAY STATIC INSPECTION
// =========================================================================
console.log("\n▶ 4. SearchOverlay Source Code Inspection");

const searchPath = path.join(rootDir, "src/components/layout/SearchOverlay.tsx");
const searchContent = fs.readFileSync(searchPath, "utf8");

assert(
  searchContent.includes("getLowestValidCustomerUnitPrice(product)"),
  "SearchOverlay must use getLowestValidCustomerUnitPrice"
);
assert(
  !searchContent.includes("product.price || product.wholesalePrice || 0"),
  "SearchOverlay must not use unsafe || 0 price fallback"
);

console.log("✓ SearchOverlay static inspection passed.");

// =========================================================================
// 5. PRODUCT DETAIL VIEW PRESERVATION
// =========================================================================
console.log("\n▶ 5. ProductDetailView Pricing Breakdown Preservation");

const detailPath = path.join(rootDir, "src/app/products/[slug]/ProductDetailView.tsx");
const detailContent = fs.readFileSync(detailPath, "utf8");

assert(detailContent.includes("standardPrice"), "ProductDetailView must retain standardPrice");
assert(detailContent.includes("hasBulkTier"), "ProductDetailView must retain hasBulkTier");
assert(detailContent.includes("bulkPrice"), "ProductDetailView must retain bulkPrice");
assert(detailContent.includes("fullStockPrice"), "ProductDetailView must retain fullStockPrice");
assert(detailContent.includes("isFullStockEligible"), "ProductDetailView must retain isFullStockEligible");

console.log("✓ ProductDetailView full pricing breakdown (Standard, Bulk, Full Stock) is verified intact.");

console.log("\n==================================================");
console.log("ALL LOWEST CUSTOMER UNIT PRICE TESTS PASSED!");
console.log("==================================================");
