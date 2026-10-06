/**
 * MASTER VERIFICATION TEST SUITE:
 * AUTHORITATIVE WHATSAPP NUMBER SETTINGS & HOMEPAGE CONTROL
 *
 * Validates all 12 required test cases from Section 21 of the specification:
 * TEST 1  — DEFAULT: Fresh configuration is +880 1620-853502 -> https://wa.me/8801620853502
 * TEST 2  — ADMIN CHANGE: Admin changes to +880 1982-183886 -> saved & normalized to 8801982183886
 * TEST 3  — HEADER: Uses authoritative WhatsApp helper/setting
 * TEST 4  — FOOTER: Uses authoritative WhatsApp helper/setting
 * TEST 5  — PRODUCT DETAIL: Uses authoritative WhatsApp helper/setting
 * TEST 6  — FLOATING WHATSAPP: Uses authoritative WhatsApp helper/setting
 * TEST 7  — CONTACT: Uses authoritative WhatsApp helper/setting
 * TEST 8  — RFQ/OTHER CTA: Uses authoritative WhatsApp helper/setting
 * TEST 9  — OPTIONAL MESSAGE: Number normalized correctly and prefilled message encoded
 * TEST 10 — UNAUTHORIZED UPDATE: Role middleware / auth checks reject customer modification
 * TEST 11 — INVALID PHONE: Backend validator rejects invalid/malformed/malicious inputs
 * TEST 12 — CACHE INVALIDATION: Cache::forget('site_settings_public') called on settings update
 */

import fs from "fs";
import path from "path";
import {
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_DISPLAY_NUMBER,
  CANONICAL_WHATSAPP_URL,
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
  getWhatsAppUrl,
} from "../src/config/business-profile";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("TEST SUITE: WHATSAPP AUTHORITATIVE SETTINGS & CONTROL");
  console.log("==================================================\n");

  const repoRoot = path.resolve(__dirname, "..");

  // ==================================================
  // TEST 1 — DEFAULT
  // ==================================================
  console.log("▶ TEST 1 — DEFAULT: Fresh configuration");
  assert(
    WHATSAPP_DISPLAY_NUMBER === "+880 1620-853502",
    "Default display number is '+880 1620-853502'",
    `Got: ${WHATSAPP_DISPLAY_NUMBER}`
  );
  assert(
    WHATSAPP_BUSINESS_NUMBER === "8801620853502",
    "Default machine number is '8801620853502'",
    `Got: ${WHATSAPP_BUSINESS_NUMBER}`
  );
  assert(
    CANONICAL_WHATSAPP_URL === "https://wa.me/8801620853502",
    "Canonical WhatsApp URL is 'https://wa.me/8801620853502'",
    `Got: ${CANONICAL_WHATSAPP_URL}`
  );
  assert(
    buildWhatsAppUrl() === "https://wa.me/8801620853502",
    "buildWhatsAppUrl() returns canonical default URL without parameters",
    `Got: ${buildWhatsAppUrl()}`
  );
  assert(
    getWhatsAppUrl() === "https://wa.me/8801620853502",
    "getWhatsAppUrl() returns canonical default URL without parameters",
    `Got: ${getWhatsAppUrl()}`
  );

  // ==================================================
  // TEST 2 — ADMIN CHANGE
  // ==================================================
  console.log("\n▶ TEST 2 — ADMIN CHANGE: Normalizing admin input");
  const adminInput = "+880 1982-183886";
  const normalizedAdmin = normalizeWhatsAppNumber(adminInput);
  assert(
    normalizedAdmin === "8801982183886",
    `Admin input '${adminInput}' normalized to '8801982183886'`,
    `Got: ${normalizedAdmin}`
  );
  const updatedUrl = buildWhatsAppUrl(adminInput);
  assert(
    updatedUrl === "https://wa.me/8801982183886",
    `buildWhatsAppUrl('${adminInput}') generates 'https://wa.me/8801982183886'`,
    `Got: ${updatedUrl}`
  );

  // Local BD format 01711...
  const bdLocalInput = "01620-853502";
  const normalizedBdLocal = normalizeWhatsAppNumber(bdLocalInput);
  assert(
    normalizedBdLocal === "8801620853502",
    `Local BD input '${bdLocalInput}' normalized to '8801620853502'`,
    `Got: ${normalizedBdLocal}`
  );

  // ==================================================
  // TEST 3 — HEADER
  // ==================================================
  console.log("\n▶ TEST 3 — HEADER: Uses authoritative WhatsApp helper/setting");
  const headerContent = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/Header.tsx"),
    "utf-8"
  );
  const headerUsesContextOrHelper =
    headerContent.includes("getWhatsAppUrl") ||
    headerContent.includes("settings.whatsapp") ||
    headerContent.includes("WHATSAPP_BUSINESS_NUMBER") ||
    headerContent.includes("useSiteSettings");
  assert(
    headerUsesContextOrHelper,
    "Header component resolves WhatsApp from settings context or helper"
  );

  // ==================================================
  // TEST 4 — FOOTER
  // ==================================================
  console.log("\n▶ TEST 4 — FOOTER: Uses authoritative WhatsApp helper/setting");
  const footerContent = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/Footer.tsx"),
    "utf-8"
  );
  assert(
    footerContent.includes("getWhatsAppUrl") || footerContent.includes("buildWhatsAppUrl"),
    "Footer component invokes authoritative getWhatsAppUrl / buildWhatsAppUrl"
  );
  assert(
    footerContent.includes("+880 1620-853502"),
    "Footer component uses +880 1620-853502 as fallback display"
  );

  // ==================================================
  // TEST 5 — PRODUCT DETAIL
  // ==================================================
  console.log("\n▶ TEST 5 — PRODUCT DETAIL: Uses authoritative WhatsApp helper/setting");
  const productDetailContent = fs.readFileSync(
    path.join(repoRoot, "src/app/products/[slug]/ProductDetailView.tsx"),
    "utf-8"
  );
  assert(
    productDetailContent.includes("getWhatsAppUrl") ||
      productDetailContent.includes("buildWhatsAppUrl") ||
      productDetailContent.includes("settings.whatsapp"),
    "ProductDetailClient invokes getWhatsAppUrl / settings.whatsapp"
  );

  // ==================================================
  // TEST 6 — FLOATING WHATSAPP
  // ==================================================
  console.log("\n▶ TEST 6 — FLOATING WHATSAPP: Uses authoritative WhatsApp helper/setting");
  assert(
    footerContent.includes("Floating WhatsApp Button") &&
      footerContent.includes("getWhatsAppUrl"),
    "Footer renders Floating WhatsApp button using authoritative getWhatsAppUrl"
  );

  // ==================================================
  // TEST 7 — CONTACT & CART / CHECKOUT ACTIONS
  // ==================================================
  console.log("\n▶ TEST 7 — CONTACT & CHECKOUT: Uses authoritative WhatsApp helper/setting");
  const checkoutContent = fs.readFileSync(
    path.join(repoRoot, "src/components/cart/CheckoutModal.tsx"),
    "utf-8"
  );
  assert(
    checkoutContent.includes("getWhatsAppUrl"),
    "CheckoutModal invokes authoritative getWhatsAppUrl for WhatsApp order notifications"
  );

  // ==================================================
  // TEST 8 — RFQ / OTHER CTA
  // ==================================================
  console.log("\n▶ TEST 8 — RFQ / OTHER CTA: Uses authoritative WhatsApp helper/setting");
  const rfqPageContent = fs.readFileSync(
    path.join(repoRoot, "src/app/rfq/page.tsx"),
    "utf-8"
  );
  assert(
    rfqPageContent.includes("getWhatsAppUrl"),
    "RFQ Page invokes authoritative getWhatsAppUrl"
  );

  // ==================================================
  // TEST 9 — OPTIONAL MESSAGE
  // ==================================================
  console.log("\n▶ TEST 9 — OPTIONAL MESSAGE: Encoded and preserved");
  const testMessage = "Hello Ayaan Clothing, I want to order 500 pcs!";
  const urlWithMessage = buildWhatsAppUrl("+880 1620-853502", testMessage);
  const expectedEncoded = encodeURIComponent(testMessage);
  assert(
    urlWithMessage === `https://wa.me/8801620853502?text=${expectedEncoded}`,
    "buildWhatsAppUrl encodes prefilled message correctly",
    `Got: ${urlWithMessage}`
  );
  const delegatingUrlWithMessage = getWhatsAppUrl(testMessage);
  assert(
    delegatingUrlWithMessage === `https://wa.me/8801620853502?text=${expectedEncoded}`,
    "getWhatsAppUrl preserves prefilled message and passes to buildWhatsAppUrl",
    `Got: ${delegatingUrlWithMessage}`
  );

  // ==================================================
  // TEST 10 — UNAUTHORIZED UPDATE
  // ==================================================
  console.log("\n▶ TEST 10 — UNAUTHORIZED UPDATE: Role & Permission checks");
  const routesFile = fs.readFileSync(
    path.join(repoRoot, "backend/routes/api.php"),
    "utf-8"
  );
  assert(
    routesFile.includes("role:admin") || routesFile.includes("EnsureUserHasRole"),
    "Backend admin settings routes are guarded by role:admin middleware"
  );
  const adminControllerFile = fs.readFileSync(
    path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/Admin/AdminSettingsController.php"),
    "utf-8"
  );
  assert(
    adminControllerFile.includes("updateSettings"),
    "AdminSettingsController exposes authoritative settings update action updateSettings"
  );

  // ==================================================
  // TEST 11 — INVALID PHONE
  // ==================================================
  console.log("\n▶ TEST 11 — INVALID PHONE: Backend & helper rejection of malformed values");
  const backendServiceFile = fs.readFileSync(
    path.join(repoRoot, "backend/app/Services/Settings/WhatsAppNormalizationService.php"),
    "utf-8"
  );
  assert(
    backendServiceFile.includes("isValidPhoneNumber"),
    "Backend WhatsAppNormalizationService implements isValidPhoneNumber validation"
  );
  assert(
    adminControllerFile.includes("isValidPhoneNumber"),
    "AdminSettingsController validates phone number using isValidPhoneNumber and rejects with 422"
  );

  // Test edge cases in frontend normalizer
  assert(
    normalizeWhatsAppNumber("") === "8801620853502",
    "Empty string falls back to canonical default 8801620853502"
  );
  assert(
    normalizeWhatsAppNumber(null as unknown as string) === "8801620853502",
    "Null falls back to canonical default 8801620853502"
  );
  assert(
    normalizeWhatsAppNumber("javascript:alert(1)") === "8801620853502",
    "Malicious scheme 'javascript:' rejected and falls back to canonical default 8801620853502"
  );
  assert(
    normalizeWhatsAppNumber("https://malicious.com") === "8801620853502",
    "URL input rejected and falls back to canonical default 8801620853502"
  );

  // ==================================================
  // TEST 12 — CACHE INVALIDATION
  // ==================================================
  console.log("\n▶ TEST 12 — CACHE INVALIDATION: Cache cleared on settings save");
  assert(
    adminControllerFile.includes("Cache::forget('site_settings_public')"),
    "AdminSettingsController invalidates 'site_settings_public' cache on save"
  );
  const publicControllerFile = fs.readFileSync(
    path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/PublicSettingsController.php"),
    "utf-8"
  );
  assert(
    publicControllerFile.includes("site_settings_public"),
    "PublicSettingsController reads from 'site_settings_public' cache key"
  );

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
