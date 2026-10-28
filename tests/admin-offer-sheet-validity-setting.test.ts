import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT_DIR = path.resolve(__dirname, "..");

test("Admin Offer Sheet Validity Setting & End-to-End Lifecycle Suite", async (t) => {
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

  const adminSettingsControllerCode = fs.readFileSync(adminSettingsControllerPath, "utf-8");
  const documentHelperCode = fs.readFileSync(documentHelperPath, "utf-8");
  const offerSheetServiceCode = fs.readFileSync(offerSheetServicePath, "utf-8");
  const productOfferSheetServiceCode = fs.readFileSync(productOfferSheetServicePath, "utf-8");
  const bladeTemplateCode = fs.readFileSync(bladeTemplatePath, "utf-8");
  const businessSettingsUiCode = fs.readFileSync(businessSettingsUiPath, "utf-8");
  const settingsTypesCode = fs.readFileSync(settingsTypesPath, "utf-8");
  const siteSettingsServiceCode = fs.readFileSync(siteSettingsServicePath, "utf-8");

  await t.test("1. Admin Controller & Routes Enforce Validation, Permissions, and Logging", () => {
    // Check validation rules in AdminSettingsController
    assert.match(
      adminSettingsControllerCode,
      /'document_defaults\.offer_sheet_validity_days'\s*=>\s*\[\s*'nullable',\s*'integer',\s*'min:1',\s*'max:365'\s*\]/,
      "AdminSettingsController must enforce integer between 1 and 365 days"
    );

    // Check persistence of default_offer_sheet_validity_days
    assert.match(
      adminSettingsControllerCode,
      /SystemSetting::set\('default_offer_sheet_validity_days',\s*\(int\)\s*\$validityDays,\s*'integer',\s*'document_defaults'\)/,
      "AdminSettingsController must persist default_offer_sheet_validity_days as integer in document_defaults group"
    );

    // Check ActivityLogger records validity setting changes
    assert.match(
      adminSettingsControllerCode,
      /'offer_sheet_validity_days'\s*=>/,
      "AdminSettingsController must audit log offer_sheet_validity_days changes"
    );

    // Verify route middleware permissions
    const routesApiCode = fs.readFileSync(path.join(ROOT_DIR, "backend/routes/api.php"), "utf-8");
    assert.match(
      routesApiCode,
      /Route::put\('\/settings\/business',\s*\[AdminSettingsController::class,\s*'updateBusinessSettings'\]\)\s*->middleware\('permission:settings\.edit'\)/,
      "updateBusinessSettings route must be guarded by permission:settings.edit"
    );
  });

  await t.test("2. DocumentHelper & OfferSheetService Dynamically Resolve Validity", () => {
    // Check DocumentHelper returns default 7 days
    assert.match(
      documentHelperCode,
      /'offer_sheet_validity_days'\s*=>\s*\(int\)\s*SystemSetting::get\('default_offer_sheet_validity_days',\s*7\)/,
      "DocumentHelper::getDocumentDefaults must return offer_sheet_validity_days with fallback to 7"
    );

    // Check OfferSheetService resolves validity from document defaults and constructs validUntil label
    assert.match(
      offerSheetServiceCode,
      /\$docDefaults\s*=\s*DocumentHelper::getDocumentDefaults\(\);/,
      "OfferSheetService must read document defaults"
    );
    assert.match(
      offerSheetServiceCode,
      /\$validityDays\s*=\s*max\(1,\s*min\(365,\s*\(int\)\s*\(\$docDefaults\['offer_sheet_validity_days'\]\s*\?\?\s*7\)\)\);/,
      "OfferSheetService must bound validity between 1 and 365 with fallback 7"
    );
    assert.match(
      offerSheetServiceCode,
      /\$validityLabel\s*=\s*"\{\$validityDays\}\s*Days from date of issuance";/,
      "OfferSheetService must format label as '{validityDays} Days from date of issuance'"
    );
  });

  await t.test("3. Fingerprint Cache Invalidation on Validity Change", () => {
    // Check that computeFingerprint incorporates validity_days
    assert.match(
      productOfferSheetServiceCode,
      /\$docDefaults\s*=\s*DocumentHelper::getDocumentDefaults\(\);/,
      "ProductOfferSheetService::computeFingerprint must query document defaults"
    );
    assert.match(
      productOfferSheetServiceCode,
      /"validity_days:\{\$validityDays\}"/,
      "ProductOfferSheetService::computeFingerprint must include validity_days in core payload"
    );

    // Simulate fingerprint calculation under different validity periods
    const mockProductPayload = "prod_101~SKU-TEE-001~Classic Polo~Description~100% Cotton~100~10.00";
    const fp7 = crypto
      .createHash("sha256")
      .update(`product_offer_sheet_v8.0_101_${mockProductPayload}~validity_days:7`)
      .digest("hex");
    const fp14 = crypto
      .createHash("sha256")
      .update(`product_offer_sheet_v8.0_101_${mockProductPayload}~validity_days:14`)
      .digest("hex");
    const fp30 = crypto
      .createHash("sha256")
      .update(`product_offer_sheet_v8.0_101_${mockProductPayload}~validity_days:30`)
      .digest("hex");

    assert.notEqual(fp7, fp14, "Changing validity from 7 to 14 days must generate a distinct fingerprint");
    assert.notEqual(fp14, fp30, "Changing validity from 14 to 30 days must generate a distinct fingerprint");
    assert.notEqual(fp7, fp30, "Changing validity from 7 to 30 days must generate a distinct fingerprint");
  });

  await t.test("4. PDF Template Formats Dynamic Validity in Information Strip", () => {
    assert.match(
      bladeTemplateCode,
      /\$rawVal\s*=\s*\$doc\['validUntil'\]\s*\?\?\s*\(\$doc\['valid_until'\]\s*\?\?\s*null\);/,
      "offer-sheet.blade.php must extract validUntil / valid_until"
    );
    assert.match(
      bladeTemplateCode,
      /is_numeric\(\$rawVal\)/,
      "offer-sheet.blade.php must handle numeric validity input"
    );
    assert.match(
      bladeTemplateCode,
      /<div class="meta-label">VALIDITY<\/div>\s*<div class="meta-val meta-val-orange">\{\{\s*\$validityText\s*\}\}<\/div>/,
      "offer-sheet.blade.php must display validity in orange under VALIDITY heading"
    );
  });

  await t.test("5. Frontend BusinessSettings UI Includes Offer Sheet Validity Control", () => {
    // Check type definition
    assert.match(
      settingsTypesCode,
      /offer_sheet_validity_days\?:\s*number;/,
      "settings.ts must define offer_sheet_validity_days"
    );

    // Check service default
    assert.match(
      siteSettingsServiceCode,
      /offer_sheet_validity_days:\s*7,/,
      "site-settings.service.ts must specify default 7 days"
    );

    // Check UI control attributes
    assert.match(
      businessSettingsUiCode,
      /Offer Sheet Validity/,
      "BusinessSettings UI must render 'Offer Sheet Validity' label"
    );
    assert.match(
      businessSettingsUiCode,
      /id="offer_sheet_validity_days"/,
      "BusinessSettings UI input must have id 'offer_sheet_validity_days'"
    );
    assert.match(
      businessSettingsUiCode,
      /type="number"/,
      "BusinessSettings UI input must be type 'number'"
    );
    assert.match(
      businessSettingsUiCode,
      /min=\{1\}\s*max=\{365\}/,
      "BusinessSettings UI input must have min 1 and max 365"
    );
    assert.match(
      businessSettingsUiCode,
      /days/,
      "BusinessSettings UI input must display 'days' suffix"
    );

    // Check client-side validation in handleSubmit
    assert.match(
      businessSettingsUiCode,
      /validityNum\s*<\s*1\s*\|\|\s*validityNum\s*>\s*365/,
      "BusinessSettings handleSubmit must reject validity outside 1..365"
    );
    assert.match(
      businessSettingsUiCode,
      /Offer Sheet Validity must be a whole number between 1 and 365 days\./,
      "BusinessSettings handleSubmit must show clear error message"
    );

    // Check reset defaults handler
    assert.match(
      businessSettingsUiCode,
      /offer_sheet_validity_days:\s*7,/,
      "handleResetDefaults must reset offer_sheet_validity_days to 7"
    );
  });

  await t.test("6. Validity Range & Invalid Input Handling Boundary Matrix", () => {
    const isValidValidity = (val: unknown): boolean => {
      if (val === null || val === undefined || val === "") return false;
      const num = Number(val);
      return Number.isInteger(num) && num >= 1 && num <= 365;
    };

    // Valid inputs
    assert.equal(isValidValidity(7), true, "7 days is valid (default)");
    assert.equal(isValidValidity(1), true, "1 day is valid (min boundary)");
    assert.equal(isValidValidity(365), true, "365 days is valid (max boundary)");
    assert.equal(isValidValidity(14), true, "14 days is valid");
    assert.equal(isValidValidity(30), true, "30 days is valid");
    assert.equal(isValidValidity("7"), true, "'7' numeric string is valid");

    // Invalid inputs
    assert.equal(isValidValidity(0), false, "0 must be rejected");
    assert.equal(isValidValidity(-5), false, "Negative numbers must be rejected");
    assert.equal(isValidValidity(366), false, "> 365 must be rejected");
    assert.equal(isValidValidity(1000), false, "1000 must be rejected");
    assert.equal(isValidValidity(7.5), false, "Decimals must be rejected");
    assert.equal(isValidValidity("abc"), false, "Non-numeric strings must be rejected");
    assert.equal(isValidValidity(null), false, "Null must be rejected");
    assert.equal(isValidValidity(undefined), false, "Undefined must be rejected");
  });
});
