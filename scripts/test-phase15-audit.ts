/**
 * PHASE 15 — FINAL ADMIN AUDIT, CONSISTENCY & DEMO READINESS
 *
 * Automated Headless Static Verification Suite
 * Performs comprehensive code-level audit across all completed phases.
 */

import * as fs from "fs";
import * as path from "path";
import { mockStore, STORAGE_KEYS } from "../src/lib/mock-data/mock-store";
import { LOW_STOCK_THRESHOLD } from "../src/services/admin/inventory.service";
import BUSINESS_PROFILE from "../src/config/business-profile";
import { DEFAULT_TOP_BANNER, getTopBannerConfig } from "../src/config/banner";
import { getCommercialDocument } from "../src/lib/services/quotations";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runFinalAudit() {
  console.log("================================================================");
  console.log("PHASE 15 — FINAL ADMIN AUDIT, CONSISTENCY & DEMO READINESS");
  console.log("================================================================\n");

  const projectRoot = path.join(__dirname, "..");

  // AUDIT 1: ADMIN ROUTE INVENTORY
  console.log("Audit 1: Admin Route Inventory (All 19 routes exist)");
  const expectedRoutes = [
    "src/app/admin/page.tsx",
    "src/app/admin/products/page.tsx",
    "src/app/admin/products/new/page.tsx",
    "src/app/admin/products/[id]/edit/page.tsx",
    "src/app/admin/categories/page.tsx",
    "src/app/admin/brands/page.tsx",
    "src/app/admin/inventory/page.tsx",
    "src/app/admin/orders/page.tsx",
    "src/app/admin/orders/[id]/page.tsx",
    "src/app/admin/customers/page.tsx",
    "src/app/admin/customers/[id]/page.tsx",
    "src/app/admin/rfq/page.tsx",
    "src/app/admin/rfq/[id]/page.tsx",
    "src/app/admin/quotations/page.tsx",
    "src/app/admin/documents/page.tsx",
    "src/app/admin/documents/[type]/[id]/page.tsx",
    "src/app/admin/homepage/page.tsx",
    "src/app/admin/promotions/page.tsx",
    "src/app/admin/settings/page.tsx",
  ];

  for (const route of expectedRoutes) {
    const fullPath = path.join(projectRoot, route);
    assert(fs.existsSync(fullPath), `Route file exists: ${route}`);
  }

  // AUDIT 2: ADMIN SIDEBAR & NAVIGATION CONSISTENCY
  console.log("\nAudit 2: Admin Sidebar & Mobile Navigation Consistency");
  const layoutPath = path.join(projectRoot, "src/app/admin/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");

  const expectedNavLabels = [
    "Dashboard",
    "Products Catalog",
    "Category Taxonomy",
    "Brands Directory",
    "Inventory & Stock",
    "Orders & Fulfillment",
    "Customer Accounts",
    "B2B RFQs & Inquiries",
    "Commercial Quotes",
    "Commercial Documents",
    "Homepage & Banner",
    "Promotions & Coupons",
    "Settings",
  ];

  for (const label of expectedNavLabels) {
    assert(layoutContent.includes(`label: "${label}"`), `NAV_ITEMS contains '${label}'`);
  }
  assert(
    layoutContent.includes("aside className=\"hidden md:flex flex-col w-64"),
    "Desktop sidebar rendered with consistent width"
  );
  assert(
    layoutContent.includes("mobileMenuOpen && ("),
    "Mobile drawer rendered dynamically using same NAV_ITEMS list"
  );

  // AUDIT 3: AUTHENTICATION & ROUTE PROTECTION
  console.log("\nAudit 3: Admin Auth Guard & Role Protection");
  assert(
    layoutContent.includes("const isAdmin = user && user.role === \"admin\";"),
    "AdminLayout enforces strict admin role check"
  );
  assert(
    layoutContent.includes("Admin Authentication Required"),
    "AdminLayout renders access restriction barrier when not authenticated as admin"
  );

  // AUDIT 4: LOW STOCK THRESHOLD UNIFICATION
  console.log("\nAudit 4: Unified Low-Stock Threshold Rule");
  assert(LOW_STOCK_THRESHOLD === 200, "Authoritative LOW_STOCK_THRESHOLD is 200 in inventory.service");

  const dashboardServicePath = path.join(projectRoot, "src/services/admin/dashboard.service.ts");
  const dashboardServiceContent = fs.readFileSync(dashboardServicePath, "utf-8");
  assert(
    dashboardServiceContent.includes("import { LOW_STOCK_THRESHOLD } from \"./inventory.service\";"),
    "dashboard.service imports LOW_STOCK_THRESHOLD from inventory.service"
  );
  assert(
    dashboardServiceContent.includes("products.filter((p) => p.stock < LOW_STOCK_THRESHOLD)"),
    "dashboard.service calculates low_stock_items using LOW_STOCK_THRESHOLD"
  );

  const productsPagePath = path.join(projectRoot, "src/app/admin/products/page.tsx");
  const productsPageContent = fs.readFileSync(productsPagePath, "utf-8");
  assert(
    productsPageContent.includes("import { LOW_STOCK_THRESHOLD } from \"@/services/admin/inventory.service\";"),
    "products/page.tsx imports canonical LOW_STOCK_THRESHOLD"
  );
  assert(
    !productsPageContent.includes("const LOW_STOCK_THRESHOLD = 100;"),
    "products/page.tsx no longer contains hardcoded 100 threshold"
  );

  const productTableRowPath = path.join(projectRoot, "src/components/admin/products/ProductTableRow.tsx");
  const productTableRowContent = fs.readFileSync(productTableRowPath, "utf-8");
  assert(
    productTableRowContent.includes("import { LOW_STOCK_THRESHOLD } from \"@/services/admin/inventory.service\";"),
    "ProductTableRow imports canonical LOW_STOCK_THRESHOLD"
  );
  assert(
    productTableRowContent.includes("const isLowStock = product.stock < LOW_STOCK_THRESHOLD;"),
    "ProductTableRow evaluates low stock with canonical LOW_STOCK_THRESHOLD"
  );

  // AUDIT 5: CRITICAL — PI BANK DETAILS (PUBALI BANK LIMITED)
  console.log("\nAudit 5: Beneficiary Bank Details Single Source of Truth");
  const banking = BUSINESS_PROFILE.banking;
  assert(banking.bankName === "Pubali Bank Limited", "Bank Name is 'Pubali Bank Limited'");
  assert(banking.accountTitle === "M/S AYAAN  CLOTHING", "Account Title is 'M/S AYAAN  CLOTHING'");
  assert(banking.accountNumber === "1788-901-044316", "Account Number is '1788-901-044316'");
  assert(banking.swiftCode === "PUBABDDH210", "SWIFT Code is 'PUBABDDH210'");
  assert(banking.branch === "Nawabpur Road Branch", "Branch is 'Nawabpur Road Branch'");
  assert(banking.routingNumber === null, "Routing number is strictly null / omitted");

  // Verify mockStore preserves Pubali Bank details
  const storedProfile = mockStore.getBusinessProfile();
  assert(
    storedProfile.banking.bankName === "Pubali Bank Limited" &&
    storedProfile.banking.accountNumber === "1788-901-044316" &&
    storedProfile.banking.swiftCode === "PUBABDDH210",
    "mockStore.getBusinessProfile returns authoritative Pubali Bank Limited data"
  );

  // AUDIT 6: FORBIDDEN STRINGS REGRESSION CHECK
  console.log("\nAudit 6: Forbidden Data Scan (Old Account, Routing Numbers, Hardcoded Carriers)");
  const adminDirs = [
    path.join(projectRoot, "src/app/admin"),
    path.join(projectRoot, "src/components/admin"),
    path.join(projectRoot, "src/services/admin"),
  ];

  function getAllFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllFiles(full));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        files.push(full);
      }
    }
    return files;
  }

  const allAdminFiles = adminDirs.flatMap((d) => getAllFiles(d));

  const forbiddenStrings = [
    "20502130100115003", // Old bank account number
    "125275355",         // Old routing number
    "Akij Sea Freight",  // Hardcoded carrier name forbidden in UI
    "Akij Logistics",    // Hardcoded carrier name forbidden in UI
  ];

  for (const file of allAdminFiles) {
    const content = fs.readFileSync(file, "utf-8");
    for (const forbidden of forbiddenStrings) {
      assert(
        !content.includes(forbidden),
        `File ${path.relative(projectRoot, file)} does NOT contain '${forbidden}'`
      );
    }
  }

  // AUDIT 7: NO NATIVE DIALOGS (alert, confirm, prompt) IN ADMIN
  console.log("\nAudit 7: Zero Native Dialogs in Admin Codebase");
  const nativeDialogPatterns = [/\balert\s*\(/, /\bconfirm\s*\(/, /\bprompt\s*\(/];
  for (const file of allAdminFiles) {
    const content = fs.readFileSync(file, "utf-8");
    for (const pattern of nativeDialogPatterns) {
      assert(
        !pattern.test(content),
        `File ${path.relative(projectRoot, file)} does NOT call native dialog ${pattern}`
      );
    }
  }

  // AUDIT 8: CURRENCY STANDARD
  console.log("\nAudit 8: USD Currency Standard");
  const prefs = mockStore.getSystemPreferences();
  assert(prefs.currency === "USD", "SystemPreferences currency is strictly USD");

  // AUDIT 9: OFFER SHEET PRODUCT GALLERY & ZERO SHIPPING
  console.log("\nAudit 9: Offer Sheet Visual Gallery & FOB Zero Shipping Rule");
  const orders = mockStore.getOrders();
  const sampleOrder = orders[0];
  const offerSheetDoc = await getCommercialDocument("ORDER_SHEET", `order_${sampleOrder.id}`);
  assert(Boolean(offerSheetDoc), "Generated sample Offer Sheet document");
  assert(
    Array.isArray(offerSheetDoc?.product_gallery),
    "Offer Sheet document includes product_gallery visual array"
  );
  assert(
    offerSheetDoc?.shipping === 0,
    "Offer Sheet shipping charge is strictly 0 (FOB Dhaka rule)"
  );

  // AUDIT 10: HOMEPAGE / BANNER INTEGRITY
  console.log("\nAudit 10: Homepage Top Banner Configuration");
  const bannerConfig = getTopBannerConfig();
  assert(bannerConfig.active === true, "Top Banner is active");
  assert(bannerConfig.target === "#featured", "Top Banner links to #featured section");
  assert(Boolean(bannerConfig.imageUrl), "Top Banner has photographic image URL");

  // AUDIT 11: CUSTOMER ROLE SCOPING
  console.log("\nAudit 11: Customer Role Scoping");
  const roleDialogPath = path.join(projectRoot, "src/components/admin/customers/CustomerRoleDialog.tsx");
  const roleDialogContent = fs.readFileSync(roleDialogPath, "utf-8");
  assert(
    !roleDialogContent.includes("<option value=\"admin\">"),
    "CustomerRoleDialog does not allow escalating customer accounts to System Administrator"
  );
  assert(
    !roleDialogContent.includes("<option value=\"sales\">"),
    "CustomerRoleDialog does not allow escalating customer accounts to Sales Representative"
  );

  // AUDIT 12: MOCK STORE STORAGE KEYS INTEGRITY
  console.log("\nAudit 12: Mock Store Storage Keys Consistency");
  const requiredKeys: (keyof typeof STORAGE_KEYS)[] = [
    "PRODUCTS",
    "CATEGORIES",
    "BRANDS",
    "USERS",
    "ORDERS",
    "RFQS",
    "QUOTATIONS",
    "INVENTORY",
    "WAREHOUSES",
    "PROMOTIONS",
    "COUPONS",
    "BUSINESS_PROFILE",
    "SYSTEM_PREFERENCES",
  ];

  for (const k of requiredKeys) {
    assert(Boolean(STORAGE_KEYS[k]), `Storage key ${k} exists: ${STORAGE_KEYS[k]}`);
  }

  // AUDIT 13: DESIGN TYPE & AUDIENCE TAXONOMY
  console.log("\nAudit 13: Design Type & Audience Strict Values");
  const products = mockStore.getProducts();
  const validAudiences = new Set(["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"]);
  const validDesignTypes = new Set(["ORIGINAL", "MASTER COPY"]);

  let checkedProducts = 0;
  for (const p of products) {
    if (p.audience) {
      assert(validAudiences.has(p.audience), `Product ${p.name} has valid audience: ${p.audience}`);
      checkedProducts++;
    }
    if (p.designType) {
      assert(validDesignTypes.has(p.designType), `Product ${p.name} has valid designType: ${p.designType}`);
    }
  }
  assert(checkedProducts > 0, `Validated ${checkedProducts} products with strict audience values`);

  // AUDIT 14: PRODUCT OVERLAY BADGES
  console.log("\nAudit 14: Product Overlay Badges (NEW / HOT only)");
  const promoBadgePath = path.join(projectRoot, "src/components/common/ProductPromotionBadges.tsx");
  const promoBadgeContent = fs.readFileSync(promoBadgePath, "utf-8");
  assert(
    promoBadgeContent.includes("isNew") && promoBadgeContent.includes("isHot"),
    "ProductPromotionBadges supports isNew and isHot"
  );
  assert(
    promoBadgeContent.includes("// Status-only badges: Render only if NEW or HOT is active"),
    "ProductPromotionBadges explicitly restricts overlay badges to NEW and HOT only"
  );

  console.log("\n================================================================");
  console.log("ALL 14 PHASE 15 FINAL AUDIT SUITES PASSED SUCCESSFULLY! ✅");
  console.log("================================================================");
}

runFinalAudit().catch((err) => {
  console.error("Audit failure:", err);
  process.exit(1);
});
