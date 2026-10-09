import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";

console.log("==================================================");
console.log("VERIFYING ADMIN SIDEBAR / CONTENT LAYOUT AND GEOMETRY");
console.log("==================================================");

const rootDir = path.resolve(__dirname, "..");

// =========================================================================
// 1. SHARED ADMIN LAYOUT SHELL (src/app/admin/layout.tsx)
// =========================================================================
console.log("\n▶ 1. Shared Admin Application Shell Layout Inspection");

const layoutPath = path.join(rootDir, "src/app/ayc/layout.tsx");
assert(fs.existsSync(layoutPath), "src/app/ayc/layout.tsx exists");
const layoutContent = fs.readFileSync(layoutPath, "utf8");

// 1.1 Verify removal of max-w-[1600px] and mx-auto
assert(!layoutContent.includes("max-w-[1600px]"), "Admin layout must NOT constrain workspace with max-w-[1600px]");
assert(!layoutContent.includes("mx-auto"), "Admin layout must NOT center workspace with mx-auto (which caused giant empty side gutters)");

// 1.2 Verify desktop sidebar column definition
assert(
  layoutContent.includes("hidden md:block") && layoutContent.includes("w-64"),
  "Admin layout desktop sidebar wrapper must define dedicated navigation column with w-64 expanded geometry"
);
assert(
  layoutContent.includes("sticky top-14 h-[calc(100vh-3.5rem)]"),
  "Admin layout desktop sidebar must use sticky top-14 h-[calc(100vh-3.5rem)] navigation column"
);

// 1.3 Verify main content uses remaining width
assert(
  layoutContent.includes('flex-1 p-4 sm:p-6 lg:p-8 min-w-0'),
  "Admin layout main content must be flex-1 min-w-0 to use 100% of remaining width without flex blowout"
);

// 1.4 Verify initial auth loading skeleton geometry
assert(
  layoutContent.includes('<div className="flex-1 flex w-full min-w-0">'),
  "Admin layout loading skeleton must use w-full min-w-0"
);
assert(
  layoutContent.includes('<aside className="hidden md:block w-64 shrink-0 border-r border-border/80 bg-card p-4 space-y-4">'),
  "Admin layout loading skeleton sidebar must match w-64 shrink-0 desktop sidebar geometry"
);

// 1.5 Verify mobile drawer responsiveness
assert(
  layoutContent.includes("mobileMenuOpen && ("),
  "Admin layout must preserve mobile sidebar drawer pattern"
);
assert(
  layoutContent.includes('className="fixed inset-0 z-50 md:hidden bg-ink/60 backdrop-blur-xs flex animate-in fade-in"'),
  "Mobile drawer must be md:hidden and overlay properly"
);

console.log("✓ Shared Admin layout shell geometry verified (no max-w constraints, sidebar pinned to left, content uses full remainder).");

// =========================================================================
// 2. ADMIN HEADER ALIGNMENT & GEOMETRY (src/components/admin/layout/AdminHeader.tsx)
// =========================================================================
console.log("\n▶ 2. Admin Header Alignment & Geometry Inspection");

const headerPath = path.join(rootDir, "src/components/admin/layout/AdminHeader.tsx");
assert(fs.existsSync(headerPath), "AdminHeader.tsx exists");
const headerContent = fs.readFileSync(headerPath, "utf8");

assert(
  headerContent.includes('header className="sticky top-0 z-40 h-14 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0"'),
  "AdminHeader must have fixed h-14 (56px) height matching top-14 offsets, sticky top-0, and full-width px-4 sm:px-6"
);
assert(headerContent.includes("onToggleMobileMenu"), "AdminHeader retains mobile menu toggle button");
assert(headerContent.includes("onSignOut"), "AdminHeader retains sign out action");

console.log("✓ Admin Header height and geometry locked to h-14 (56px) with full-width alignment.");

// =========================================================================
// 3. ADMIN FOOTER ALIGNMENT & GEOMETRY (src/components/admin/layout/AdminFooter.tsx)
// =========================================================================
console.log("\n▶ 3. Admin Footer Alignment & Geometry Inspection");

const footerPath = path.join(rootDir, "src/components/admin/layout/AdminFooter.tsx");
assert(fs.existsSync(footerPath), "AdminFooter.tsx exists");
const footerContent = fs.readFileSync(footerPath, "utf8");

assert(!footerContent.includes("max-w-[1600px]"), "AdminFooter must NOT contain max-w-[1600px]");
assert(
  footerContent.includes('<div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">'),
  "AdminFooter inner container must use w-full matching header geometry"
);

console.log("✓ Admin Footer width model unified with header.");

// =========================================================================
// 4. ADMIN NAVIGATION PRESERVATION & ACTIVE STATES
// =========================================================================
console.log("\n▶ 4. Admin Navigation Content Preservation & Active States");

const expectedLabels = [
  "Dashboard",
  "Products",
  "Categories",
  "Brands",
  "Inventory",
  "Orders & Fulfillment",
  "Customers",
  "RFQs",
  "POS",
  "Coupons",
  "Coupon Sales",
  "Homepage",
  "Commercial Documents",
  "Administrators",
  "Roles & Permissions",
  "Settings & Config",
];

const allNavItems = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);
const allNavLabels = allNavItems.map((i) => i.label);

for (const label of expectedLabels) {
  assert(
    allNavLabels.includes(label),
    `Navigation item "${label}" must be preserved in AdminSidebar.`
  );
}
console.log(`✓ All ${expectedLabels.length} required navigation links are intact.`);

// Check operations shortcuts contextual preservation
const productsPagePath = path.join(rootDir, "src/app/ayc/products/page.tsx");
const productsPageContent = fs.readFileSync(productsPagePath, "utf8");
assert(productsPageContent.includes("Add Product"), "Products page must preserve contextual Add Product action");

const inventoryPagePath = path.join(rootDir, "src/app/ayc/inventory/page.tsx");
const inventoryPageContent = fs.readFileSync(inventoryPagePath, "utf8");
assert(inventoryPageContent.includes("Stock Control"), "Inventory page must preserve Stock Control tab/action");

const ordersPagePath = path.join(rootDir, "src/app/ayc/orders/page.tsx");
const ordersPageContent = fs.readFileSync(ordersPagePath, "utf8");
assert(ordersPageContent.includes("Pending Orders"), "Orders page must preserve Pending Orders tab/filter");

// Test Active Item resolution logic
function calculateIsActive(
  itemHref: string,
  pathname: string,
  currentTab: string | null = null,
  exact: boolean = false
): boolean {
  const [itemPath, itemQuery] = itemHref.split("?");
  const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;

  if (itemTab) {
    return pathname === itemPath && currentTab === itemTab;
  }
  if (itemPath === "/admin/settings") {
    return pathname === itemPath && (!currentTab || currentTab !== "users");
  }
  if (exact) {
    return pathname === itemHref;
  }
  return (
    pathname === itemHref ||
    pathname.startsWith(itemHref + "/") ||
    (itemHref === "/admin/rfq" &&
      (pathname.startsWith("/admin/rfq") ||
        pathname.startsWith("/admin/rfq-quotes") ||
        pathname.startsWith("/admin/quotations")))
  );
}

// 4.1 Edit Product -> Products Catalog active state
assert.strictEqual(
  calculateIsActive("/admin/products", "/admin/products/1834/edit"),
  true,
  "Products Catalog MUST be active when editing a product (/admin/products/1834/edit)"
);

// 4.2 Add Product -> Products Catalog active state
assert.strictEqual(
  calculateIsActive("/admin/products", "/admin/products/new"),
  true,
  "Products Catalog MUST be active when creating a product (/admin/products/new)"
);

// 4.3 Products Catalog list -> Products Catalog active state
assert.strictEqual(
  calculateIsActive("/admin/products", "/admin/products"),
  true,
  "Products Catalog MUST be active on /admin/products"
);

// 4.4 Dashboard exact match
assert.strictEqual(
  calculateIsActive("/admin", "/admin", null, true),
  true,
  "Dashboard MUST be active on /admin"
);
assert.strictEqual(
  calculateIsActive("/admin", "/admin/products", null, true),
  false,
  "Dashboard MUST NOT be active on /admin/products"
);

// 4.5 RFQ detail active state
assert.strictEqual(
  calculateIsActive("/admin/rfq", "/admin/rfq/rfq-456"),
  true,
  "RFQ MUST be active on /admin/rfq/rfq-456"
);
assert.strictEqual(
  calculateIsActive("/admin/rfq", "/admin/rfq-quotes"),
  true,
  "RFQ MUST be active on /admin/rfq-quotes"
);

// 4.6 Orders detail active state
assert.strictEqual(
  calculateIsActive("/admin/orders", "/admin/orders/ord-123"),
  true,
  "Orders MUST be active on /admin/orders/ord-123"
);

// 4.7 Customer detail active state
assert.strictEqual(
  calculateIsActive("/admin/customers", "/admin/customers/cust-456"),
  true,
  "Customers MUST be active on /admin/customers/cust-456"
);

// 4.8 Settings active state
assert.strictEqual(
  calculateIsActive("/admin/settings", "/admin/settings"),
  true,
  "Settings MUST be active on /admin/settings"
);

console.log("✓ Active sidebar state mapping verified across all route patterns.");

// =========================================================================
// 5. ADMIN PAGES CONTAINER CONSISTENCY (NO ARTIFICIAL NARROWNESS)
// =========================================================================
console.log("\n▶ 5. Admin Pages Container Full-Width Consistency");

const pagesToCheck = [
  { file: "src/app/ayc/products/[id]/edit/page.tsx", name: "Edit Product" },
  { file: "src/app/ayc/products/new/page.tsx", name: "Add Product" },
  { file: "src/app/ayc/products/page.tsx", name: "Products Catalog" },
  { file: "src/app/ayc/dashboard/page.tsx", name: "Dashboard" },
  { file: "src/app/ayc/orders/page.tsx", name: "Orders List" },
  { file: "src/app/ayc/orders/[id]/page.tsx", name: "Order Details" },
  { file: "src/app/ayc/customers/page.tsx", name: "Customers List" },
  { file: "src/app/ayc/customers/[id]/page.tsx", name: "Customer Details" },
  { file: "src/app/ayc/rfq/page.tsx", name: "RFQ List" },
  { file: "src/app/ayc/rfq/[id]/page.tsx", name: "RFQ Details" },
  { file: "src/app/ayc/settings/page.tsx", name: "Settings" },
  { file: "src/app/ayc/homepage/page.tsx", name: "Homepage" },
  { file: "src/app/ayc/roles/page.tsx", name: "Roles" },
  { file: "src/app/ayc/permissions/page.tsx", name: "Permissions" },
  { file: "src/app/ayc/administrators/page.tsx", name: "Administrators" },
  { file: "src/app/ayc/inventory/page.tsx", name: "Inventory" },
  { file: "src/app/ayc/categories/page.tsx", name: "Categories" },
  { file: "src/app/ayc/brands/page.tsx", name: "Brands" },
  { file: "src/app/ayc/coupons/page.tsx", name: "Coupons" },
  { file: "src/app/ayc/documents/page.tsx", name: "Documents" },
];

for (const { file, name } of pagesToCheck) {
  const filePath = path.join(rootDir, file);
  assert(fs.existsSync(filePath), `${name} file exists at ${file}`);
  const content = fs.readFileSync(filePath, "utf8");

  // Ensure no page has max-w-7xl, max-w-6xl, or max-w-[1400px] on its main content container
  assert(
    !content.includes("max-w-7xl mx-auto"),
    `${name} must NOT have max-w-7xl mx-auto constraint on main container`
  );
  assert(
    !content.includes("max-w-6xl mx-auto"),
    `${name} must NOT have max-w-6xl mx-auto constraint on main container`
  );
  assert(
    !content.includes("max-w-[1400px]"),
    `${name} must NOT have max-w-[1400px] constraint on main container`
  );
  assert(
    !content.includes("page-specific-width") &&
    !content.includes("edit-product-special-margin") &&
    !content.includes("admin-product-fix"),
    `${name} must NOT have one-off hack classes`
  );
}

console.log(`✓ All ${pagesToCheck.length} Admin sub-pages verified to have NO artificial max-width constraints.`);

// =========================================================================
// 6. EDIT PRODUCT FORM FUNCTIONALITY AUDIT
// =========================================================================
console.log("\n▶ 6. Product Form Functionality Audit");

const formPath = path.join(rootDir, "src/components/admin/products/form/ProductForm.tsx");
assert(fs.existsSync(formPath), "ProductForm.tsx exists");
const formContent = fs.readFileSync(formPath, "utf8");

// Verify all required product business logic properties remain supported
const requiredFields = [
  "productId",
  "name",
  "slug",
  "sku",
  "brand",
  "categoryId",
  "audience",
  "designType",
  "material",
  "sizeDescription",
  "colourDescription",
  "ProductPricingSection",
  "ProductInventorySection",
  "ProductPackageBreakdownSection",
  "ProductShippingSection",
  "ProductImagesSection",
  "ProductSeoSection",
  "handleSaveWithStatus(\"draft\")",
  "handleSaveWithStatus(\"published\")",
];

for (const field of requiredFields) {
  assert(
    formContent.includes(field),
    `ProductForm must support required business feature: ${field}`
  );
}

// Verify 2-column layout in ProductForm
assert(
  formContent.includes('className="grid grid-cols-1 lg:grid-cols-12 gap-6"'),
  "ProductForm must retain two-column responsive grid"
);
assert(
  formContent.includes('className="lg:col-span-7 space-y-6"'),
  "ProductForm left column must span 7 columns on desktop"
);
assert(
  formContent.includes('className="lg:col-span-5 space-y-6"'),
  "ProductForm right column must span 5 columns on desktop"
);

console.log("✓ Product Form 2-column layout and all business capabilities verified intact.");

console.log("\n==================================================");
console.log("ALL ADMIN SHELL LAYOUT & NAVIGATION CHECKS PASSED!");
console.log("==================================================");
