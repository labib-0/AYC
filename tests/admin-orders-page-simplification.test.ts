import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("AYAAN CLOTHING — ORDERS SIMPLIFICATION QA SUITE");
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
// 1. SIDEBAR & MODULE RENAMING VERIFICATION
// =========================================================================
console.log("\n▶ 1. Module Renaming (Orders Only):");

const commerceSection = ADMIN_NAV_SECTIONS.find((s) => s.title === "COMMERCE");
check(Boolean(commerceSection), "COMMERCE section exists in AdminSidebar");

const commerceLabels = commerceSection?.items.map((i) => i.label) || [];
check(commerceLabels.includes("Orders"), "Sidebar displays 'Orders' under COMMERCE");
check(
  !commerceLabels.includes("Orders & Fulfillment"),
  "Sidebar does NOT display 'Orders & Fulfillment'"
);

const ordersItem = commerceSection?.items.find((i) => i.href === "/ayc/orders");
check(ordersItem?.label === "Orders", "Route /ayc/orders is mapped strictly to label 'Orders'");

// Breadcrumbs inspection
const breadcrumbsPath = path.join(rootDir, "src", "components", "admin", "layout", "AdminBreadcrumbs.tsx");
const breadcrumbsContent = fs.readFileSync(breadcrumbsPath, "utf-8");
check(
  breadcrumbsContent.includes('items.push({ label: "Orders", isCurrent: true });'),
  "Breadcrumbs map /ayc/orders to 'Orders'"
);
check(
  breadcrumbsContent.includes('items.push({ label: "Orders", href: "/ayc/orders" });'),
  "Breadcrumbs map order detail parent to 'Orders'"
);
check(
  !breadcrumbsContent.includes('"Orders & Fulfillment"'),
  "Breadcrumbs contain zero occurrences of 'Orders & Fulfillment'"
);

// Header inspection
const headerPath = path.join(rootDir, "src", "components", "admin", "orders", "OrderListHeader.tsx");
const headerContent = fs.readFileSync(headerPath, "utf-8");
check(
  headerContent.includes("ORDERS"),
  "OrderListHeader renders main heading 'ORDERS'"
);

// Page Gate inspection
const pagePath = path.join(rootDir, "src", "app", "ayc", "orders", "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");
check(
  pageContent.includes('moduleName="Orders"'),
  "AdminPageGate uses moduleName 'Orders'"
);

// =========================================================================
// 2. REMOVAL OF REDUNDANT PILL-SHAPED NAVIGATION
// =========================================================================
console.log("\n▶ 2. Redundant Pill Navigation Removal:");

check(
  !pageContent.includes("btn-tab-order-all"),
  "All Orders pill button (#btn-tab-order-all) is completely removed"
);
check(
  !pageContent.includes("btn-tab-order-pending"),
  "Pending Orders pill button (#btn-tab-order-pending) is completely removed"
);
check(
  !pageContent.includes("btn-tab-order-processing"),
  "Processing & Confirmed pill button (#btn-tab-order-processing) is completely removed"
);
check(
  !pageContent.includes("btn-tab-order-shipped"),
  "Shipped / On Shipment pill button (#btn-tab-order-shipped) is completely removed"
);
check(
  !pageContent.includes("Dedicated Saved Filters / Order Lifecycle Tabs"),
  "Lifecycle tabs comment and container are removed"
);

// Ensure no alternate segmented/tab controls were added
check(
  !pageContent.includes("OrderTabs") && !pageContent.includes("OrderPills"),
  "No replacement tab or pill components introduced"
);

// =========================================================================
// 3. SUMMARY CARDS PRESERVATION (OrderKpis - 4 Balanced Cards, Fulfillment Card Removed)
// =========================================================================
console.log("\n▶ 3. Summary Cards Preservation (Fulfillment Card Removed):");

const kpisPath = path.join(rootDir, "src", "components", "admin", "orders", "OrderKpis.tsx");
const kpisContent = fs.readFileSync(kpisPath, "utf-8");

check(kpisContent.includes('label: "Total Orders"'), "Total Orders summary card preserved");
check(kpisContent.includes('label: "Pending Action"'), "Pending Action summary card preserved");
check(kpisContent.includes('label: "Processing"'), "Processing summary card preserved");
check(kpisContent.includes('label: "Paid Orders"'), "Paid Orders summary card preserved");
check(!kpisContent.includes('label: "Fulfilled / Shipped"'), "Fulfilled / Shipped summary card is completely removed");

// Check calculation preservation
check(
  kpisContent.includes("metrics.processing + metrics.confirmed"),
  "Processing card correctly aggregates processing + confirmed"
);

// Check interactive click behavior
check(
  kpisContent.includes("onSelectStatusFilter"),
  "Status filter toggle click behavior preserved"
);
check(
  kpisContent.includes("onSelectPaymentFilter"),
  "Payment filter toggle click behavior preserved"
);

// =========================================================================
// 4. SEARCH AND FILTERS PRESERVATION (OrderToolbar - Fulfillment Filter Removed)
// =========================================================================
console.log("\n▶ 4. Search and Dropdown Filters Preservation (Fulfillment Filter Removed):");

const toolbarPath = path.join(rootDir, "src", "components", "admin", "orders", "OrderToolbar.tsx");
const toolbarContent = fs.readFileSync(toolbarPath, "utf-8");

check(toolbarContent.includes('id="input-search-orders"'), "Search input field preserved");
check(toolbarContent.includes("OrderDateFilter"), "Date range filter component preserved");
check(
  toolbarContent.includes('id="select-canonical-customer-status"'),
  "Canonical customer lifecycle dropdown preserved"
);
check(
  toolbarContent.includes('id="select-order-status"'),
  "Order status dropdown filter preserved"
);
check(
  toolbarContent.includes('id="select-payment-status"'),
  "Payment status dropdown filter preserved"
);
check(
  !toolbarContent.includes('id="select-fulfillment-status"'),
  "Fulfillment status dropdown filter is completely removed"
);
check(
  toolbarContent.includes("onResetFilters"),
  "Reset filters action preserved"
);

// =========================================================================
// 5. WORKFLOW & INTEGRATION PRESERVATION
// =========================================================================
console.log("\n▶ 5. Workflows & Lifecycle Preservation:");

check(pageContent.includes("PaymentReviewModal"), "PaymentReviewModal preserved in Orders page");
check(pageContent.includes("OrderTable"), "OrderTable component mounted");
check(pageContent.includes("OrderPagination"), "OrderPagination component mounted");
check(pageContent.includes("handleConfirmPaymentProof"), "Payment approval workflow intact");
check(pageContent.includes('detailBaseUrl="/ayc/orders"'), "Order detail route links intact");

console.log("==================================================");
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL ORDERS SIMPLIFICATION CHECKS PASSED!");
}
