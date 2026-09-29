import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================");
console.log("CLEANUP AUDIT: VARIANT PREVIEW, RESERVED STOCK, PACKAGING CBM");
console.log("==================================================\n");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const backendDir = path.join(rootDir, "backend");

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. VARIANT PREVIEW COMPLETELY REMOVED
// -----------------------------------------------------------------------------
console.log("▶ 1. Checking Variant Preview Deletion:");

test("1.1 ProductVariantsSection has no matrix table preview toggle or Est. Stock", () => {
  const content = fs.readFileSync(
    path.join(srcDir, "components/admin/products/form/ProductVariantsSection.tsx"),
    "utf-8"
  );
  assert(!content.includes("showMatrixPreview"), "Must not have showMatrixPreview state");
  assert(!content.includes("Hide Variants Table Preview"), "Must not have Hide Variants Table Preview button");
  assert(!content.includes("View Generated Variants"), "Must not have View Generated Variants toggle");
  assert(!content.includes("Est. Stock"), "Must not have Est. Stock column header");
  assert(!content.includes("avgStockPerVariant"), "Must not calculate avgStockPerVariant");
  assert(!content.includes("Variant Title"), "Must not render preview variant table");
});

test("1.2 ProductPackageBreakdownSection has no secondary preview table or toggle", () => {
  const content = fs.readFileSync(
    path.join(srcDir, "components/admin/products/form/ProductPackageBreakdownSection.tsx"),
    "utf-8"
  );
  assert(!content.includes("Hide Variant Preview"), "Must not have Hide Variant Preview");
  assert(!content.includes("Variant Title"), "Must not have Variant Title");
  assert(!content.includes("Est. Stock"), "Must not have Est. Stock");
  assert(!content.includes("showVariantPreview"), "Must not have showVariantPreview");
});

// -----------------------------------------------------------------------------
// 2. RESERVED STOCK COMPLETELY REMOVED FROM FRONTEND
// -----------------------------------------------------------------------------
console.log("\n▶ 2. Checking Reserved Stock Removal from Frontend:");

test("2.1 ProductInventorySection contains no Reserved Stock UI labels or props", () => {
  const content = fs.readFileSync(
    path.join(srcDir, "components/admin/products/form/ProductInventorySection.tsx"),
    "utf-8"
  );
  assert(!content.includes("Reserved Stock"), "Must not contain 'Reserved Stock' UI label");
  assert(!content.includes("reservedStock?:"), "Must not have reservedStock in props interface");
  assert(!content.includes("reserved_quantity"), "Must not have reserved_quantity in warehouseBreakdown");
  assert(!content.includes("createReserved"), "Must not calculate createReserved");
  assert(!content.includes("editReserved"), "Must not calculate editReserved");
  assert(content.includes("On Hand Stock:"), "Summary must display On Hand Stock");
  assert(content.includes("Available Stock:"), "Summary must display Available Stock");
  assert(content.includes("Complete MOQs Available:"), "Summary must display Complete MOQs Available");
});

test("2.2 InventoryTable and InventoryRow contain no Reserved Stock column", () => {
  const tableContent = fs.readFileSync(
    path.join(srcDir, "components/admin/inventory/InventoryTable.tsx"),
    "utf-8"
  );
  assert(!tableContent.includes("<th className=\"py-3 px-3 text-right\">Reserved</th>"), "Table header must not have Reserved column");
  assert(!tableContent.includes("totalStock - reserved"), "Must not calculate available as totalStock - reserved");

  const rowContent = fs.readFileSync(
    path.join(srcDir, "components/admin/inventory/InventoryRow.tsx"),
    "utf-8"
  );
  assert(!rowContent.includes("record.reserved_quantity"), "Must not read reserved_quantity");
  assert(!rowContent.includes("totalStock - reserved"), "Must not subtract reserved from totalStock");
});

test("2.3 product.service.ts and types have no reservedStock exports or fields", () => {
  const svcContent = fs.readFileSync(
    path.join(srcDir, "services/product.service.ts"),
    "utf-8"
  );
  assert(!svcContent.includes("reservedStock:"), "Must not export reservedStock");
  assert(!svcContent.includes("reserved_stock:"), "Must not export reserved_stock");
  assert(!svcContent.includes("onHandStock - reservedStock"), "Available stock must not subtract reservedStock");

  const typesContent = fs.readFileSync(
    path.join(srcDir, "types/index.ts"),
    "utf-8"
  );
  assert(!typesContent.includes("reservedStock?:"), "index.ts must not have reservedStock in B2BProduct");

  const b2bTypes = fs.readFileSync(
    path.join(srcDir, "types/b2b.ts"),
    "utf-8"
  );
  assert(!b2bTypes.includes("reservedStock?:"), "b2b.ts must not have reservedStock");
  assert(!b2bTypes.includes("reserved_stock?:"), "b2b.ts must not have reserved_stock");
});

// -----------------------------------------------------------------------------
// 3. RESERVED STOCK COMPLETELY REMOVED FROM BACKEND & DATABASE
// -----------------------------------------------------------------------------
console.log("\n▶ 3. Checking Reserved Stock Removal from Backend & Database:");

test("3.1 Product model defines Available Stock = On Hand Stock", () => {
  const productModel = fs.readFileSync(
    path.join(backendDir, "app/Models/Product.php"),
    "utf-8"
  );
  assert(!productModel.includes("getReservedStock()"), "Must not have getReservedStock method");
  assert(!productModel.includes("max(0, $onHand - $reserved)"), "Must not subtract reserved in getTotalAvailableStock");
  assert(productModel.includes("return $this->getOnHandStock();"), "getTotalAvailableStock must return getOnHandStock");
  assert(!productModel.includes("$warehouses[$whId]['reserved_quantity']"), "Warehouse breakdown must not include reserved_quantity");
});

test("3.2 ProductResource exposes no reserved_stock or reservedStock", () => {
  const resource = fs.readFileSync(
    path.join(backendDir, "app/Http/Resources/Api/V1/ProductResource.php"),
    "utf-8"
  );
  assert(!resource.includes("'reserved_stock'"), "Resource must not expose reserved_stock");
  assert(!resource.includes("'reservedStock'"), "Resource must not expose reservedStock");
});

test("3.3 Migration exists to safely remove reserved_quantity from inventories table", () => {
  const migrations = fs.readdirSync(path.join(backendDir, "database/migrations"));
  const removeMigration = migrations.find((m) => m.includes("remove_reserved_quantity_from_inventories_table"));
  assert(removeMigration, "Migration to drop reserved_quantity from inventories must exist");

  const invModel = fs.readFileSync(
    path.join(backendDir, "app/Models/Inventory.php"),
    "utf-8"
  );
  assert(!invModel.includes("'reserved_quantity'"), "Inventory model must not have reserved_quantity in fillable or casts");
});

// -----------------------------------------------------------------------------
// 4. PACKAGING CBM SIMPLIFICATION
// -----------------------------------------------------------------------------
console.log("\n▶ 4. Checking Packaging CBM Simplification:");

test("4.1 ProductShippingSection has no user-facing Single Carton CBM field", () => {
  const shippingSection = fs.readFileSync(
    path.join(srcDir, "components/admin/products/form/ProductShippingSection.tsx"),
    "utf-8"
  );
  assert(!shippingSection.includes("Single Carton CBM"), "Must not display Single Carton CBM label");
  assert(shippingSection.includes("Total CBM"), "Must display Total CBM");
  assert(shippingSection.includes("Total Gross Weight"), "Must display Total Gross Weight");
  assert(shippingSection.includes("Gross Weight / Carton"), "Must display Gross Weight / Carton");
  assert(shippingSection.includes("Carton Count"), "Must display Carton Count");
});

test("4.2 Total CBM internal calculation is fully preserved", () => {
  const shippingSection = fs.readFileSync(
    path.join(srcDir, "components/admin/products/form/ProductShippingSection.tsx"),
    "utf-8"
  );
  assert(shippingSection.includes("calculateTotalCbm("), "Must use authoritative calculateTotalCbm");
  assert(shippingSection.includes("totalCbm = singleCartonCbm !== null && cartonCount !== null"), "Must compute totalCbm from intermediate carton volume");
});

test("4.3 Backend ProductResource and Product model do not expose single_carton_cbm", () => {
  const resource = fs.readFileSync(
    path.join(backendDir, "app/Http/Resources/Api/V1/ProductResource.php"),
    "utf-8"
  );
  assert(!resource.includes("'single_carton_cbm'"), "ProductResource must not expose single_carton_cbm");

  const productModel = fs.readFileSync(
    path.join(backendDir, "app/Models/Product.php"),
    "utf-8"
  );
  assert(!productModel.includes("'single_carton_cbm'"), "Product model shipping specs must not include single_carton_cbm");
});

test("4.4 ProductLogisticsSummary does not expose singleCartonCbm in UI subtext", () => {
  const summary = fs.readFileSync(
    path.join(srcDir, "components/product/ProductLogisticsSummary.tsx"),
    "utf-8"
  );
  assert(!summary.includes("m³/ctn"), "Must not display m³/ctn subtext under Total CBM");
});

console.log("\n==================================================");
console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
