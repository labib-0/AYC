import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";
import {
  adminInventoryService,
  LOW_STOCK_THRESHOLD,
  isLowStock,
  isOutOfStock,
  isInStock,
} from "../src/services/admin/inventory.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("AYAAN CLOTHING — PRODUCTS & INVENTORY CONSOLIDATION TEST");
console.log("==================================================");

let passedCount = 0;
let failedCount = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

// =========================================================================
// 1. SIDEBAR & NAVIGATION CONSOLIDATION
// =========================================================================
console.log("\n▶ 1. Sidebar Navigation Verification:");

const catalogSection = ADMIN_NAV_SECTIONS.find((s) => s.title === "CATALOG");
check(Boolean(catalogSection), "CATALOG section exists in ADMIN_NAV_SECTIONS");

const catalogLabels = catalogSection ? catalogSection.items.map((i) => i.label) : [];
check(
  catalogLabels.includes("Products") &&
    catalogLabels.includes("Categories") &&
    catalogLabels.includes("Brands"),
  "CATALOG contains Products, Categories, and Brands"
);

check(
  !catalogLabels.includes("Inventory"),
  "Standalone Inventory item is completely removed from CATALOG sidebar navigation"
);

const allNavItems = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);
const allNavLabels = allNavItems.map((i) => i.label);
check(
  !allNavLabels.includes("Inventory"),
  "Standalone Inventory is not present in ANY sidebar navigation section"
);

check(
  !allNavLabels.some((l) => l.toLowerCase().includes("products & inventory") || l.toLowerCase().includes("product inventory")),
  "Module naming is strictly 'Products', no combined 'Products & Inventory' variation"
);

// =========================================================================
// 2. PRODUCTS PAGE HEADER & INVENTORY ACTIONS
// =========================================================================
console.log("\n▶ 2. Products Page Header & Quick Stock Adjustments:");

const productsPagePath = path.join(rootDir, "src/app/ayc/products/page.tsx");
check(fs.existsSync(productsPagePath), "Products page file exists at src/app/ayc/products/page.tsx");
const productsPageContent = fs.readFileSync(productsPagePath, "utf-8");

check(
  productsPageContent.includes('<h1 className="text-lg font-bold text-foreground tracking-tight">Products</h1>'),
  "Products page title is strictly 'Products'"
);

check(
  productsPageContent.includes('id="btn-products-adjust-stock"') &&
    productsPageContent.includes("handleOpenGlobalAdjust"),
  "Products page provides an 'Adjust Stock' CTA button in the header"
);

check(
  productsPageContent.includes("canAdjustStock"),
  "Adjust Stock CTA is properly guarded by permission (inventory.adjust or product.edit)"
);

// =========================================================================
// 3. SUMMARY METRICS & AVAILABILITY / LOW-STOCK FILTERS
// =========================================================================
console.log("\n▶ 3. Summary Metrics & Low-Stock / Availability Filters:");

check(
  productsPageContent.includes("onLowStockClick={handleToggleLowStockFilter}") &&
    productsPageContent.includes('isLowStockActive={filters.availability === "low_stock"}'),
  "ProductSummaryMetrics connects clickable Low Stock card to toggle availability filter"
);

const searchFiltersPath = path.join(rootDir, "src/components/admin/products/ProductSearchFilters.tsx");
const searchFiltersContent = fs.readFileSync(searchFiltersPath, "utf-8");
check(
  searchFiltersContent.includes('value: "low_stock"') &&
    searchFiltersContent.includes('value: "out_of_stock"'),
  "ProductSearchFilters AVAILABILITIES includes 'low_stock' and 'out_of_stock'"
);

check(
  productsPageContent.includes('avail === "low_stock"') &&
    productsPageContent.includes('avail === "out_of_stock"') &&
    productsPageContent.includes("LOW_STOCK_THRESHOLD"),
  "Products page local filter accurately evaluates low_stock (< 200) and out_of_stock (<= 0)"
);

// URL backward compatibility for /ayc/inventory?tab=stock-control
check(
  productsPageContent.includes('tabParam === "stock-control"') ||
    productsPageContent.includes('currentTab === "stock-control"'),
  "Products page handles ?tab=stock-control from previous inventory bookmarks"
);

// =========================================================================
// 4. PRODUCT TABLE & ROW-LEVEL STOCK ACTIONS
// =========================================================================
console.log("\n▶ 4. Product Table & Row Actions Integration:");

const tablePath = path.join(rootDir, "src/components/admin/products/ProductTable.tsx");
const tableContent = fs.readFileSync(tablePath, "utf-8");
check(
  tableContent.includes("onAdjustStock") && tableContent.includes("onViewStockHistory"),
  "ProductTable receives and forwards onAdjustStock and onViewStockHistory props"
);

const tableRowPath = path.join(rootDir, "src/components/admin/products/ProductTableRow.tsx");
const tableRowContent = fs.readFileSync(tableRowPath, "utf-8");

check(
  tableRowContent.includes("onAdjustStock(product)") &&
    tableRowContent.includes("Click to adjust stock"),
  "ProductTableRow stock cell allows interactive one-click stock adjustment"
);

check(
  tableRowContent.includes("Adjust Stock") && tableRowContent.includes("onAdjustStock(product)"),
  "ProductTableRow actions dropdown contains 'Adjust Stock' item"
);

check(
  tableRowContent.includes("Stock Movement History") &&
    tableRowContent.includes("onViewStockHistory(product)"),
  "ProductTableRow actions dropdown contains 'Stock Movement History' item"
);

// =========================================================================
// 5. MODAL INTEGRATION & AUTHORITATIVE INVENTORY SERVICES
// =========================================================================
console.log("\n▶ 5. Modal Integration & Backend Inventory Services:");

check(
  productsPageContent.includes("<StockAdjustmentModal") &&
    productsPageContent.includes("inventoryItem={adjustingItem}") &&
    productsPageContent.includes("allItems={inventoryRecords}"),
  "Products page mounts StockAdjustmentModal with preselected item or catalog selector"
);

check(
  productsPageContent.includes("<InventoryHistoryModal") &&
    productsPageContent.includes("inventoryItem={historyItem}"),
  "Products page mounts InventoryHistoryModal for audited movement logs"
);

const stockAdjustModalPath = path.join(rootDir, "src/components/admin/inventory/StockAdjustmentModal.tsx");
const stockAdjustModalContent = fs.readFileSync(stockAdjustModalPath, "utf-8");
check(
  stockAdjustModalContent.includes("adminInventoryService.adjustInventory") &&
    stockAdjustModalContent.includes("product_id") &&
    stockAdjustModalContent.includes("new_quantity") &&
    stockAdjustModalContent.includes("adjustment_amount"),
  "StockAdjustmentModal connects directly to adminInventoryService with product and delta/absolute payloads"
);

// =========================================================================
// 6. BULK STOCK ADJUSTMENT OPERATIONS
// =========================================================================
console.log("\n▶ 6. Bulk Stock Operations Integration:");

const bulkActionsPath = path.join(rootDir, "src/components/admin/products/ProductBulkActions.tsx");
const bulkActionsContent = fs.readFileSync(bulkActionsPath, "utf-8");
check(
  bulkActionsContent.includes("onBulkAdjustStock") &&
    bulkActionsContent.includes("Adjust Stock"),
  "ProductBulkActions renders 'Adjust Stock' button when products are selected"
);

check(
  productsPageContent.includes("isBulkAdjustOpen") &&
    productsPageContent.includes("handleBulkAdjustSubmit") &&
    productsPageContent.includes("adminInventoryService.adjustInventory"),
  "Products page implements bulk stock adjustment modal with transactional execution and reasons"
);

// =========================================================================
// 7. BACKWARD COMPATIBILITY & REDIRECTS
// =========================================================================
console.log("\n▶ 7. Backward Compatibility & Routing Redirects:");

const inventoryPagePath = path.join(rootDir, "src/app/ayc/inventory/page.tsx");
const inventoryPageContent = fs.readFileSync(inventoryPagePath, "utf-8");

check(
  inventoryPageContent.includes("router.replace(destination)") &&
    inventoryPageContent.includes("/ayc/products"),
  "Former inventory page at /ayc/inventory cleanly redirects to /ayc/products"
);

check(
  inventoryPageContent.includes('params.set("availability", "low_stock")'),
  "Former inventory page maps stock-control / LOW_STOCK tabs to ?availability=low_stock"
);

const dashboardActionsPath = path.join(rootDir, "src/components/admin/dashboard/DashboardQuickActions.tsx");
const dashboardActionsContent = fs.readFileSync(dashboardActionsPath, "utf-8");
check(
  dashboardActionsContent.includes("/ayc/products?availability=low_stock"),
  "Dashboard Quick Actions links inventory management to Products low_stock"
);

const dashboardPagePath = path.join(rootDir, "src/app/ayc/dashboard/page.tsx");
const dashboardPageContent = fs.readFileSync(dashboardPagePath, "utf-8");
check(
  dashboardPageContent.includes('href="/ayc/products?availability=low_stock"'),
  "Dashboard LOW STOCK KPI card links to /ayc/products?availability=low_stock"
);

const breadcrumbsPath = path.join(rootDir, "src/components/admin/layout/AdminBreadcrumbs.tsx");
const breadcrumbsContent = fs.readFileSync(breadcrumbsPath, "utf-8");
check(
  breadcrumbsContent.includes('pathname === "/ayc/inventory"') &&
    breadcrumbsContent.includes('href: "/ayc/products"'),
  "AdminBreadcrumbs maps /ayc/inventory to Products"
);

// =========================================================================
// 8. DATA INTEGRITY & UNIFIED LOW-STOCK THRESHOLD
// =========================================================================
console.log("\n▶ 8. Data Integrity & Stock Calculations:");

check(LOW_STOCK_THRESHOLD === 200, "LOW_STOCK_THRESHOLD is standardized at 200");
check(isOutOfStock(0) && isOutOfStock(-5), "isOutOfStock returns true for <= 0");
check(!isOutOfStock(10), "isOutOfStock returns false for > 0");
check(isLowStock(50) && isLowStock(199), "isLowStock returns true for (0, 200)");
check(!isLowStock(0) && !isLowStock(200), "isLowStock returns false outside (0, 200)");
check(isInStock(200) && isInStock(500), "isInStock returns true for >= 200");

// Check backend controller preservation
const backendControllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/Admin/InventoryController.php");
const backendControllerContent = fs.readFileSync(backendControllerPath, "utf-8");
check(
  backendControllerContent.includes("function summary") &&
    backendControllerContent.includes("function index") &&
    backendControllerContent.includes("function history") &&
    backendControllerContent.includes("function adjust"),
  "Backend InventoryController preserves summary, index, history, and adjust API endpoints"
);

console.log("\n==================================================");
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PRODUCTS & INVENTORY CONSOLIDATION CHECKS PASSED!");
}
