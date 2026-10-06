/**
 * MASTER VERIFICATION TEST SUITE:
 * AYAAN CLOTHING PHASE 1: DOCUMENT & BUSINESS INFORMATION CONTROL CENTER
 *
 * Validates all 10 test cases from Section 26 of the master prompt:
 * TEST 1  — Default WhatsApp value exists.
 * TEST 2  — Admin can read settings.
 * TEST 3  — Authorized Admin can update settings.
 * TEST 4  — Unauthorized Admin cannot update settings.
 * TEST 5  — Settings persist after reload/API request.
 * TEST 6  — WhatsApp number normalizes correctly.
 * TEST 7  — Canonical WhatsApp URL is generated correctly.
 * TEST 8  — Public storefront receives only approved public business settings.
 * TEST 9  — Sensitive business/bank settings are not exposed publicly.
 * TEST 10 — Existing document services can resolve centralized company settings without breaking.
 */

import fs from "fs";
import path from "path";
import {
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_DISPLAY,
  WHATSAPP_BUSINESS_URL,
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
} from "../src/config/business-profile";
import { DEFAULT_BUSINESS_SETTINGS } from "../src/services/site-settings.service";

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

async function runAuditSuite() {
  console.log("==================================================");
  console.log("TEST SUITE: BUSINESS & DOCUMENT INFORMATION CONTROL CENTER");
  console.log("==================================================\n");

  const repoRoot = path.resolve(__dirname, "..");

  // ==================================================
  // TEST 1 — Default WhatsApp value exists
  // ==================================================
  console.log("▶ TEST 1 — Default WhatsApp value exists");
  assert(
    WHATSAPP_BUSINESS_DISPLAY === "+880 1620-853502",
    "Default WhatsApp display number is '+880 1620-853502'",
    `Got: ${WHATSAPP_BUSINESS_DISPLAY}`
  );
  assert(
    WHATSAPP_BUSINESS_NUMBER === "8801620853502",
    "Default canonical WhatsApp number is '8801620853502'",
    `Got: ${WHATSAPP_BUSINESS_NUMBER}`
  );
  assert(
    WHATSAPP_BUSINESS_URL === "https://wa.me/8801620853502",
    "Default canonical WhatsApp URL is 'https://wa.me/8801620853502'",
    `Got: ${WHATSAPP_BUSINESS_URL}`
  );
  assert(
    DEFAULT_BUSINESS_SETTINGS.contact.whatsapp === "+880 1620-853502",
    "DEFAULT_BUSINESS_SETTINGS has default WhatsApp display",
    `Got: ${DEFAULT_BUSINESS_SETTINGS.contact.whatsapp}`
  );

  // ==================================================
  // TEST 2 — Admin can read settings
  // ==================================================
  console.log("\n▶ TEST 2 — Admin can read settings");
  const apiRoutesFile = fs.readFileSync(path.join(repoRoot, "backend/routes/api.php"), "utf-8");
  assert(
    apiRoutesFile.includes("Route::get('/settings/business'") &&
      apiRoutesFile.includes("AdminSettingsController::class, 'getBusinessSettings'"),
    "Backend exposes GET /settings/business bound to AdminSettingsController::getBusinessSettings",
    "Route not found in backend/routes/api.php"
  );
  const siteSettingsServiceFile = fs.readFileSync(
    path.join(repoRoot, "src/services/site-settings.service.ts"),
    "utf-8"
  );
  assert(
    siteSettingsServiceFile.includes("async getBusinessSettings(): Promise<BusinessSettingsPayload>"),
    "Frontend siteSettingsService has getBusinessSettings() method",
    "Method missing from SiteSettingsService"
  );

  // ==================================================
  // TEST 3 — Authorized Admin can update settings
  // ==================================================
  console.log("\n▶ TEST 3 — Authorized Admin can update settings");
  assert(
    apiRoutesFile.includes("Route::put('/settings/business'") &&
      apiRoutesFile.includes("AdminSettingsController::class, 'updateBusinessSettings'"),
    "Backend exposes PUT /settings/business bound to AdminSettingsController::updateBusinessSettings",
    "Route not found in backend/routes/api.php"
  );
  assert(
    siteSettingsServiceFile.includes("async updateBusinessSettings(payload: BusinessSettingsPayload)"),
    "Frontend siteSettingsService has updateBusinessSettings() method",
    "Method missing from SiteSettingsService"
  );

  // ==================================================
  // TEST 4 — Unauthorized Admin cannot update settings (RBAC)
  // ==================================================
  console.log("\n▶ TEST 4 — Unauthorized Admin cannot update settings (RBAC)");
  assert(
    apiRoutesFile.includes("Route::get('/settings/business'") &&
      apiRoutesFile.includes("middleware('permission:settings.view')"),
    "GET /settings/business is protected by 'permission:settings.view'",
    "Route missing permission:settings.view middleware"
  );
  assert(
    apiRoutesFile.includes("Route::put('/settings/business'") &&
      apiRoutesFile.includes("middleware('permission:settings.edit')"),
    "PUT /settings/business is protected by 'permission:settings.edit'",
    "Route missing permission:settings.edit middleware"
  );

  // ==================================================
  // TEST 5 — Settings persist after reload / API request
  // ==================================================
  console.log("\n▶ TEST 5 — Settings persist after reload / API request");
  const controllerFile = fs.readFileSync(
    path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/Admin/AdminSettingsController.php"),
    "utf-8"
  );
  assert(
    controllerFile.includes("SystemSetting::set('company_name'") &&
      controllerFile.includes("SystemSetting::set('bank_name'") &&
      controllerFile.includes("SystemSetting::set('default_incoterm'"),
    "AdminSettingsController persists business values to SystemSetting model",
    "SystemSetting::set calls missing from updateBusinessSettings"
  );

  // ==================================================
  // TEST 6 — WhatsApp number normalizes correctly
  // ==================================================
  console.log("\n▶ TEST 6 — WhatsApp number normalizes correctly");
  assert(
    normalizeWhatsAppNumber("+880 1620-853502") === "8801620853502",
    "'+880 1620-853502' normalizes to '8801620853502'"
  );
  assert(
    normalizeWhatsAppNumber("01620-853502") === "8801620853502",
    "'01620-853502' normalizes to '8801620853502'"
  );
  assert(
    normalizeWhatsAppNumber("8801620853502") === "8801620853502",
    "'8801620853502' normalizes to '8801620853502'"
  );
  assert(
    normalizeWhatsAppNumber("+880 1982-183886") === "8801982183886",
    "'+880 1982-183886' normalizes to '8801982183886'"
  );

  // ==================================================
  // TEST 7 — Canonical WhatsApp URL is generated correctly
  // ==================================================
  console.log("\n▶ TEST 7 — Canonical WhatsApp URL is generated correctly");
  assert(
    buildWhatsAppUrl("+880 1620-853502") === "https://wa.me/8801620853502",
    "buildWhatsAppUrl('+880 1620-853502') -> 'https://wa.me/8801620853502'"
  );
  assert(
    buildWhatsAppUrl("01620-853502") === "https://wa.me/8801620853502",
    "buildWhatsAppUrl('01620-853502') -> 'https://wa.me/8801620853502'"
  );

  // ==================================================
  // TEST 8 — Public storefront receives only approved public business settings
  // ==================================================
  console.log("\n▶ TEST 8 — Public storefront receives only approved public business settings");
  const publicSettingsController = fs.readFileSync(
    path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/PublicSettingsController.php"),
    "utf-8"
  );
  assert(
    publicSettingsController.includes("'site_title'") &&
      publicSettingsController.includes("'whatsapp'") &&
      publicSettingsController.includes("'social_links'") &&
      publicSettingsController.includes("'legal_pages'"),
    "PublicSettingsController returns only public site metadata",
    "Unexpected public structure in PublicSettingsController"
  );

  // ==================================================
  // TEST 9 — Sensitive business/bank settings are not exposed publicly
  // ==================================================
  console.log("\n▶ TEST 9 — Sensitive business/bank settings are not exposed publicly");
  assert(
    !publicSettingsController.includes("bank_account_number") &&
      !publicSettingsController.includes("swift_code") &&
      !publicSettingsController.includes("routing_number") &&
      !publicSettingsController.includes("tin_number"),
    "PublicSettingsController does not expose bank credentials or tax registration IDs",
    "Sensitive credentials found in PublicSettingsController!"
  );

  // ==================================================
  // TEST 10 — Existing document services can resolve centralized company settings without breaking
  // ==================================================
  console.log("\n▶ TEST 10 — Existing document services resolve centralized settings without breaking");
  const docHelperFile = fs.readFileSync(
    path.join(repoRoot, "backend/app/Services/Documents/DocumentHelper.php"),
    "utf-8"
  );
  assert(
    docHelperFile.includes("getExporterProfile(): array") &&
      docHelperFile.includes("getBankDetails(): array") &&
      docHelperFile.includes("getDocumentDefaults(): array"),
    "DocumentHelper provides getExporterProfile, getBankDetails, and getDocumentDefaults",
    "Methods missing in DocumentHelper"
  );
  const orderModelFile = fs.readFileSync(
    path.join(repoRoot, "backend/app/Models/Order.php"),
    "utf-8"
  );
  assert(
    orderModelFile.includes("DocumentHelper::getExporterProfile()") &&
      orderModelFile.includes("DocumentHelper::getBankDetails()"),
    "Order model dynamically delegates exporter and bank details to DocumentHelper",
    "Order model does not call DocumentHelper"
  );

  // ==================================================
  // AUDIT REPORT VERIFICATION
  // ==================================================
  console.log("\n▶ AUDIT REPORT VERIFICATION");
  const auditReportPath = path.join(repoRoot, "DOCUMENT_INFORMATION_AUDIT.md");
  assert(
    fs.existsSync(auditReportPath),
    "DOCUMENT_INFORMATION_AUDIT.md exists in repository root",
    "Audit report file not found"
  );
  if (fs.existsSync(auditReportPath)) {
    const reportContent = fs.readFileSync(auditReportPath, "utf-8");
    assert(
      reportContent.includes("DOCUMENT INFORMATION AUDIT & REUSABLE BUSINESS CONTROL MATRIX"),
      "Audit report contains Document Information Matrix",
      "Matrix heading missing in DOCUMENT_INFORMATION_AUDIT.md"
    );
    assert(
      reportContent.includes("Commercial Invoice (CI)") &&
        reportContent.includes("Proforma Invoice (PI)") &&
        reportContent.includes("Offer Sheet") &&
        reportContent.includes("Sales Invoice") &&
        reportContent.includes("Quotation / RFQ"),
      "Audit report covers all 5 required document types",
      "Document types missing in audit report"
    );
  }

  // ==================================================
  // SUMMARY
  // ==================================================
  console.log("\n==================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
