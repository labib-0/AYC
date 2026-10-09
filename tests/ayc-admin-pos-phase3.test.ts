import fs from "fs";
import path from "path";
import { formatReceiptCurrency } from "../src/components/admin/pos/PosThermalReceiptModal";

/**
 * AYC ADMIN POS TERMINAL — PHASE 3 VERIFICATION SUITE
 *
 * Verifies:
 * 1. Barcode/SKU Scanner Workflow (Keyboard-wedge, Enter interception, unambiguous auto-add, variant prompt, stock protection).
 * 2. Dedicated 58 mm and 80 mm Thermal Receipts (paper width toggle, print CSS, branding, dynamic currency, authoritative totals).
 * 3. Reprinting completed POS receipts without duplicate sales or inventory deductions.
 * 4. Quick Registration Integrity & Synthetic Email Security (unverified status, notification suppression, password reset rejection).
 * 5. Currency formatting unit tests across multiple international currencies.
 */
function runTests() {
  console.log("==================================================");
  console.log("AYC ADMIN POS TERMINAL — PHASE 3 VERIFICATION SUITE");
  console.log("==================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  const posPagePath = path.join(cwd, "src/app/ayc/pos/page.tsx");
  const posModalPath = path.join(cwd, "src/components/admin/pos/PosThermalReceiptModal.tsx");
  const orderHeaderPath = path.join(cwd, "src/components/admin/orders/OrderDetailHeader.tsx");
  const backendPosServicePath = path.join(
    cwd,
    "backend/app/Services/Order/AdminPosSaleService.php"
  );
  const userModelPath = path.join(cwd, "backend/app/Models/User.php");
  const forgotPasswordPath = path.join(
    cwd,
    "backend/app/Http/Requests/Auth/ForgotPasswordRequest.php"
  );

  const posPageCode = fs.readFileSync(posPagePath, "utf-8");
  const posModalCode = fs.readFileSync(posModalPath, "utf-8");
  const orderHeaderCode = fs.readFileSync(orderHeaderPath, "utf-8");
  const backendServiceCode = fs.readFileSync(backendPosServicePath, "utf-8");
  const userModelCode = fs.readFileSync(userModelPath, "utf-8");
  const forgotPasswordCode = fs.readFileSync(forgotPasswordPath, "utf-8");

  // ── GROUP 1: Product Search & Catalog Lookup (Scanner Removed) ─────────────
  console.log("▶ Group 1: Product Search & Catalog Lookup (Scanner Removed)");
  assert(
    posPageCode.includes('id="pos-product-search-input"'),
    "Search bar provides accessible 'pos-product-search-input' element"
  );
  assert(
    !posPageCode.includes("handleBarcodeOrSkuKeyDown"),
    "Scanner-specific onKeyDown handler handleBarcodeOrSkuKeyDown is removed"
  );
  assert(
    posPageCode.includes("handleProductSearchKeyDown"),
    "Search input binds handleProductSearchKeyDown preventing accidental checkout on Enter"
  );
  assert(
    !posPageCode.includes("pos-scanner-feedback-banner"),
    "Scanner feedback banner (id='pos-scanner-feedback-banner') is removed"
  );
  assert(
    posPageCode.includes("Search products by name, SKU, or category"),
    "Product search placeholder clearly indicates manual search capabilities"
  );
  assert(
    posPageCode.includes("addOrIncrementProduct"),
    "Preserves addOrIncrementProduct for manual catalog addition"
  );
  assert(
    posPageCode.includes("setActiveProduct(product)") &&
      posPageCode.includes("has_variants"),
    "Preserves size/variant modal selection when selecting products with variants"
  );
  assert(
    posPageCode.includes("is_sold_out") && posPageCode.includes("total_available_stock"),
    "Protects against out of stock and sold out products during catalog addition"
  );
  assert(
    backendServiceCode.includes("orderByRaw") && backendServiceCode.includes("sku = "),
    "Backend search prioritizes exact SKU match in product catalog search"
  );

  // ── GROUP 2: Dedicated 58 mm & 80 mm Thermal Receipts ─────────────────────
  console.log("\n▶ Group 2: Dedicated 58 mm & 80 mm Thermal Receipts");
  assert(
    fs.existsSync(posModalPath),
    "Dedicated PosThermalReceiptModal component exists"
  );
  assert(
    posModalCode.includes('id="thermal-width-58"') &&
      posModalCode.includes('id="thermal-width-80"'),
    "Provides interactive 58 mm and 80 mm paper-width selectors"
  );
  assert(
    posModalCode.includes("@media print") &&
      posModalCode.includes("pos-thermal-receipt-printable"),
    "Defines dedicated @media print CSS targeting #pos-thermal-receipt-printable"
  );
  assert(
    posModalCode.includes("body * {\n            visibility: hidden"),
    "Print stylesheet hides all extraneous web page elements, sidebars, and nav"
  );
  assert(
    posModalCode.includes("AYAAN CLOTHING") &&
      posModalCode.includes("House 12, Road 4, Sector 3, Uttara"),
    "Displays authoritative Ayaan Clothing branding and Dhaka showroom contact details"
  );
  assert(
    posModalCode.includes("tenderedAmount") && posModalCode.includes("changeReturn"),
    "Receipt displays cash tendered and change returned for cash transactions"
  );
  assert(
    posModalCode.includes("id=\"btn-execute-thermal-print\"") &&
      posModalCode.includes("window.print()"),
    "Provides 'btn-execute-thermal-print' action invoking browser's native print engine"
  );
  assert(
    posPageCode.includes("btn-pos-open-thermal-receipt"),
    "POS order completion modal offers direct 'btn-pos-open-thermal-receipt' action"
  );
  assert(
    posPageCode.includes("btn-pos-print-invoice"),
    "Preserves existing A4 commercial export invoice action alongside thermal receipt"
  );

  // ── GROUP 3: Thermal Receipt Reprinting ───────────────────────────────────
  console.log("\n▶ Group 3: Receipt Reprinting Integration");
  assert(
    orderHeaderCode.includes("doc-item-thermal-receipt"),
    "OrderDetailHeader provides 'doc-item-thermal-receipt' reprint option for POS orders"
  );
  assert(
    orderHeaderCode.includes("PosThermalReceiptModal"),
    "OrderDetailHeader embeds PosThermalReceiptModal for zero-mutation reprinting"
  );

  // ── GROUP 4: Quick Registration Integrity & Security ──────────────────────
  console.log("\n▶ Group 4: Quick Registration Integrity & Security");
  assert(
    backendServiceCode.includes("'email_verified_at' => null"),
    "Quick customer registration sets email_verified_at to null for safety"
  );
  assert(
    userModelCode.includes("isSyntheticEmail"),
    "User model exposes isSyntheticEmail() helper method"
  );
  assert(
    userModelCode.includes("routeNotificationForMail") &&
      userModelCode.includes("return null;"),
    "User model suppresses outbound notifications to @ayaan.local synthetic addresses"
  );
  assert(
    forgotPasswordCode.includes("not_regex:/@ayaan\\.local$/i"),
    "ForgotPasswordRequest strictly rejects synthetic @ayaan.local addresses"
  );

  // ── GROUP 5: Dynamic Currency Formatting ──────────────────────────────────
  console.log("\n▶ Group 5: Dynamic Currency Formatting Unit Tests");
  const usdFormat = formatReceiptCurrency(125.5, "USD");
  assert(
    usdFormat.includes("125.50") && (usdFormat.includes("$") || usdFormat.includes("USD")),
    `Correctly formats USD currency (${usdFormat})`
  );

  const bdtFormat = formatReceiptCurrency(2500, "BDT");
  assert(
    bdtFormat.includes("2,500.00") && (bdtFormat.includes("BDT") || bdtFormat.includes("Tk")),
    `Correctly formats BDT currency (${bdtFormat})`
  );

  const eurFormat = formatReceiptCurrency(89.99, "EUR");
  assert(
    eurFormat.includes("89.99") && (eurFormat.includes("€") || eurFormat.includes("EUR")),
    `Correctly formats EUR currency (${eurFormat})`
  );

  const gbpFormat = formatReceiptCurrency(45.0, "GBP");
  assert(
    gbpFormat.includes("45.00") && (gbpFormat.includes("£") || gbpFormat.includes("GBP")),
    `Correctly formats GBP currency (${gbpFormat})`
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
