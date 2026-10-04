import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const AYC_ROOT = path.resolve(__dirname, "..");
const inventorySectionPath = path.join(
  AYC_ROOT,
  "src/components/admin/products/form/ProductInventorySection.tsx"
);
const productFormPath = path.join(
  AYC_ROOT,
  "src/components/admin/products/form/ProductForm.tsx"
);

console.log("==================================================");
console.log("TESTING COMPACT INVENTORY UI (ADD + EDIT PRODUCT)");
console.log("==================================================");

const inventorySectionSrc = fs.readFileSync(inventorySectionPath, "utf-8");
const productFormSrc = fs.readFileSync(productFormPath, "utf-8");

console.log("\n▶ Group 1: General Compact Geometry & AYC Admin Aesthetic");
// Verify container has compact padding
assert.ok(
  inventorySectionSrc.includes("rounded-xl") &&
  (inventorySectionSrc.includes("p-3 sm:p-4") || inventorySectionSrc.includes("p-3.5 sm:p-4")),
  "ProductInventorySection must use compact card padding (p-3 sm:p-4 or p-3.5 sm:p-4)"
);
assert.ok(
  inventorySectionSrc.includes("space-y-2.5"),
  "ProductInventorySection must use space-y-2.5 to eliminate excessive vertical gaps"
);
console.log("✓ Passed: Compact geometry verified.");

console.log("\n▶ Group 2: ADD PRODUCT — Compact 3-Column Inputs & Summary");
// Check 3-column grid
assert.ok(
  inventorySectionSrc.includes("grid grid-cols-1 md:grid-cols-3"),
  "Add Product must render a 3-column responsive grid"
);
assert.ok(
  inventorySectionSrc.includes("INITIAL STOCK UNITS"),
  "Add Product must render 'INITIAL STOCK UNITS' label"
);
assert.ok(
  inventorySectionSrc.includes("MOQ"),
  "Add Product must render 'MOQ' label"
);
assert.ok(
  inventorySectionSrc.includes("INITIAL WAREHOUSE"),
  "Add Product must render 'INITIAL WAREHOUSE' label"
);
assert.ok(
  inventorySectionSrc.includes("Select warehouse"),
  "Initial warehouse dropdown must default to empty 'Select warehouse'"
);
// Compact calculated summary directly underneath
assert.ok(
  inventorySectionSrc.includes("On Hand Stock:") &&
  inventorySectionSrc.includes("Available Stock:") &&
  inventorySectionSrc.includes("Complete MOQs Available:"),
  "Add Product must render On Hand Stock, Available Stock, and Complete MOQs Available summary directly underneath"
);
console.log("✓ Passed: Add Product compact 3-column layout and summary verified.");

console.log("\n▶ Group 3: EDIT PRODUCT — Header & Working Adjust Stock Button");
// Header contains title and active Adjust Stock button
assert.ok(
  inventorySectionSrc.includes("id=\"admin-product-adjust-stock-btn\""),
  "Edit Product must have #admin-product-adjust-stock-btn in header"
);
assert.ok(
  inventorySectionSrc.includes("canAdjust"),
  "Adjust Stock button must enforce authoritative canAdjust permission"
);
// Horizontal summary bar in single row
assert.ok(
  inventorySectionSrc.includes("On Hand") &&
  inventorySectionSrc.includes("Available") &&
  inventorySectionSrc.includes("Complete MOQs"),
  "Edit Product must render horizontal summary bar"
);
// Dedicated MOQ field
assert.ok(
  inventorySectionSrc.includes("PRODUCT MOQ (MINIMUM ORDER)"),
  "Edit Product must preserve dedicated 'PRODUCT MOQ (MINIMUM ORDER)' input"
);
console.log("✓ Passed: Edit Product header, Adjust Stock button, and summary bar verified.");

console.log("\n▶ Group 4: EDIT PRODUCT — Compact Warehouse Distribution Table");
// Warehouse table columns
assert.ok(
  inventorySectionSrc.includes("Warehouse Distribution"),
  "Edit Product must render 'Warehouse Distribution' section"
);
assert.ok(
  inventorySectionSrc.includes("<th className=\"px-3 py-1.5 font-bold\">Warehouse</th>") ||
  inventorySectionSrc.includes(">Warehouse</th>"),
  "Warehouse table must have Warehouse column"
);
assert.ok(
  inventorySectionSrc.includes(">Code</th>"),
  "Warehouse table must have Code column"
);
assert.ok(
  inventorySectionSrc.includes(">On Hand</th>"),
  "Warehouse table must have On Hand column"
);
assert.ok(
  inventorySectionSrc.includes(">Available</th>"),
  "Warehouse table must have Available column"
);
assert.ok(
  inventorySectionSrc.includes(">Action</th>"),
  "Warehouse table must have Action column"
);
// Per-warehouse Adjust button
assert.ok(
  inventorySectionSrc.includes("handleOpenAdjustModal(wh)"),
  "Warehouse table rows must have per-warehouse Adjust button"
);
console.log("✓ Passed: Compact warehouse distribution table verified.");

console.log("\n▶ Group 5: Adjust Stock Modal & Execution Flow");
// Modal elements
assert.ok(
  inventorySectionSrc.includes("Adjust Product Stock"),
  "Modal must have 'Adjust Product Stock' title"
);
assert.ok(
  inventorySectionSrc.includes("Target Warehouse *"),
  "Modal must require Target Warehouse"
);
assert.ok(
  inventorySectionSrc.includes("Add / Subtract Stock"),
  "Modal must support Add / Subtract Stock mode"
);
assert.ok(
  inventorySectionSrc.includes("Set Absolute Qty"),
  "Modal must support Set Absolute Qty mode"
);
assert.ok(
  inventorySectionSrc.includes("Reason for Adjustment *"),
  "Modal must require Reason for Adjustment"
);
assert.ok(
  inventorySectionSrc.includes("Notes (Optional)"),
  "Modal must have Notes (Optional) field"
);
assert.ok(
  inventorySectionSrc.includes("Confirm Adjustment"),
  "Modal must have 'Confirm Adjustment' submit button"
);
assert.ok(
  inventorySectionSrc.includes("isSubmittingAdjustment"),
  "Modal must prevent duplicate submissions while submitting"
);
assert.ok(
  inventorySectionSrc.includes("handleConfirmAdjustment"),
  "Modal must connect to handleConfirmAdjustment"
);
assert.ok(
  inventorySectionSrc.includes("onStockAdjusted"),
  "Inventory adjustment must invoke onStockAdjusted callback for reactive parent refresh"
);
assert.ok(
  productFormSrc.includes("onStockAdjusted="),
  "ProductForm must bind onStockAdjusted handler"
);
console.log("✓ Passed: Adjust Stock modal controls and submission flow verified.");

console.log("\n==================================================");
console.log("ALL COMPACT INVENTORY UI TESTS PASSED SUCCESSFULLY!");
console.log("==================================================");
