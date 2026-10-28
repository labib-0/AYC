import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT_DIR = path.resolve(__dirname, "..");

test("AYC Offer Sheet — Fixed 7-Day Validity & Automatic PDF Generation Suite", async (t) => {
  const adminSettingsControllerPath = path.join(
    ROOT_DIR,
    "backend/app/Http/Controllers/Api/V1/Admin/AdminSettingsController.php"
  );
  const documentHelperPath = path.join(
    ROOT_DIR,
    "backend/app/Services/Documents/DocumentHelper.php"
  );
  const offerSheetServicePath = path.join(
    ROOT_DIR,
    "backend/app/Services/Documents/OfferSheetService.php"
  );
  const productOfferSheetServicePath = path.join(
    ROOT_DIR,
    "backend/app/Services/Documents/ProductOfferSheetService.php"
  );
  const commercialArtifactServicePath = path.join(
    ROOT_DIR,
    "backend/app/Services/Documents/CommercialPdfArtifactService.php"
  );
  const bladeTemplatePath = path.join(
    ROOT_DIR,
    "backend/resources/views/pdf/offer-sheet.blade.php"
  );
  const businessSettingsUiPath = path.join(
    ROOT_DIR,
    "src/components/admin/settings/business/BusinessSettings.tsx"
  );
  const settingsTypesPath = path.join(ROOT_DIR, "src/types/settings.ts");
  const siteSettingsServicePath = path.join(
    ROOT_DIR,
    "src/services/site-settings.service.ts"
  );
  const productControllerPath = path.join(
    ROOT_DIR,
    "backend/app/Http/Controllers/Api/V1/ProductController.php"
  );
  const offerSheetLibPath = path.join(ROOT_DIR, "src/lib/offer-sheet.ts");
  const pdfGeneratorLibPath = path.join(ROOT_DIR, "src/lib/pdf-generator.ts");

  const adminSettingsControllerCode = fs.readFileSync(adminSettingsControllerPath, "utf-8");
  const documentHelperCode = fs.readFileSync(documentHelperPath, "utf-8");
  const offerSheetServiceCode = fs.readFileSync(offerSheetServicePath, "utf-8");
  const productOfferSheetServiceCode = fs.readFileSync(productOfferSheetServicePath, "utf-8");
  const commercialArtifactServiceCode = fs.readFileSync(commercialArtifactServicePath, "utf-8");
  const bladeTemplateCode = fs.readFileSync(bladeTemplatePath, "utf-8");
  const businessSettingsUiCode = fs.readFileSync(businessSettingsUiPath, "utf-8");
  const settingsTypesCode = fs.readFileSync(settingsTypesPath, "utf-8");
  const siteSettingsServiceCode = fs.readFileSync(siteSettingsServicePath, "utf-8");
  const productControllerCode = fs.readFileSync(productControllerPath, "utf-8");
  const offerSheetLibCode = fs.readFileSync(offerSheetLibPath, "utf-8");
  const pdfGeneratorLibCode = fs.readFileSync(pdfGeneratorLibPath, "utf-8");

  await t.test("1. Admin Offer Sheet Validity Control Is Permanently Removed", () => {
    // UI control must be absent
    assert.ok(
      !businessSettingsUiCode.includes('id="offer_sheet_validity_days"'),
      "BusinessSettings UI input 'offer_sheet_validity_days' must be removed"
    );
    assert.ok(
      !businessSettingsUiCode.includes("Offer Sheet Validity"),
      "BusinessSettings UI label 'Offer Sheet Validity' must be removed"
    );
    assert.ok(
      !businessSettingsUiCode.includes("offer_sheet_validity_days"),
      "BusinessSettings UI must have no offer_sheet_validity_days references"
    );

    // Controller validation & persistence must be absent
    assert.ok(
      !adminSettingsControllerCode.includes("offer_sheet_validity_days"),
      "AdminSettingsController must not reference offer_sheet_validity_days"
    );
    assert.ok(
      !adminSettingsControllerCode.includes("default_offer_sheet_validity_days"),
      "AdminSettingsController must not persist default_offer_sheet_validity_days"
    );

    // Types and service defaults must not have offer_sheet_validity_days
    assert.ok(
      !settingsTypesCode.includes("offer_sheet_validity_days"),
      "types/settings.ts must not define offer_sheet_validity_days"
    );
    assert.ok(
      !siteSettingsServiceCode.includes("offer_sheet_validity_days"),
      "site-settings.service.ts must not have offer_sheet_validity_days"
    );
    assert.ok(
      !documentHelperCode.includes("offer_sheet_validity_days"),
      "DocumentHelper::getDocumentDefaults must not define offer_sheet_validity_days"
    );
  });

  await t.test("2. Unrelated Document Defaults Remain Completely Intact", () => {
    // Country of origin, port of loading, incoterm, payment terms, and signatory details must remain
    assert.match(
      documentHelperCode,
      /'country_of_origin'\s*=>/,
      "DocumentHelper must retain country_of_origin default"
    );
    assert.match(
      documentHelperCode,
      /'incoterm'\s*=>/,
      "DocumentHelper must retain incoterm default"
    );
    assert.match(
      documentHelperCode,
      /'payment_terms'\s*=>/,
      "DocumentHelper must retain payment_terms default"
    );
    assert.match(
      documentHelperCode,
      /'signatory_name'\s*=>/,
      "DocumentHelper must retain signatory_name default"
    );

    // Frontend UI retains document defaults section
    assert.match(
      businessSettingsUiCode,
      /Document Logistics &.*Legal Defaults/,
      "BusinessSettings must retain Document Logistics & Legal Defaults section"
    );
    assert.match(
      businessSettingsUiCode,
      /Authorized Signatory Name/,
      "BusinessSettings must retain Authorized Signatory Name input"
    );
  });

  await t.test("3. Single Authoritative Fixed 7-Day Validity Value Across Architecture", () => {
    // OfferSheetService has authoritative constant
    assert.match(
      offerSheetServiceCode,
      /public const DEFAULT_VALIDITY_DAYS = 7;/,
      "OfferSheetService must define public const DEFAULT_VALIDITY_DAYS = 7"
    );
    assert.match(
      offerSheetServiceCode,
      /public const VALIDITY_TEXT = '7 Days from date of issuance';/,
      "OfferSheetService must define public const VALIDITY_TEXT = '7 Days from date of issuance'"
    );

    // OfferSheetService::generateForProduct outputs fixed 7-day text
    assert.match(
      offerSheetServiceCode,
      /'validUntil'\s*=>\s*self::VALIDITY_TEXT,/,
      "generateForProduct must set validUntil to self::VALIDITY_TEXT"
    );

    // Blade template outputs fixed 7-day validity unconditionally
    assert.match(
      bladeTemplateCode,
      /\$validityText\s*=\s*\\App\\Services\\Documents\\OfferSheetService::VALIDITY_TEXT;/,
      "offer-sheet.blade.php must assign validityText directly from authoritative constant"
    );
    assert.match(
      bladeTemplateCode,
      /<div class="meta-label">VALIDITY<\/div>\s*<div class="meta-val meta-val-orange">\{\{\s*\$validityText\s*\}\}<\/div>/,
      "offer-sheet.blade.php must render validityText in orange under VALIDITY"
    );

    // Frontend library exports fixed constant
    assert.match(
      offerSheetLibCode,
      /export const OFFER_SHEET_FIXED_VALIDITY_TEXT = "7 Days from date of issuance";/,
      "offer-sheet.ts must export OFFER_SHEET_FIXED_VALIDITY_TEXT"
    );
    assert.match(
      offerSheetLibCode,
      /const validUntil = OFFER_SHEET_FIXED_VALIDITY_TEXT;/,
      "buildOfferSheetData must set validUntil to OFFER_SHEET_FIXED_VALIDITY_TEXT"
    );

    // pdf-generator.ts formats validity
    assert.match(
      pdfGeneratorLibCode,
      /value:\s*offerData\.validUntil\s*\|\|\s*"7 Days from date of issuance",/,
      "pdf-generator.ts must output 7 Days from date of issuance"
    );
  });

  await t.test("4. Layout Version Invalidation and Fingerprint Independence", () => {
    // ProductOfferSheetService bumped to v11.0
    assert.match(
      productOfferSheetServiceCode,
      /public const LAYOUT_VERSION = 'v11\.0_offer_sheet_fixed_7_day_validity_and_auto_gen';/,
      "ProductOfferSheetService::LAYOUT_VERSION must be bumped to v11.0"
    );

    // CommercialPdfArtifactService bumped to v11.0
    assert.match(
      commercialArtifactServiceCode,
      /public const LAYOUT_VERSION = 'v11\.0_offer_sheet_fixed_7_day_validity_and_auto_gen';/,
      "CommercialPdfArtifactService::LAYOUT_VERSION must be bumped to v11.0"
    );

    // computeFingerprint must incorporate fixed validity and not dynamic admin settings
    assert.match(
      productOfferSheetServiceCode,
      /"fixed_validity:7_days",/,
      "ProductOfferSheetService::computeFingerprint must incorporate 'fixed_validity:7_days'"
    );
    assert.ok(
      !productOfferSheetServiceCode.includes("validity_days:{$validityDays}"),
      "computeFingerprint must not depend on dynamic validity_days variable"
    );
  });

  await t.test("5. Automatic Generation Dispatched on Creation and Publish Transition", () => {
    // store() creates pending record and dispatches job
    assert.match(
      productControllerCode,
      /ProductOfferSheet::updateOrCreate\(\s*\[\s*'product_id'\s*=>\s*\$product->id\s*\]/,
      "ProductController::store must record pending offer sheet"
    );
    assert.match(
      productControllerCode,
      /GenerateProductOfferSheetJob::dispatch\(\$product->id\);/,
      "ProductController::store must dispatch GenerateProductOfferSheetJob"
    );

    // update() detects transition to published or relevant changes
    assert.match(
      productControllerCode,
      /\$becamePublished\s*=\s*\$isTransitionToPublished\s*\|\|\s*\(\$product->status === 'published' && \$product->wasChanged\('status'\)\);/,
      "ProductController::update must detect transition to published status"
    );
    assert.match(
      productControllerCode,
      /if\s*\(\$becamePublished\s*\|\|\s*\$oldOfferSheetFingerprint !== \$newOfferSheetFingerprint\s*\|\|\s*!\$hasReadyOfferSheet\)/,
      "ProductController::update must trigger regeneration if published or relevant fields changed or missing"
    );
    assert.match(
      productControllerCode,
      /GenerateProductOfferSheetJob::dispatch\(\$product->id,\s*true\);/,
      "ProductController::update must dispatch forced regeneration job"
    );
  });

  await t.test("6. Fast Retrieval from Cache without Synchronous Regeneration", () => {
    // offerSheet endpoint checks status_only or serves ready artifact
    assert.match(
      productControllerCode,
      /\$request->boolean\('status_only'\)/,
      "ProductController::offerSheet must support lightweight status_only check"
    );
    assert.match(
      productControllerCode,
      /\$artifact = \$service->getOrGenerate\(\$product,\s*\$request->boolean\('force'\)\);/,
      "ProductController::offerSheet must call getOrGenerate with force param"
    );
    assert.match(
      productControllerCode,
      /'X-PDF-Cache'\s*=>\s*\$artifact\['is_hit'\]\s*\?\s*'HIT'\s*:\s*'MISS'/,
      "ProductController::offerSheet must return X-PDF-Cache HIT on cached retrieval"
    );

    // Fast path in ProductOfferSheetService
    assert.match(
      productOfferSheetServiceCode,
      /if\s*\(!\$force\)\s*\{\s*\$sheetRecord = ProductOfferSheet::where\('product_id',\s*\$product->id\)->first\(\);/,
      "ProductOfferSheetService must fast-path return when fingerprint matches"
    );
  });

  await t.test("7. Removed Content Blocks (Product Description, CBM MOQ, Gross Weight MOQ) Remain Absent", () => {
    // Assert absence in Blade template
    assert.ok(
      !bladeTemplateCode.includes("PRODUCT DESCRIPTION"),
      "offer-sheet.blade.php must not contain PRODUCT DESCRIPTION"
    );
    assert.ok(
      !bladeTemplateCode.includes("CBM (MOQ)"),
      "offer-sheet.blade.php must not contain CBM (MOQ)"
    );
    assert.ok(
      !bladeTemplateCode.includes("GROSS WEIGHT (MOQ)"),
      "offer-sheet.blade.php must not contain GROSS WEIGHT (MOQ)"
    );
  });
});
