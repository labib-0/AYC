import fs from "fs";
import path from "path";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (error: any) {
    console.error(`❌ [FAIL] ${name}\n       Error: ${error.message}`);
    process.exit(1);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected: string) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    notToContain(expected: string) {
      if (actual.includes(expected)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

console.log("==================================================");
console.log("BANGLADESH STOREFRONT ACCESS CONTROL AUDIT TESTS");
console.log("==================================================");

const cardPath = path.resolve(__dirname, "../src/components/admin/homepage/BangladeshStorefrontAccessCard.tsx");
const cardSrc = fs.readFileSync(cardPath, "utf-8");

const adminHomepagePath = path.resolve(__dirname, "../src/app/ayc/homepage/page.tsx");
const adminHomepageSrc = fs.readFileSync(adminHomepagePath, "utf-8");

const proxyPath = path.resolve(__dirname, "../src/proxy.ts");
const proxySrc = fs.readFileSync(proxyPath, "utf-8");

const homepageServicePath = path.resolve(__dirname, "../src/services/homepage.service.ts");
const homepageServiceSrc = fs.readFileSync(homepageServicePath, "utf-8");

const accessServicePath = path.resolve(__dirname, "../backend/app/Services/Security/StorefrontCountryAccessService.php");
const accessServiceSrc = fs.readFileSync(accessServicePath, "utf-8");

const internalControllerPath = path.resolve(__dirname, "../backend/app/Http/Controllers/Api/V1/Internal/InternalStorefrontAccessController.php");
const internalControllerSrc = fs.readFileSync(internalControllerPath, "utf-8");

const adminControllerPath = path.resolve(__dirname, "../backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php");
const adminControllerSrc = fs.readFileSync(adminControllerPath, "utf-8");

const systemSettingPath = path.resolve(__dirname, "../backend/app/Models/SystemSetting.php");
const systemSettingSrc = fs.readFileSync(systemSettingPath, "utf-8");

const locationConfigPath = path.resolve(__dirname, "../backend/config/location.php");
const locationConfigSrc = fs.readFileSync(locationConfigPath, "utf-8");

// ▶ Suite 1: Admin Homepage Card UI & Zero-Cloudflare Integrity
console.log("\n▶ Suite 1: Admin Homepage Card UI & Zero-Cloudflare Integrity");

test("Card renders title 'Storefront Access'", () => {
  expect(cardSrc).toContain("Storefront Access");
});

test("Card implements ON and OFF buttons with accessible IDs", () => {
  expect(cardSrc).toContain('id="btn-bangladesh-access-off"');
  expect(cardSrc).toContain('id="btn-bangladesh-access-on"');
});

test("Card displays exact statuses: 'Storefront is currently accessible.' and 'Storefront access is restricted in Bangladesh.'", () => {
  expect(cardSrc).toContain("Storefront is currently accessible.");
  expect(cardSrc).toContain("Storefront access is restricted in Bangladesh.");
});

test("Card contains confirmation modal before toggling state with exact prompt strings", () => {
  expect(cardSrc).toContain("Block the customer storefront for visitors from Bangladesh?");
  expect(cardSrc).toContain("Allow the customer storefront for visitors from Bangladesh?");
  expect(cardSrc).toContain('id="btn-confirm-bangladesh-toggle"');
  expect(cardSrc).toContain('id="btn-cancel-bangladesh-toggle"');
});

test("Card contains NO Cloudflare, WAF, or reverse proxy mentions", () => {
  expect(cardSrc.toLowerCase()).notToContain("cloudflare");
  expect(cardSrc.toLowerCase()).notToContain("cloudflare api");
  expect(cardSrc.toLowerCase()).notToContain("origin reverse proxy");
  expect(cardSrc.toLowerCase()).notToContain("zone id");
});

test("Admin Homepage page imports and renders BangladeshStorefrontAccessCard", () => {
  expect(adminHomepageSrc).toContain("BangladeshStorefrontAccessCard");
  expect(adminHomepageSrc).toContain("<BangladeshStorefrontAccessCard");
});

// ▶ Suite 2: Next.js Proxy Integration
console.log("\n▶ Suite 2: Next.js Proxy Integration");

test("Proxy is async and performs country access check for customer storefront", () => {
  expect(proxySrc).toContain("export async function proxy");
  expect(proxySrc).toContain("/internal/storefront/access-check");
  expect(proxySrc.toLowerCase()).toContain("x-internal-secret");
});

test("Proxy returns HTTP 403 when allowed is false", () => {
  expect(proxySrc).toContain("status: 403");
  expect(proxySrc).toContain("GEO_BLOCKED_HTML");
});

test("Proxy strictly excludes /ayc, /api, and /storage from storefront country block", () => {
  expect(proxySrc).toContain("isPathAyc || isAdminGateway");
  expect(proxySrc).toContain("pathname.startsWith('/api')");
  expect(proxySrc).toContain("pathname.startsWith('/storage')");
});

test("Proxy explicitly classifies and excludes customer service and account routes", () => {
  expect(proxySrc).toContain("isCustomerServiceRoute");
  expect(proxySrc).toContain("pathname.startsWith('/order-access')");
  expect(proxySrc).toContain("pathname.startsWith('/dashboard')");
  expect(proxySrc).toContain("pathname.startsWith('/profile')");
});

// ▶ Suite 3: Frontend Homepage Service
console.log("\n▶ Suite 3: Frontend Homepage Service");

test("HomepageService includes getBangladeshStorefrontAccess and updateBangladeshStorefrontAccess", () => {
  expect(homepageServiceSrc).toContain("getBangladeshStorefrontAccess");
  expect(homepageServiceSrc).toContain("updateBangladeshStorefrontAccess");
  expect(homepageServiceSrc).toContain("/admin/homepage/bangladesh-storefront-access");
});

// ▶ Suite 4: Backend Security & GeoIP Architecture
console.log("\n▶ Suite 4: Backend Security & GeoIP Architecture");

test("StorefrontCountryAccessService utilizes stevebauman/location and SystemSetting", () => {
  expect(accessServiceSrc).toContain("Stevebauman\\Location\\Facades\\Location");
  expect(accessServiceSrc).toContain("SystemSetting::isBangladeshStorefrontBlockEnabled()");
  expect(accessServiceSrc).toContain("SystemSetting::setBangladeshStorefrontBlockEnabled");
});

test("StorefrontCountryAccessService caches IP to country code", () => {
  expect(accessServiceSrc).toContain("Cache::remember");
  expect(accessServiceSrc).toContain("geoip_country:");
});

test("StorefrontCountryAccessService fails open safely if GeoIP lookup fails", () => {
  expect(accessServiceSrc).toContain("blocked = false");
  expect(accessServiceSrc).toContain("allowed = true");
});

test("InternalStorefrontAccessController validates X-Internal-Secret", () => {
  expect(internalControllerSrc).toContain("X-Internal-Secret");
  expect(internalControllerSrc).toContain("hash_equals");
  expect(internalControllerSrc).toContain("Unauthorized internal request.");
});

test("Admin HomepageManagementController enforces authorization on toggle", () => {
  expect(adminControllerSrc).toContain("getBangladeshStorefrontAccess");
  expect(adminControllerSrc).toContain("updateBangladeshStorefrontAccess");
  expect(adminControllerSrc).toContain("isSuperAdmin");
  expect(adminControllerSrc).toContain("homepage.banner.edit");
});

test("Location config uses MaxMind local driver as default with local GeoLite2-Country.mmdb", () => {
  expect(locationConfigSrc).toContain("MaxMind::class");
  expect(locationConfigSrc).toContain("GeoLite2-Country.mmdb");
});

console.log("\n==================================================");
console.log("ALL BANGLADESH STOREFRONT ACCESS AUDIT TESTS PASSED!");
console.log("==================================================");
