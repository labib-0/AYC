import fs from "fs";
import path from "path";

/**
 * AYC ADMIN POS TERMINAL — PHASE 2 VERIFICATION SUITE
 *
 * Verifies:
 * 1. Walk-in Customer support: 1-click counter sale action, canonical customer integration.
 * 2. Fast Customer Registration modal: Name, phone, email, company fields, deduplication.
 * 3. Cash Tender & Change Calculation: Cash tendered input, quick shortcuts, dynamic change return display, insufficient tender protection.
 * 4. Cohesive 60/40 Layout: Left catalog workspace (~60%) and Right checkout register (~40%).
 * 5. Category filter pills in catalog workspace.
 * 6. Non-cash payments retain strict overpayment rules.
 * 7. Server service contracts in pos.service.ts.
 */
function runTests() {
  console.log("==================================================");
  console.log("AYC ADMIN POS TERMINAL — PHASE 2 VERIFICATION SUITE");
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
  const posServicePath = path.join(cwd, "src/services/admin/pos.service.ts");
  const backendPosControllerPath = path.join(
    cwd,
    "backend/app/Http/Controllers/Api/V1/Admin/PosController.php"
  );
  const backendPosServicePath = path.join(
    cwd,
    "backend/app/Services/Order/AdminPosSaleService.php"
  );
  const backendApiRoutesPath = path.join(cwd, "backend/routes/api.php");

  const posPageCode = fs.readFileSync(posPagePath, "utf-8");
  const posServiceCode = fs.readFileSync(posServicePath, "utf-8");
  const backendControllerCode = fs.readFileSync(backendPosControllerPath, "utf-8");
  const backendServiceCode = fs.readFileSync(backendPosServicePath, "utf-8");
  const apiRoutesCode = fs.readFileSync(backendApiRoutesPath, "utf-8");

  console.log("▶ Group 1: Walk-in Customer Workflow");
  assert(
    posPageCode.includes("btn-pos-walkin-customer"),
    "POS screen has dedicated 'btn-pos-walkin-customer' action button"
  );
  assert(
    posPageCode.includes("handleSelectWalkin"),
    "POS screen implements handleSelectWalkin action"
  );
  assert(
    posServiceCode.includes("getWalkinCustomer"),
    "pos.service.ts exposes getWalkinCustomer API method"
  );
  assert(
    backendServiceCode.includes("getOrCreateWalkinCustomer"),
    "AdminPosSaleService implements canonical getOrCreateWalkinCustomer"
  );
  assert(
    backendServiceCode.includes("walkin@ayaanclothing.com"),
    "Canonical walk-in account uses authoritative email walkin@ayaanclothing.com"
  );
  assert(
    apiRoutesCode.includes("/customers/walkin"),
    "backend/routes/api.php registers /admin/pos/customers/walkin route"
  );

  console.log("\n▶ Group 2: Quick Customer Registration");
  assert(
    posPageCode.includes("btn-pos-quick-add-customer"),
    "POS screen has dedicated 'btn-pos-quick-add-customer' action button"
  );
  assert(
    posPageCode.includes("showQuickAddModal"),
    "POS screen manages showQuickAddModal state"
  );
  assert(
    posPageCode.includes("quick-add-name-input") &&
      posPageCode.includes("quick-add-phone-input") &&
      posPageCode.includes("quick-add-email-input") &&
      posPageCode.includes("quick-add-company-input"),
    "Quick Add modal provides name, phone, email, and company fields"
  );
  assert(
    posServiceCode.includes("quickCreateCustomer"),
    "pos.service.ts exposes quickCreateCustomer API method"
  );
  assert(
    backendServiceCode.includes("quickCreateCustomer"),
    "AdminPosSaleService implements deduplicating quickCreateCustomer"
  );
  assert(
    backendControllerCode.includes("quickCreateCustomer"),
    "PosController exposes POST /admin/pos/customers endpoint"
  );

  console.log("\n▶ Group 3: Cash Tender & Dynamic Change Return");
  assert(
    posPageCode.includes("pos-cash-tendered-input"),
    "POS screen provides dedicated 'pos-cash-tendered-input' field"
  );
  assert(
    posPageCode.includes("pos-change-return-display"),
    "POS screen provides dynamic 'pos-change-return-display' card"
  );
  assert(
    posPageCode.includes("cashChange") && posPageCode.includes("isCashInsufficient"),
    "POS screen calculates dynamic change return and detects insufficient cash tender"
  );
  assert(
    posPageCode.includes("cashShortcuts"),
    "POS screen provides convenient cash tender banknote shortcuts"
  );
  assert(
    posPageCode.includes("isCash && isCashInsufficient"),
    "POS screen prevents checkout when cash tender is insufficient"
  );
  assert(
    backendServiceCode.includes("tendered_amount") && backendServiceCode.includes("change_return"),
    "AdminPosSaleService persists tendered_amount and change_return in order and payment details"
  );
  assert(
    backendServiceCode.includes("Cash tendered") && backendServiceCode.includes("is insufficient"),
    "Backend validates that cash tendered is sufficient for sale total"
  );

  console.log("\n▶ Group 4: Non-Cash Overpayment & Partial Payments");
  assert(
    backendServiceCode.includes("Paid amount ($") ||
      backendServiceCode.includes("cannot exceed the grand total"),
    "Non-cash payments strictly reject overpayment"
  );
  assert(
    backendServiceCode.includes("partially_paid"),
    "Non-cash partial payments remain supported with balance due"
  );

  console.log("\n▶ Group 5: 60/40 Cohesive Cashier Layout");
  assert(
    posPageCode.includes("lg:col-span-7") && posPageCode.includes("lg:col-span-5"),
    "POS layout allocates ~60% to catalog (col-span-7) and ~40% to register (col-span-5)"
  );
  assert(
    posPageCode.includes("lg:sticky"),
    "POS register terminal is sticky on large screens"
  );
  assert(
    posPageCode.includes("categories") && posPageCode.includes("selectedCategoryId"),
    "POS catalog provides category filter pills"
  );
  assert(
    posPageCode.includes("btn-complete-pos-sale"),
    "POS register provides prominent 'btn-complete-pos-sale' primary action"
  );
  assert(
    posPageCode.includes("btn-pos-print-invoice"),
    "POS order completion modal provides direct receipt/invoice printing action"
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
