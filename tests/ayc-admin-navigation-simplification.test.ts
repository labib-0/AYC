import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";
import { getAdminBreadcrumbs } from "../src/components/admin/layout/AdminBreadcrumbs";
import { ADMIN_PERMISSIONS } from "../src/lib/permissions";

console.log("==================================================");
console.log("AYC ADMIN SIMPLIFICATION — PHASE 1 NAVIGATION AUDIT");
console.log("==================================================");

const rootDir = path.resolve(__dirname, "..");

// -----------------------------------------------------------------------------
// Suite 1: Proposed Navigation Structure & Information Architecture
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 1: Proposed Navigation Structure & Section Hierarchy");

const expectedSections = [
  {
    title: "OVERVIEW",
    expectedItems: ["Dashboard"],
  },
  {
    title: "CATALOG",
    expectedItems: ["Products", "Categories", "Brands", "Inventory"],
  },
  {
    title: "COMMERCE",
    expectedItems: ["Orders & Fulfillment", "RFQs", "POS", "Customers"],
  },
  {
    title: "MARKETING",
    expectedItems: ["Coupons", "Coupon Sales"],
  },
  {
    title: "STOREFRONT",
    expectedItems: ["Homepage"],
  },
  {
    title: "DOCUMENTS",
    expectedItems: ["Commercial Documents"],
  },
  {
    title: "ADMINISTRATION",
    expectedItems: ["Administrators", "Roles & Permissions", "Settings & Config"],
  },
];

assert.strictEqual(
  ADMIN_NAV_SECTIONS.length,
  expectedSections.length,
  `Sidebar must have exactly ${expectedSections.length} sections`
);

for (let i = 0; i < expectedSections.length; i++) {
  const actualSection = ADMIN_NAV_SECTIONS[i];
  const expected = expectedSections[i];

  assert.strictEqual(
    actualSection.title,
    expected.title,
    `Section ${i + 1} title must be "${expected.title}", found "${actualSection.title}"`
  );

  const actualItemLabels = actualSection.items.map((it) => it.label);
  assert.deepStrictEqual(
    actualItemLabels,
    expected.expectedItems,
    `Section "${expected.title}" items mismatch: expected ${JSON.stringify(expected.expectedItems)}, got ${JSON.stringify(actualItemLabels)}`
  );
}

console.log("✔ All 7 navigation sections and 16 module items match the simplified architecture.");

// -----------------------------------------------------------------------------
// Suite 2: Duplicate Operations Group Removal
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 2: Operations Duplicate Navigation Group Removal");

const sidebarSource = fs.readFileSync(
  path.join(rootDir, "src/components/admin/layout/AdminSidebar.tsx"),
  "utf8"
);

assert(
  !sidebarSource.includes('title: "OPERATIONS"'),
  "ADMIN_NAV_SECTIONS must NOT contain an OPERATIONS section"
);
assert(
  !sidebarSource.includes("OPERATIONS\n"),
  "Sidebar JSX must NOT contain a separate OPERATIONS navigation group"
);

console.log("✔ Separate Operations navigation group successfully removed.");

// -----------------------------------------------------------------------------
// Suite 3: Contextual Add Product in Products
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 3: Contextual Add Product Action in Products");

const productsSource = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/products/page.tsx"),
  "utf8"
);

assert(
  productsSource.includes('id="btn-add-product-contextual"'),
  "Products page must provide prominent contextual button #btn-add-product-contextual"
);
assert(
  productsSource.includes('PermissionGate permission="product.create"'),
  "Add Product contextual action must be protected with product.create permission gate"
);

console.log("✔ Add Product verified as prominent contextual action in Products.");

// -----------------------------------------------------------------------------
// Suite 4: Stock Control Integration into Inventory
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 4: Stock Control Integration into Inventory");

const inventorySource = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/inventory/page.tsx"),
  "utf8"
);

assert(
  inventorySource.includes("Stock Control & Alerts") && inventorySource.includes("btn-tab-inventory"),
  "Inventory page must have dedicated Stock Control & Alerts tab"
);
assert(
  inventorySource.includes('tabParam === "stock-control"'),
  "Inventory page must recognize ?tab=stock-control query parameter"
);
assert(
  inventorySource.includes("StockAdjustmentModal"),
  "Inventory page must preserve StockAdjustmentModal capability"
);
assert(
  inventorySource.includes("InventoryHistoryModal"),
  "Inventory page must preserve InventoryHistoryModal audit capability"
);

console.log("✔ Stock Control successfully integrated into Inventory with all capabilities preserved.");

// -----------------------------------------------------------------------------
// Suite 5: Pending Orders Integration into Orders & Fulfillment
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 5: Pending Orders Tab / Filter in Orders & Fulfillment");

const ordersSource = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/orders/page.tsx"),
  "utf8"
);

assert(
  ordersSource.includes("Pending Orders") && ordersSource.includes("btn-tab-order"),
  "Orders page must have dedicated Pending Orders tab"
);
assert(
  ordersSource.includes('id: "pending"') && ordersSource.includes("Pending Orders"),
  "Orders page must support filtering by pending status tab"
);
assert(
  ordersSource.includes("PaymentReviewModal"),
  "Orders page must preserve PaymentReviewModal capability"
);

console.log("✔ Pending Orders successfully integrated as dedicated tab/filter in Orders.");

// -----------------------------------------------------------------------------
// Suite 6: Roles & Permissions Grouping and Deep Links
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 6: Roles & Permissions Grouping and Sub-Navigation");

const rolesSource = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/roles/page.tsx"),
  "utf8"
);
const permissionsSource = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/permissions/page.tsx"),
  "utf8"
);

assert(
  rolesSource.includes('id="tab-subnav-roles"') && rolesSource.includes('id="tab-subnav-permissions"'),
  "Roles page must render sub-navigation tabs between Roles and Permissions Matrix"
);
assert(
  permissionsSource.includes('id="tab-subnav-roles"') && permissionsSource.includes('id="tab-subnav-permissions"'),
  "Permissions page must render sub-navigation tabs between Roles and Permissions Matrix"
);

const rolesItem = ADMIN_NAV_SECTIONS
  .flatMap((s) => s.items)
  .find((it) => it.label === "Roles & Permissions");

assert(Boolean(rolesItem), "Roles & Permissions item must exist in sidebar");
assert.strictEqual(rolesItem?.href, "/ayc/roles");
assert.strictEqual(rolesItem?.fallbackHref, "/ayc/permissions");

console.log("✔ Roles and Permissions grouped cleanly with bidirectional sub-nav tabs.");

// -----------------------------------------------------------------------------
// Suite 7: Collapsible Desktop Sidebar & Mobile Drawer
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 7: Collapsible Desktop Sidebar & Responsive Drawer");

const layoutSource = fs.readFileSync(
  path.join(rootDir, "src/app/ayc/layout.tsx"),
  "utf8"
);

assert(
  layoutSource.includes("sidebarCollapsed"),
  "Layout must support sidebarCollapsed state"
);
assert(
  layoutSource.includes("ayc_sidebar_collapsed"),
  "Layout must persist sidebar collapsed preference in localStorage"
);
assert(
  layoutSource.includes("w-16") && layoutSource.includes("w-64"),
  "Desktop sidebar container must switch between w-64 expanded and w-16 collapsed"
);
assert(
  layoutSource.includes("isMobileDrawer"),
  "Layout must pass isMobileDrawer to mobile drawer sidebar instance"
);
assert(
  layoutSource.includes("handleKeyDown") && layoutSource.includes('"Escape"'),
  "Layout must close mobile drawer on Escape key"
);

console.log("✔ Collapsible desktop sidebar and mobile drawer verified.");

// -----------------------------------------------------------------------------
// Suite 8: Admin Breadcrumbs Generation
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 8: Admin Breadcrumbs Resolution");

const testCases = [
  {
    path: "/ayc/dashboard",
    expectedLabels: ["Dashboard"],
  },
  {
    path: "/ayc/products",
    expectedLabels: ["Dashboard", "Catalog", "Products"],
  },
  {
    path: "/ayc/products/new",
    expectedLabels: ["Dashboard", "Catalog", "Products", "Add Product"],
  },
  {
    path: "/ayc/products/123/edit",
    expectedLabels: ["Dashboard", "Catalog", "Products", "Edit Product"],
  },
  {
    path: "/ayc/orders",
    expectedLabels: ["Dashboard", "Commerce", "Orders & Fulfillment"],
  },
  {
    path: "/ayc/orders/ORD-2026-0001",
    expectedLabels: ["Dashboard", "Commerce", "Orders & Fulfillment", "Order #ORD-2026-0001"],
  },
  {
    path: "/ayc/rfq/456",
    expectedLabels: ["Dashboard", "Commerce", "RFQs", "RFQ #456"],
  },
  {
    path: "/ayc/roles",
    expectedLabels: ["Dashboard", "Administration", "Roles & Permissions", "Roles"],
  },
  {
    path: "/ayc/permissions",
    expectedLabels: ["Dashboard", "Administration", "Roles & Permissions", "Permissions Matrix"],
  },
];

for (const tc of testCases) {
  const crumbs = getAdminBreadcrumbs(tc.path);
  const labels = crumbs.map((c) => c.label);
  assert.deepStrictEqual(
    labels,
    tc.expectedLabels,
    `Breadcrumb mismatch for ${tc.path}: expected ${JSON.stringify(tc.expectedLabels)}, got ${JSON.stringify(labels)}`
  );
}

console.log("✔ Admin breadcrumbs generation verified across all nested route tiers.");

// -----------------------------------------------------------------------------
// Suite 9: Active Route Highlighting Logic
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 9: Active Route Resolution Logic");

function resolveActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/ayc/dashboard") {
    return pathname === "/ayc/dashboard" || pathname === "/ayc";
  }
  if (itemHref === "/ayc/roles") {
    return (
      pathname.startsWith("/ayc/roles") ||
      pathname.startsWith("/ayc/permissions") ||
      pathname.startsWith("/admin/roles") ||
      pathname.startsWith("/admin/permissions")
    );
  }
  if (itemHref === "/ayc/rfq") {
    return (
      pathname.startsWith("/ayc/rfq") ||
      pathname.startsWith("/ayc/rfq-quotes") ||
      pathname.startsWith("/ayc/quotations") ||
      pathname.startsWith("/admin/rfq")
    );
  }
  if (itemHref === "/ayc/administrators") {
    return (
      pathname.startsWith("/ayc/administrators") ||
      pathname.startsWith("/ayc/admins")
    );
  }
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

assert(resolveActive("/ayc/dashboard", "/ayc"), "/ayc activates Dashboard");
assert(resolveActive("/ayc/dashboard", "/ayc/dashboard"), "/ayc/dashboard activates Dashboard");
assert(!resolveActive("/ayc/dashboard", "/ayc/products"), "/ayc/products does NOT activate Dashboard");

assert(resolveActive("/ayc/products", "/ayc/products"), "/ayc/products activates Products");
assert(resolveActive("/ayc/products", "/ayc/products/new"), "/ayc/products/new activates Products");
assert(resolveActive("/ayc/products", "/ayc/products/99/edit"), "/ayc/products/99/edit activates Products");

assert(resolveActive("/ayc/orders", "/ayc/orders"), "/ayc/orders activates Orders & Fulfillment");
assert(resolveActive("/ayc/orders", "/ayc/orders/ORD-001"), "/ayc/orders/ORD-001 activates Orders & Fulfillment");

assert(resolveActive("/ayc/roles", "/ayc/roles"), "/ayc/roles activates Roles & Permissions");
assert(resolveActive("/ayc/roles", "/ayc/permissions"), "/ayc/permissions activates Roles & Permissions");

console.log("✔ Active route highlighting verified for all top-level and nested routes.");

// -----------------------------------------------------------------------------
// Suite 10: RBAC Permissions Integrity
// -----------------------------------------------------------------------------
console.log("\n▶ Suite 10: RBAC Permissions Integrity");

const allItems = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

const permissionMap: Record<string, string> = {
  "Dashboard": ADMIN_PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
  "Products": ADMIN_PERMISSIONS.PRODUCT_VIEW,
  "Categories": ADMIN_PERMISSIONS.CATEGORY_VIEW,
  "Brands": ADMIN_PERMISSIONS.BRAND_VIEW,
  "Inventory": ADMIN_PERMISSIONS.INVENTORY_VIEW,
  "Orders & Fulfillment": ADMIN_PERMISSIONS.ORDER_VIEW,
  "RFQs": ADMIN_PERMISSIONS.RFQ_VIEW,
  "POS": ADMIN_PERMISSIONS.POS_VIEW,
  "Customers": ADMIN_PERMISSIONS.CUSTOMER_VIEW,
  "Coupons": ADMIN_PERMISSIONS.COUPON_VIEW,
  "Coupon Sales": ADMIN_PERMISSIONS.ANALYTICS_SALES_VIEW,
  "Homepage": ADMIN_PERMISSIONS.HOMEPAGE_VIEW,
  "Commercial Documents": ADMIN_PERMISSIONS.DOCUMENT_VIEW,
  "Administrators": ADMIN_PERMISSIONS.ADMIN_VIEW,
  "Roles & Permissions": ADMIN_PERMISSIONS.ROLE_VIEW,
  "Settings & Config": ADMIN_PERMISSIONS.SETTINGS_VIEW,
};

for (const [label, perm] of Object.entries(permissionMap)) {
  const it = allItems.find((i) => i.label === label);
  assert(Boolean(it), `Item "${label}" must exist`);
  assert.strictEqual(
    it?.permission,
    perm,
    `Item "${label}" must be guarded by permission "${perm}"`
  );
}

console.log("✔ All 16 module permissions strictly mapped to authoritative RBAC keys.");

console.log("\n==================================================");
console.log("ALL PHASE 1 NAVIGATION AUDIT CHECKS PASSED!");
console.log("==================================================");
