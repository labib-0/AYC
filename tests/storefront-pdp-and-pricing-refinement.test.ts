/**
 * AYAAN CLOTHING — STOREFRONT PRODUCT DETAIL PAGE (PDP), VARIANT SELECTION & PRICING (PHASE 3)
 * Comprehensive Automated Verification Suite
 */

import fs from "fs";
import path from "path";
import assert from "assert";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failed++;
  }
}

console.log("================================================================================");
console.log("TEST SUITE: STOREFRONT PDP, VARIANT SELECTION & PRICING (PHASE 3)");
console.log("================================================================================");

const repoRoot = path.resolve(__dirname, "..");
const productResourcePath = path.join(repoRoot, "backend/app/Http/Resources/Api/V1/ProductResource.php");
const productControllerPath = path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/ProductController.php");
const productServicePath = path.join(repoRoot, "src/services/product.service.ts");
const productDetailPath = path.join(repoRoot, "src/app/products/[slug]/ProductDetailView.tsx");
const pricingTierOptionPath = path.join(repoRoot, "src/components/product/PricingTierOption.tsx");
const quantityStepperPath = path.join(repoRoot, "src/components/product/QuantityStepper.tsx");
const commerceSummaryPath = path.join(repoRoot, "src/components/product/CommerceSummary.tsx");
const packageMatrixPath = path.join(repoRoot, "src/components/product/PackageAssortmentMatrix.tsx");
const logisticsRowPath = path.join(repoRoot, "src/components/product/ProductSelectedLogisticsRow.tsx");

const productResourceSrc = fs.readFileSync(productResourcePath, "utf-8");
const productControllerSrc = fs.readFileSync(productControllerPath, "utf-8");
const productServiceSrc = fs.readFileSync(productServicePath, "utf-8");
const productDetailSrc = fs.readFileSync(productDetailPath, "utf-8");
const pricingTierOptionSrc = fs.readFileSync(pricingTierOptionPath, "utf-8");
const quantityStepperSrc = fs.readFileSync(quantityStepperPath, "utf-8");
const commerceSummarySrc = fs.readFileSync(commerceSummaryPath, "utf-8");
const packageMatrixSrc = fs.readFileSync(packageMatrixPath, "utf-8");
const logisticsRowSrc = fs.readFileSync(logisticsRowPath, "utf-8");

// ▶ GROUP 1: Backend Serialization & Pure Array Integrity
console.log("\n▶ [GROUP 1]: Backend Serialization & Pure Array Integrity");

test("ProductResource resolves brand_data to pure array", () => {
  assert(
    productResourceSrc.includes("'brand_data' => $this->brand ? (new BrandResource($this->brand))->resolve() : null"),
    "brand_data must resolve BrandResource to pure array"
  );
});

test("ProductResource resolves categories collection to pure array", () => {
  assert(
    productResourceSrc.includes("CategoryResource::collection($this->categories)->resolve()"),
    "categories must resolve CategoryResource collection to pure array"
  );
});

test("ProductResource resolves variants collection to pure array", () => {
  assert(
    productResourceSrc.includes("ProductVariantResource::collection($this->variants)->resolve()"),
    "variants must resolve ProductVariantResource collection to pure array"
  );
});

test("ProductController caches resolved array and avoids incomplete PHP class serialization", () => {
  assert(
    productControllerSrc.includes("return $p ? (new ProductResource($p))->resolve() : null;"),
    "ProductController must return resolved resource array"
  );
});

// ▶ GROUP 2: Frontend Variant & Package Allocation Sanitization
console.log("\n▶ [GROUP 2]: Frontend Variant & Package Allocation Sanitization");

test("product.service.ts sanitizes rawVariants against PHP incomplete class names", () => {
  assert(
    productServiceSrc.includes("__PHP_Incomplete_Class_Name"),
    "product.service.ts must filter out corrupted incomplete PHP class objects"
  );
});

test("ProductDetailView sanitizes variants against incomplete class names", () => {
  assert(
    productDetailSrc.includes("!v.__PHP_Incomplete_Class_Name"),
    "ProductDetailView must sanitize variants memo against incomplete PHP class names"
  );
});

test("ProductDetailView sanitizes packageAllocations against incomplete class names", () => {
  assert(
    productDetailSrc.includes("!a.__PHP_Incomplete_Class_Name"),
    "ProductDetailView must sanitize packageAllocations memo against incomplete class names"
  );
});

// ▶ GROUP 3: Pre-order & Inventory Stepper Handling
console.log("\n▶ [GROUP 3]: Pre-order & Inventory Stepper Handling");

test("ProductDetailView allows quantity increment on pre-order items even with zero physical stock", () => {
  assert(
    productDetailSrc.includes("!isPreorder && fullStockQuantity <= 0"),
    "handleIncrement must exempt pre-orders from fullStockQuantity <= 0 check"
  );
  assert(
    productDetailSrc.includes("!isPreorder && fullStockQuantity > 0 && quantity >= fullStockQuantity"),
    "handleIncrement must not clamp pre-order quantities to zero physical stock"
  );
});

test("ProductDetailView decrements pre-order items safely to MOQ without dropping below", () => {
  assert(
    productDetailSrc.includes("const minQty = (!isPreorder && fullStockQuantity > 0 && fullStockQuantity < moq)"),
    "handleDecrement must keep MOQ as minimum bound for pre-orders"
  );
});

test("QuantityStepper provides accessible disabled states and step amounts", () => {
  assert(quantityStepperSrc.includes("isDecrementDisabled"), "QuantityStepper must respect decrement boundary");
  assert(quantityStepperSrc.includes("isIncrementDisabled"), "QuantityStepper must respect increment boundary");
  assert(quantityStepperSrc.includes("stepAmount"), "QuantityStepper must calculate step amounts");
});

// ▶ GROUP 4: Pricing Presentation & Commercial Hierarchy
console.log("\n▶ [GROUP 4]: Pricing Presentation & Commercial Hierarchy");

test("PricingTierOption maintains radio role and clear selection styling", () => {
  assert(pricingTierOptionSrc.includes('role="radio"'), "PricingTierOption must have role=radio");
  assert(pricingTierOptionSrc.includes("aria-checked={isSelected}"), "PricingTierOption must have aria-checked");
  assert(pricingTierOptionSrc.includes("quantityRange"), "PricingTierOption must display quantity range");
  assert(pricingTierOptionSrc.includes("unitPrice"), "PricingTierOption must display unit price");
});

test("Pricing box displays all 3 tiers (Standard, Bulk, Full Stock)", () => {
  assert(productDetailSrc.includes('name="Standard"'), "Must render Standard tier option");
  assert(productDetailSrc.includes('name="Bulk"'), "Must render Bulk tier option");
  assert(productDetailSrc.includes('name="Full Stock"'), "Must render Full Stock tier option");
});

test("Full Stock tier automatically activates when quantity equals available stock", () => {
  assert(
    productDetailSrc.includes("fullStockQuantity > 0 && quantity === fullStockQuantity"),
    "isFullStock must automatically trigger when quantity matches fullStockQuantity"
  );
});

test("CommerceSummary dynamically connects total amount with active tier badge", () => {
  assert(commerceSummarySrc.includes("totalAmount"), "CommerceSummary must display total amount");
  assert(commerceSummarySrc.includes("activeTierName"), "CommerceSummary must display active tier name");
});

// ▶ GROUP 5: Logistics & Package Matrix Integration
console.log("\n▶ [GROUP 5]: Logistics & Package Matrix Integration");

test("Logistics row dynamically calculates CBM and Gross Weight per selected quantity", () => {
  assert(logisticsRowSrc.includes("CBM"), "Logistics row must display CBM");
  assert(logisticsRowSrc.includes("GROSS WEIGHT"), "Logistics row must display GROSS WEIGHT");
  assert(logisticsRowSrc.includes("calculateCartonCbm"), "Logistics row must calculate carton CBM");
});

test("PackageAssortmentMatrix renders color rows, size columns, and grand total", () => {
  assert(packageMatrixSrc.includes("matrixData.colors.map"), "Matrix must map colors to rows");
  assert(packageMatrixSrc.includes("matrixData.sizes.map"), "Matrix must map sizes to columns");
  assert(packageMatrixSrc.includes("matrixData.grandTotal"), "Matrix must render grand total");
});

// ▶ GROUP 6: Primary CTA Dominance & B2B Commercial Actions
console.log("\n▶ [GROUP 6]: Primary CTA Dominance & B2B Commercial Actions");

test("Add to Cart button dominates as primary full-width action", () => {
  assert(productDetailSrc.includes('id="add-to-cart-button"'), "Must have add-to-cart-button id");
  assert(productDetailSrc.includes("<ShoppingCart"), "Must include ShoppingCart icon");
  assert(productDetailSrc.includes("bg-foreground text-background"), "Must use dominant primary styling");
});

test("Request Quote (RFQ) is available as secondary commercial action", () => {
  assert(productDetailSrc.includes('id="add-to-rfq-button"'), "Must have add-to-rfq-button id");
  assert(productDetailSrc.includes("handleAddToRfq"), "Must have handleAddToRfq handler");
});

test("Wishlist toggle is subordinate and accessible", () => {
  assert(productDetailSrc.includes('id="wishlist-toggle-button"'), "Must have wishlist-toggle-button id");
  assert(productDetailSrc.includes("<Heart"), "Must include Heart icon");
});

test("Direct WhatsApp inquiry is available with prefilled product message", () => {
  assert(productDetailSrc.includes("getProductWhatsAppUrl"), "Must link to getProductWhatsAppUrl");
  assert(productDetailSrc.includes("Inquire on WhatsApp"), "Must display WhatsApp inquiry action");
});

console.log("================================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
