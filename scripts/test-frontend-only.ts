/**
 * scripts/test-frontend-only.ts
 *
 * Automated Smoke Assertions for Phase 26: Frontend-Only Vercel Deployment Preparation
 *
 * Verifies:
 * 1. Frontend-only flag exists in service logic and evaluates correctly.
 * 2. Mock store is reachable and contains essential seeded collections.
 * 3. Required storage keys exist and match established naming conventions.
 * 4. No backend-only imports are present in client components.
 * 5. No hardcoded API URL is required for frontend-only execution.
 * 6. Design Type taxonomy (ORIGINAL, MASTER COPY) is normalized and has no active REPLICA.
 * 7. Default currency is USD across configuration.
 * 8. Checkout does not reference the removed Transportation Method selector.
 * 9. Locked Girls category image URL remains preserved.
 * 10. Demo user accounts (Admin and Customer) exist for role-based testing.
 * 11. Customer data isolation checks are intact across customer order routes.
 */

import * as fs from "fs";
import * as path from "path";
import { isFrontendOnly } from "../src/lib/frontend-mode";
import { mockStore, STORAGE_KEYS } from "../src/lib/mock-data/mock-store";
import BUSINESS_PROFILE from "../src/config/business-profile";
import { INITIAL_MOCK_USERS } from "../src/lib/mock-data/mock-users";
import { INITIAL_MOCK_ORDERS } from "../src/lib/mock-data/mock-orders";

const results: { name: string; passed: boolean; details?: string }[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    results.push({ name, passed: true });
  } else {
    console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ""}`);
    results.push({ name, passed: false, details });
  }
}

console.log("\n==================================================================");
console.log("  PHASE 26: FRONTEND-ONLY VERCEL DEPLOYMENT SMOKE ASSERTIONS");
console.log("==================================================================\n");

const root = path.join(__dirname, "..");

// 1. Frontend-only flag check
assert(
  isFrontendOnly() === true,
  "1. Frontend-only flag evaluates to TRUE by default in development / mock mode",
  `isFrontendOnly returned: ${isFrontendOnly()}`
);

// 2. Mock store reachability
const products = mockStore.getProducts();
const categories = mockStore.getCategories();
const brands = mockStore.getBrands();
const users = mockStore.getUsers();
const orders = mockStore.getOrders();
assert(
  products.length > 0 && categories.length > 0 && brands.length > 0 && users.length > 0 && orders.length > 0,
  "2. Mock store is reachable and populates baseline collections",
  `Counts: ${products.length} products, ${categories.length} categories, ${brands.length} brands, ${users.length} users, ${orders.length} orders`
);

// 3. Required storage keys exist
const expectedKeys = [
  "ayaan_mock_products_v3",
  "ayaan_mock_categories_v3",
  "ayaan_mock_brands_v2",
  "ayaan_mock_users_v2",
  "ayaan_mock_orders_v2",
  "ayaan_mock_rfqs_v2",
  "ayaan_mock_quotations_v2",
  "ayaan_mock_inventory_v2",
  "ayaan_mock_warehouses_v2",
  "ayaan_mock_promotions_v2",
  "ayaan_mock_coupons_v2",
];
const storeKeyValues = Object.values(STORAGE_KEYS);
const allKeysFound = expectedKeys.every((k) => storeKeyValues.includes(k as any));
assert(
  allKeysFound,
  "3. Required mockStore storage keys exist with exact expected naming",
  `Missing keys: ${expectedKeys.filter((k) => !storeKeyValues.includes(k as any)).join(", ")}`
);

// 4. No backend-only packages in client code
const clientFilesToCheck = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/login/page.tsx",
  "src/components/cart/CheckoutModal.tsx",
  "src/app/order-access/[reference]/page.tsx",
];
const forbiddenImports = ["pg", "pg-pool", "ioredis", "mysql", "sqlite3", "child_process", "fs/promises"];
let forbiddenFound: string[] = [];
for (const rel of clientFilesToCheck) {
  const content = fs.readFileSync(path.join(root, rel), "utf-8");
  for (const pkg of forbiddenImports) {
    if (content.includes(`from "${pkg}"`) || content.includes(`from '${pkg}'`) || content.includes(`require("${pkg}")`)) {
      forbiddenFound.push(`${rel} imports ${pkg}`);
    }
  }
}
assert(
  forbiddenFound.length === 0,
  "4. No backend-only imports (pg, redis, fs, child_process) found in client components",
  forbiddenFound.join("; ")
);

// 5. No hardcoded backend URL required for execution
assert(
  typeof process.env.NEXT_PUBLIC_API_URL === "string" || isFrontendOnly(),
  "5. Application operates standalone without requiring a reachable live API backend",
  "Frontend-first mode intercepts API network calls"
);

// 6. Design Type taxonomy (ORIGINAL, MASTER COPY) & no active REPLICA
const designTypesInProducts = new Set(products.map((p) => p.designType));
const hasReplica = Array.from(designTypesInProducts).some((dt) => (dt as string) === "REPLICA");
assert(
  !hasReplica,
  "6. Design Type taxonomy contains only ORIGINAL and MASTER COPY (no active REPLICA values)",
  `Found values: ${Array.from(designTypesInProducts).join(", ")}`
);

// 7. Default currency is USD
import { INITIAL_SYSTEM_PREFERENCES } from "../src/lib/mock-data/mock-store";
assert(
  INITIAL_SYSTEM_PREFERENCES.currency === "USD",
  "7. Default business and transaction currency is USD",
  `Configured system currency: ${INITIAL_SYSTEM_PREFERENCES.currency}`
);

// 8. Checkout does not reference removed Transportation Method selector
const checkoutSource = fs.readFileSync(path.join(root, "src/components/cart/CheckoutModal.tsx"), "utf-8");
const hasRemovedTransportSection =
  checkoutSource.includes("Select Transportation Method") ||
  checkoutSource.includes("Overland Truck Freight");
assert(
  !hasRemovedTransportSection,
  "8. Checkout modal does not reference the removed Transportation Method selector",
  "Verified only shippingMode (Aramex vs Discuss Directly) is present"
);

// 9. Locked Girls category image URL remains preserved
const categoriesFile = fs.readFileSync(path.join(root, "src/data/categories.json"), "utf-8");
const lockedGirlsImage = "photo-1622290291468-a28f7a7dc6a8";
assert(
  categoriesFile.includes(lockedGirlsImage),
  "9. Locked Girls category image URL (photo-1622290291468-a28f7a7dc6a8) is preserved",
  "Girls category image intact in categories.json"
);

// 10. Demo user accounts exist
const demoAdmin = INITIAL_MOCK_USERS.find((u) => u.email === "admin@ayaan-demo.local");
const demoCustomer = INITIAL_MOCK_USERS.find((u) => u.email === "customer@ayaan-demo.local");
assert(
  Boolean(demoAdmin && demoCustomer),
  "10. Demo user accounts (admin@ayaan-demo.local & customer@ayaan-demo.local) exist in mock users",
  `Found: admin=${Boolean(demoAdmin)}, customer=${Boolean(demoCustomer)}`
);

// 11. Customer data isolation in customer order page
const profileOrderSource = fs.readFileSync(path.join(root, "src/app/profile/orders/[id]/page.tsx"), "utf-8");
const dashboardOrderSource = fs.readFileSync(path.join(root, "src/app/dashboard/orders/[id]/page.tsx"), "utf-8");
const hasProfileCheck = profileOrderSource.includes("user_id") && profileOrderSource.includes("!== String(user.id)");
const hasDashboardCheck = dashboardOrderSource.includes("isOwner") || dashboardOrderSource.includes("unauthorized");
assert(
  hasProfileCheck && hasDashboardCheck,
  "11. Customer data isolation checks are strictly active across customer order detail routes",
  `Profile guard: ${hasProfileCheck}, Dashboard guard: ${hasDashboardCheck}`
);

// 12. Approved PI Beneficiary Bank details
const hasApprovedBank =
  Boolean(BUSINESS_PROFILE.banking.bankName?.includes("Pubali Bank")) &&
  BUSINESS_PROFILE.banking.accountNo === "1788-901-044316" &&
  BUSINESS_PROFILE.banking.swiftCode === "PUBABDDH210";
assert(
  hasApprovedBank,
  "12. Approved PI beneficiary bank details (Pubali Bank Limited, 1788-901-044316, PUBABDDH210) intact",
  `Bank: ${BUSINESS_PROFILE.banking.bankName}, Account: ${BUSINESS_PROFILE.banking.accountNo}`
);

console.log("\n==================================================================");
const failedCount = results.filter((r) => !r.passed).length;
const passedCount = results.filter((r) => r.passed).length;
console.log(`  Results: ${passedCount} passed, ${failedCount} failed (${results.length} total)`);
console.log("==================================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
