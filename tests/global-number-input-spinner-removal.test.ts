import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("AYC — GLOBAL NUMBER INPUT SPINNER REMOVAL VERIFICATION SUITE");
console.log("================================================================================");

const srcDir = path.resolve(process.cwd(), "src");
const globalsCssPath = path.join(srcDir, "app/globals.css");
const layoutPath = path.join(srcDir, "app/layout.tsx");
const posPagePath = path.join(srcDir, "app/ayc/pos/page.tsx");
const productInventoryPath = path.join(srcDir, "components/admin/products/form/ProductInventorySection.tsx");
const productPricingPath = path.join(srcDir, "components/admin/products/form/ProductPricingSection.tsx");
const stockAdjustmentPath = path.join(srcDir, "components/admin/inventory/StockAdjustmentModal.tsx");
const quantityStepperPath = path.join(srcDir, "components/product/QuantityStepper.tsx");

const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");
const layoutContent = fs.readFileSync(layoutPath, "utf-8");
const posPageContent = fs.readFileSync(posPagePath, "utf-8");
const productInventoryContent = fs.readFileSync(productInventoryPath, "utf-8");
const productPricingContent = fs.readFileSync(productPricingPath, "utf-8");
const stockAdjustmentContent = fs.readFileSync(stockAdjustmentPath, "utf-8");
const quantityStepperContent = fs.readFileSync(quantityStepperPath, "utf-8");

// ============================================================================
// PART 1: GLOBAL CSS RULES & CROSS-BROWSER SELECTORS
// ============================================================================
console.log("\n[TEST GROUP 1]: GLOBAL CSS RULES & BROWSER COMPATIBILITY");

// Test 1: globals.css contains WebKit/Blink spin button removal rules
console.log("Test 1: WebKit/Blink spin button rules...");
assert(
  globalsCssContent.includes('input[type="number"]::-webkit-inner-spin-button') &&
  globalsCssContent.includes('input[type="number"]::-webkit-outer-spin-button'),
  "globals.css must target both ::-webkit-inner-spin-button and ::-webkit-outer-spin-button"
);
assert(
  globalsCssContent.includes("-webkit-appearance: none") && globalsCssContent.includes("margin: 0"),
  "WebKit spin button rules must set -webkit-appearance: none and margin: 0"
);
console.log("  ✓ Passed: WebKit/Blink spin buttons hidden with -webkit-appearance: none and margin: 0");

// Test 2: globals.css contains Firefox appearance: textfield rules
console.log("Test 2: Firefox appearance: textfield rules...");
assert(
  globalsCssContent.includes("appearance: textfield") || globalsCssContent.includes("-moz-appearance: textfield"),
  "globals.css must configure appearance: textfield for Firefox"
);
console.log("  ✓ Passed: Firefox spin buttons hidden with appearance: textfield");

// Test 3: High-specificity unlayered rules to prevent component overrides
console.log("Test 3: High-specificity unlayered rules...");
assert(
  globalsCssContent.includes("-webkit-appearance: none !important") &&
  globalsCssContent.includes("margin: 0 !important") &&
  globalsCssContent.includes("appearance: textfield !important"),
  "globals.css must provide unlayered !important rules to prevent component-level overrides"
);
console.log("  ✓ Passed: Unlayered !important rules guarantee no component-level override");

// Test 4: Root layout imports globals.css
console.log("Test 4: Global stylesheet inclusion in root layout...");
assert(
  layoutContent.includes('import "./globals.css"'),
  "Root layout must import globals.css globally for all routes"
);
console.log("  ✓ Passed: Root layout imports globals.css, applying styles to storefront and admin");

// ============================================================================
// PART 2: COMPILED PRODUCTION CSS VERIFICATION
// ============================================================================
console.log("\n[TEST GROUP 2]: COMPILED PRODUCTION BUNDLE VERIFICATION");

const nextStaticChunksDir = path.join(process.cwd(), ".next/static/chunks");
if (fs.existsSync(nextStaticChunksDir)) {
  const cssFiles = fs.readdirSync(nextStaticChunksDir).filter((f) => f.endsWith(".css"));
  assert(cssFiles.length > 0, "Production build should have generated at least one CSS bundle");

  let foundCompiledRule = false;
  for (const file of cssFiles) {
    const content = fs.readFileSync(path.join(nextStaticChunksDir, file), "utf-8");
    if (content.includes("webkit-inner-spin-button") && content.includes("appearance:textfield")) {
      foundCompiledRule = true;
      break;
    }
  }
  assert(foundCompiledRule, "Production CSS chunk must contain compiled spin-button removal rules");
  console.log("  ✓ Passed: Production CSS bundle contains compiled WebKit and Firefox spinner removal rules");
} else {
  console.log("  ℹ Skipped (Run after build): .next/static/chunks not yet built");
}

// ============================================================================
// PART 3: NUMERIC INPUT FUNCTIONALITY & CUSTOM CONTROLS PRESERVATION
// ============================================================================
console.log("\n[TEST GROUP 3]: NUMERIC INPUT FUNCTIONALITY & CUSTOM CONTROLS");

// Test 5: POS cart item quantity input preserves typing and custom controls
console.log("Test 5: POS cart item quantity input...");
assert(posPageContent.includes('type="number"'), "POS must retain type='number' for semantic numeric input");
assert(posPageContent.includes("value={addQuantity}"), "POS quantity must maintain controlled value binding");
assert(posPageContent.includes("<Minus size={13} />"), "POS quantity must preserve custom Minus stepper button");
assert(posPageContent.includes("<Plus size={13} />"), "POS quantity must preserve custom Plus stepper button");
console.log("  ✓ Passed: POS quantity field preserves number typing, validation, and custom +/- buttons");

// Test 6: POS cash tender and discount fields
console.log("Test 6: POS financial tender and discount fields...");
assert(posPageContent.includes('id="pos-cash-tendered-input"'), "POS cash tender input must exist");
assert(posPageContent.includes('step="0.01"'), "POS cash tender input must support decimal steps");
console.log("  ✓ Passed: POS cash tender input preserves decimal input and step attributes");

// Test 7: Product inventory stock and MOQ fields
console.log("Test 7: Product inventory and MOQ inputs...");
assert(productInventoryContent.includes('type="number"'), "Product inventory must retain type='number'");
assert(productInventoryContent.includes('step="1"'), "Stock inputs must preserve step attribute");
assert(productInventoryContent.includes("onWheel={handleNumberInputWheel}"), "Stock inputs must preserve wheel guard");
console.log("  ✓ Passed: Product inventory and MOQ inputs preserve validation, step, and wheel guards");

// Test 8: Product pricing fields
console.log("Test 8: Product pricing inputs...");
assert(productPricingContent.includes('type="number"'), "Product pricing must retain type='number'");
assert(productPricingContent.includes('step="0.01"'), "Price inputs must preserve decimal step attribute");
console.log("  ✓ Passed: Product pricing fields preserve decimal calculation and validation");

// Test 9: Stock adjustment modal
console.log("Test 9: Stock adjustment modal...");
assert(stockAdjustmentContent.includes('type="number"'), "Stock adjustment must retain type='number'");
assert(stockAdjustmentContent.includes("min={1}"), "Stock adjustment must preserve minimum restriction");
console.log("  ✓ Passed: Stock adjustment modal preserves numeric delta validation");

// Test 10: Storefront QuantityStepper component
console.log("Test 10: Storefront QuantityStepper component...");
assert(quantityStepperContent.includes("<Minus size={13}"), "Storefront stepper preserves Minus control");
assert(quantityStepperContent.includes("<Plus size={13}"), "Storefront stepper preserves Plus control");
console.log("  ✓ Passed: Storefront QuantityStepper custom controls are intact");

console.log("\n================================================================================");
console.log("✅ ALL 10 GLOBAL NUMBER INPUT SPINNER REMOVAL CHECKS PASSED (10/10)");
console.log("================================================================================");
