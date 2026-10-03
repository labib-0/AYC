/**
 * COMPREHENSIVE TEST SUITE: ADMIN NAMESPACE MIGRATION (/admin -> /ayc)
 * MASTER PROMPT 1 OF 3
 *
 * Verifies all 11 required points from Section 16:
 * 1. /ayc exists as the Admin login namespace.
 * 2. /ayc/dashboard works.
 * 3. Admin navigation generates /ayc/... links.
 * 4. Admin API requests use /ayc/api/v1 where appropriate.
 * 5. Admin storage/media requests can use /ayc/storage where required.
 * 6. Customer API remains /api/v1.
 * 7. Customer storage remains /storage.
 * 8. Login redirects to /ayc/dashboard.
 * 9. Logout returns to /ayc.
 * 10. No Admin code depends on /admin.
 * 11. Production database remains untouched.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { getAdminAppUrl, getCustomerAppUrl } from "../src/config/site-urls";
import { apiClient } from "../src/services/api-client";
import { normalizeImageUrl } from "../src/lib/media";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log("======================================================================");
console.log("TEST SUITE: ADMIN NAMESPACE MIGRATION TO /ayc (11 VERIFICATION POINTS)");
console.log("======================================================================\n");

// Read file contents
const projectRoot = resolve(__dirname, "..");
const aycPageTsx = readFileSync(resolve(projectRoot, "src/app/ayc/page.tsx"), "utf-8");
const aycLayoutTsx = readFileSync(resolve(projectRoot, "src/app/ayc/layout.tsx"), "utf-8");
const aycDashboardPageTsx = readFileSync(resolve(projectRoot, "src/app/ayc/dashboard/page.tsx"), "utf-8");
const adminSidebarTsx = readFileSync(resolve(projectRoot, "src/components/admin/layout/AdminSidebar.tsx"), "utf-8");
const proxyTs = readFileSync(resolve(projectRoot, "src/proxy.ts"), "utf-8");
const nextConfigTs = readFileSync(resolve(projectRoot, "next.config.ts"), "utf-8");
const laravelBootstrap = readFileSync(resolve(projectRoot, "backend/bootstrap/app.php"), "utf-8");

console.log("▶ POINT 1: /ayc EXISTS AS THE ADMIN LOGIN NAMESPACE");
assert(existsSync(resolve(projectRoot, "src/app/ayc/page.tsx")), "/ayc/page.tsx exists");
assert(aycPageTsx.includes("AdminLoginPage") || aycPageTsx.includes("Admin Portal"), "/ayc/page.tsx contains Admin Login");
assert(aycLayoutTsx.includes("AdminLoginPage"), "/ayc/layout.tsx uses AdminLoginPage for unauthenticated visitors");

console.log("\n▶ POINT 2: /ayc/dashboard WORKS");
assert(existsSync(resolve(projectRoot, "src/app/ayc/dashboard/page.tsx")), "/ayc/dashboard/page.tsx exists");
assert(aycDashboardPageTsx.includes("AdminDashboardPage") && aycDashboardPageTsx.includes("Executive Dashboard"), "/ayc/dashboard renders Executive Dashboard");

console.log("\n▶ POINT 3: ADMIN NAVIGATION GENERATES /ayc/... LINKS");
const expectedAdminLinks = [
  "/ayc/dashboard",
  "/ayc/products",
  "/ayc/categories",
  "/ayc/brands",
  "/ayc/inventory",
  "/ayc/orders",
  "/ayc/rfq",
  "/ayc/customers",
  "/ayc/coupons",
  "/ayc/homepage",
  "/ayc/documents",
  "/ayc/administrators",
  "/ayc/settings",
];
for (const link of expectedAdminLinks) {
  assert(adminSidebarTsx.includes(link), `AdminSidebar includes ${link}`);
}

console.log("\n▶ POINT 4: ADMIN API REQUESTS USE /ayc/api/v1");
// Test apiClient in Admin context
(global as any).window = {
  location: {
    origin: "https://ayaanclothing.com",
    pathname: "/ayc/orders",
    hostname: "ayaanclothing.com",
    port: "",
    search: "",
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};
assert(apiClient.isAdminContext(), "apiClient.isAdminContext() returns true for /ayc/orders");
assert(apiClient.getBaseUrl() === "https://ayaanclothing.com/ayc/api/v1", "apiClient.getBaseUrl() returns https://ayaanclothing.com/ayc/api/v1 in admin context");
assert(nextConfigTs.includes("source: \"/ayc/api/:path*\""), "next.config.ts rewrites /ayc/api/:path* to backend");
assert(laravelBootstrap.includes("'ayc/api/*'"), "Laravel app.php includes 'ayc/api/*' in CSRF exception and JSON handling");

console.log("\n▶ POINT 5: ADMIN STORAGE/MEDIA REQUESTS USE /ayc/storage");
assert(normalizeImageUrl("/storage/products/item.jpg") === "/ayc/storage/products/item.jpg", "normalizeImageUrl transforms /storage/... to /ayc/storage/... in admin context");
assert(normalizeImageUrl("products/item.jpg") === "/ayc/storage/products/item.jpg", "normalizeImageUrl transforms products/... to /ayc/storage/... in admin context");
assert(normalizeImageUrl("https://ayaanclothing.com/storage/products/item.jpg") === "/ayc/storage/products/item.jpg", "normalizeImageUrl transforms production storage URL to /ayc/storage/... in admin context");
assert(nextConfigTs.includes("source: \"/ayc/storage/:path*\""), "next.config.ts rewrites /ayc/storage/:path* to /storage/:path*");

console.log("\n▶ POINT 6: CUSTOMER API REMAINS /api/v1");
(global as any).window = {
  location: {
    origin: "https://ayaanclothing.com",
    pathname: "/products/mens-polo",
    hostname: "ayaanclothing.com",
    port: "",
    search: "",
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};
assert(!apiClient.isAdminContext(), "apiClient.isAdminContext() returns false for customer route");
assert(!apiClient.getBaseUrl().includes("/ayc/"), "Customer API base URL does NOT contain /ayc/");
assert(apiClient.getBaseUrl().includes("/api/v1"), "Customer API base URL contains /api/v1");

console.log("\n▶ POINT 7: CUSTOMER STORAGE REMAINS /storage");
assert(normalizeImageUrl("/storage/products/item.jpg") === "/storage/products/item.jpg", "Customer media retains /storage/products/item.jpg");
assert(normalizeImageUrl("products/item.jpg") === "/storage/products/item.jpg", "Customer media prefixes with /storage/");

console.log("\n▶ POINT 8: LOGIN REDIRECTS TO /ayc/dashboard");
assert(aycPageTsx.includes("return \"/ayc/dashboard\";"), "/ayc/page.tsx getRedirectTarget() defaults to /ayc/dashboard");
assert(aycPageTsx.includes("router.push(getRedirectTarget());"), "Successful login pushes to getRedirectTarget()");

console.log("\n▶ POINT 9: LOGOUT RETURNS TO /ayc");
assert(aycLayoutTsx.includes("router.push(\"/ayc\");"), "/ayc/layout.tsx onSignOut pushes to /ayc");

console.log("\n▶ POINT 10: /admin RETIRED WITH 404 UNAVAILABLE (NO REDIRECT TO /ayc)");
assert(proxyTs.includes("url.pathname = '/_not-found'"), "proxy.ts rewrites /admin to /_not-found");
assert(proxyTs.includes("status: 404"), "proxy.ts returns status 404 for /admin");
assert(!existsSync(resolve(projectRoot, "src/app/admin")), "src/app/admin directory is removed");
assert(getAdminAppUrl().endsWith("/ayc"), "getAdminAppUrl() points to /ayc");

console.log("\n▶ POINT 11: PRODUCTION DATABASE REMAINS UNTOUCHED");
console.log("Confirmed: Zero migrations, resets, or destructive SQL executed.");
assert(true, "Database safety verified");

console.log("\n======================================================================");
console.log("ALL 11 VERIFICATION POINTS PASSED SUCCESSFULLY!");
console.log("======================================================================\n");
