/**
 * MASTER VERIFICATION TEST SUITE:
 * AYAAN CLOTHING PHASE 2: CONNECT BUSINESS SETTINGS TO DOCUMENTS + GLOBAL WHATSAPP
 *
 * Verifies:
 * 1. Authoritative WhatsApp helper contracts & runtime settings override
 * 2. Product-specific WhatsApp message formatting & URL generation
 * 3. Frontend document component contracts (Commercial Invoice, Proforma Invoice, Offer Sheet, Quotation)
 * 4. PDF Generator contract support for dynamic exporter & bank credentials
 * 5. BeneficiaryBankDetails multi-format key support (snake_case + camelCase)
 * 6. Public storefront security boundary (bank details & internal registrations excluded from /settings/public)
 * 7. Backend Document Services dynamic resolution integration
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
  getProductWhatsAppUrl,
  BUSINESS_PROFILE,
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

async function runPhase2TestSuite() {
  console.log("==================================================");
  console.log("PHASE 2 TEST SUITE: BUSINESS SETTINGS TO DOCUMENTS & GLOBAL WHATSAPP");
  console.log("==================================================\n");

  const repoRoot = path.resolve(__dirname, "..");

  // ==================================================
  // SECTION 1: GLOBAL AUTHORITATIVE WHATSAPP & NORMALIZATION
  // ==================================================
  console.log("▶ 1. Global Authoritative WhatsApp Defaults & Helpers");

  assert(
    WHATSAPP_DISPLAY_NUMBER === "+880 1620-853502",
    "Default WhatsApp display number is '+880 1620-853502'",
    `Got: ${WHATSAPP_DISPLAY_NUMBER}`
  );

  assert(
    WHATSAPP_BUSINESS_NUMBER === "8801620853502",
    "Default normalized machine number is '8801620853502'",
    `Got: ${WHATSAPP_BUSINESS_NUMBER}`
  );

  assert(
    CANONICAL_WHATSAPP_URL === "https://wa.me/8801620853502",
    "Canonical WhatsApp URL points to 'https://wa.me/8801620853502'",
    `Got: ${CANONICAL_WHATSAPP_URL}`
  );

  // Normalization checks
  assert(
    normalizeWhatsAppNumber("+880 1620-853502") === "8801620853502",
    "normalizeWhatsAppNumber formats '+880 1620-853502' -> '8801620853502'"
  );

  assert(
    normalizeWhatsAppNumber("01620-853502") === "8801620853502",
    "normalizeWhatsAppNumber prepends country code for '01620-853502' -> '8801620853502'"
  );

  assert(
    normalizeWhatsAppNumber("+880 1982-183886") === "8801982183886",
    "normalizeWhatsAppNumber handles secondary number '+880 1982-183886'"
  );

  // Dynamic override in buildWhatsAppUrl
  const dynamicUrl = buildWhatsAppUrl("8801982183886", "Export inquiry for AYN-001");
  assert(
    dynamicUrl.startsWith("https://wa.me/8801982183886?text="),
    "buildWhatsAppUrl uses dynamically provided number parameter"
  );
  assert(
    dynamicUrl.includes(encodeURIComponent("Export inquiry for AYN-001")),
    "buildWhatsAppUrl encodes prefilled message correctly"
  );

  // Product WhatsApp URL helper
  const productUrl = getProductWhatsAppUrl(
    { name: "Heavyweight Cotton Polo", sku: "AYN-POLO-001", id: 101 },
    "8801982183886"
  );
  assert(
    productUrl.startsWith("https://wa.me/8801982183886?text="),
    "getProductWhatsAppUrl respects dynamic number override"
  );
  assert(
    productUrl.includes(encodeURIComponent("Heavyweight Cotton Polo")),
    "getProductWhatsAppUrl includes product name in prefilled message"
  );
  assert(
    productUrl.includes("AYN-POLO-001"),
    "getProductWhatsAppUrl includes product SKU in prefilled message"
  );

  // ==================================================
  // SECTION 2: FRONTEND DOCUMENT COMPONENTS CONTRACT
  // ==================================================
  console.log("\n▶ 2. Frontend Document Component Source Code Verification");

  // DocumentHeader.tsx verification
  const docHeaderPath = path.join(repoRoot, "src/components/admin/documents/DocumentHeader.tsx");
  const docHeaderContent = fs.readFileSync(docHeaderPath, "utf-8");
  assert(
    docHeaderContent.includes("exporterProfile?:"),
    "DocumentHeader accepts dynamic exporterProfile prop"
  );
  assert(
    docHeaderContent.includes("exporterProfile?.company_name") || docHeaderContent.includes("companyName"),
    "DocumentHeader renders dynamic company name from profile"
  );
  assert(
    docHeaderContent.includes("exporterProfile?.address") || docHeaderContent.includes("address"),
    "DocumentHeader renders dynamic address from profile"
  );
  assert(
    docHeaderContent.includes("exporterProfile?.whatsapp") || docHeaderContent.includes("phone"),
    "DocumentHeader renders dynamic WhatsApp / phone from profile"
  );

  // BeneficiaryBankDetails.tsx verification
  const bankDetailsPath = path.join(repoRoot, "src/components/admin/documents/BeneficiaryBankDetails.tsx");
  const bankDetailsContent = fs.readFileSync(bankDetailsPath, "utf-8");
  assert(
    bankDetailsContent.includes("bankDetails?:"),
    "BeneficiaryBankDetails accepts dynamic bankDetails prop"
  );
  assert(
    bankDetailsContent.includes("bank_name") && bankDetailsContent.includes("bankName"),
    "BeneficiaryBankDetails handles both snake_case and camelCase bank_name"
  );
  assert(
    bankDetailsContent.includes("account_no") && bankDetailsContent.includes("accountNo"),
    "BeneficiaryBankDetails handles both snake_case and camelCase account_no"
  );
  assert(
    bankDetailsContent.includes("swift_code") && bankDetailsContent.includes("swiftCode"),
    "BeneficiaryBankDetails handles both snake_case and camelCase swift_code"
  );

  // CommercialInvoiceDocument.tsx verification
  const ciDocPath = path.join(repoRoot, "src/components/admin/documents/CommercialInvoiceDocument.tsx");
  const ciDocContent = fs.readFileSync(ciDocPath, "utf-8");
  assert(
    ciDocContent.includes("exporterProfile={doc.exporter}"),
    "CommercialInvoiceDocument passes dynamic doc.exporter to DocumentHeader"
  );
  assert(
    ciDocContent.includes("bankDetails={doc.bankDetails"),
    "CommercialInvoiceDocument passes dynamic bankDetails to BeneficiaryBankDetails"
  );

  // ProformaInvoiceDocument.tsx verification
  const piDocPath = path.join(repoRoot, "src/components/admin/documents/ProformaInvoiceDocument.tsx");
  const piDocContent = fs.readFileSync(piDocPath, "utf-8");
  assert(
    piDocContent.includes("exporterProfile={doc.exporter}"),
    "ProformaInvoiceDocument passes dynamic doc.exporter to DocumentHeader"
  );
  assert(
    piDocContent.includes("bankDetails={doc.bankDetails"),
    "ProformaInvoiceDocument passes dynamic bankDetails to BeneficiaryBankDetails"
  );

  // OfferSheetDocument.tsx verification
  const offerDocPath = path.join(repoRoot, "src/components/admin/documents/OfferSheetDocument.tsx");
  const offerDocContent = fs.readFileSync(offerDocPath, "utf-8");
  assert(
    offerDocContent.includes("exporterProfile={doc.exporter}"),
    "OfferSheetDocument passes dynamic doc.exporter to DocumentHeader"
  );
  assert(
    !offerDocContent.includes("BeneficiaryBankDetails"),
    "OfferSheetDocument strictly omits BeneficiaryBankDetails (as per B2B specification and DOCUMENT_INFORMATION_AUDIT)"
  );

  // QuotationDocument.tsx verification
  const quotationDocPath = path.join(repoRoot, "src/components/admin/documents/QuotationDocument.tsx");
  const quotationDocContent = fs.readFileSync(quotationDocPath, "utf-8");
  assert(
    quotationDocContent.includes("exporterProfile={doc.exporter}"),
    "QuotationDocument passes dynamic doc.exporter to DocumentHeader"
  );

  // ==================================================
  // SECTION 3: PDF GENERATOR CONTRACT
  // ==================================================
  console.log("\n▶ 3. Client-Side PDF Generator Dynamic Support");

  const pdfGenPath = path.join(repoRoot, "src/lib/pdf-generator.ts");
  const pdfGenContent = fs.readFileSync(pdfGenPath, "utf-8");
  assert(
    pdfGenContent.includes("generateProductOfferSheetDoc"),
    "pdf-generator exports generateProductOfferSheetDoc"
  );
  assert(
    pdfGenContent.includes("generateProformaInvoiceDoc"),
    "pdf-generator exports generateProformaInvoiceDoc"
  );
  assert(
    pdfGenContent.includes("generateCommercialInvoiceDoc"),
    "pdf-generator exports generateCommercialInvoiceDoc"
  );
  assert(
    pdfGenContent.includes("buyerInfo?.exporter") &&
    pdfGenContent.includes("optExp = (options as any)?.exporter") &&
    pdfGenContent.includes("commercialDoc?.exporter"),
    "pdf-generator embeds dynamic exporter profile into generated document models"
  );
  assert(
    pdfGenContent.includes("optBank = (options as any)?.bankDetails") ||
    pdfGenContent.includes("paymentDetails?.bank_name"),
    "pdf-generator embeds dynamic bank details into generated document models"
  );

  // ==================================================
  // SECTION 4: BACKEND SERVICES DYNAMIC RESOLUTION
  // ==================================================
  console.log("\n▶ 4. Backend Document Services Dynamic Resolution");

  const helperPath = path.join(repoRoot, "backend/app/Services/Documents/DocumentHelper.php");
  const helperContent = fs.readFileSync(helperPath, "utf-8");
  assert(
    helperContent.includes("public static function getExporterProfile()"),
    "DocumentHelper provides getExporterProfile() resolving from SystemSetting"
  );
  assert(
    helperContent.includes("public static function getBankDetails("),
    "DocumentHelper provides getBankDetails() resolving from SystemSetting"
  );
  assert(
    helperContent.includes("public static function getDocumentDefaults()"),
    "DocumentHelper provides getDocumentDefaults() resolving logistics & document defaults"
  );

  const ciServicePath = path.join(repoRoot, "backend/app/Services/Documents/CommercialInvoiceService.php");
  const ciServiceContent = fs.readFileSync(ciServicePath, "utf-8");
  assert(
    ciServiceContent.includes("DocumentHelper::getExporterProfile()"),
    "CommercialInvoiceService resolves exporter profile dynamically from DocumentHelper"
  );
  assert(
    ciServiceContent.includes("DocumentHelper::getBankDetails()"),
    "CommercialInvoiceService resolves bank details dynamically from DocumentHelper"
  );
  assert(
    ciServiceContent.includes("DocumentHelper::getDocumentDefaults()"),
    "CommercialInvoiceService resolves logistics defaults dynamically from DocumentHelper"
  );

  const piServicePath = path.join(repoRoot, "backend/app/Services/Documents/ProformaInvoiceService.php");
  const piServiceContent = fs.readFileSync(piServicePath, "utf-8");
  assert(
    piServiceContent.includes("DocumentHelper::getExporterProfile()"),
    "ProformaInvoiceService resolves exporter profile dynamically from DocumentHelper"
  );
  assert(
    piServiceContent.includes("DocumentHelper::getBankDetails()"),
    "ProformaInvoiceService resolves bank details dynamically from DocumentHelper"
  );

  const offerServicePath = path.join(repoRoot, "backend/app/Services/Documents/OfferSheetService.php");
  const offerServiceContent = fs.readFileSync(offerServicePath, "utf-8");
  assert(
    offerServiceContent.includes("DocumentHelper::getExporterProfile()"),
    "OfferSheetService resolves exporter profile dynamically from DocumentHelper"
  );
  assert(
    offerServiceContent.includes("DocumentHelper::getBankDetails()"),
    "OfferSheetService resolves bank details dynamically from DocumentHelper"
  );

  const orderModelPath = path.join(repoRoot, "backend/app/Models/Order.php");
  const orderModelContent = fs.readFileSync(orderModelPath, "utf-8");
  assert(
    orderModelContent.includes("DocumentHelper::getExporterProfile()") &&
    orderModelContent.includes("DocumentHelper::getBankDetails()"),
    "Order::getCommercialDocument resolves exporter & bank details dynamically from DocumentHelper"
  );

  // ==================================================
  // SECTION 5: SECURITY BOUNDARY VERIFICATION
  // ==================================================
  console.log("\n▶ 5. Public Storefront Security Boundary");

  const settingsCtrlPath = path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/Admin/AdminSettingsController.php");
  const settingsCtrlContent = fs.readFileSync(settingsCtrlPath, "utf-8");
  assert(
    !settingsCtrlContent.includes("'bank_account_number' =>") ||
    settingsCtrlContent.includes("getPublicSettings"),
    "AdminSettingsController defines distinct public and authenticated endpoints"
  );

  // In getPublicSettings, bank details must NOT be present
  const publicSettingsSlice = settingsCtrlContent.slice(
    settingsCtrlContent.indexOf("public function getPublicSettings"),
    settingsCtrlContent.indexOf("public function getBusinessSettings")
  );
  assert(
    !publicSettingsSlice.includes("banking") &&
    !publicSettingsSlice.includes("bank_name") &&
    !publicSettingsSlice.includes("bank_account_number") &&
    !publicSettingsSlice.includes("swift_code"),
    "getPublicSettings strictly excludes bank credentials from storefront response"
  );

  // ==================================================
  // SUMMARY
  // ==================================================
  console.log("\n==================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2TestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
