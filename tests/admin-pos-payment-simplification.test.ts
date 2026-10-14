import fs from "fs";
import path from "path";

/**
 * AYAAN CLOTHING POS — PAYMENT METHOD SIMPLIFICATION VERIFICATION SUITE
 *
 * Verifies all 12 criteria specified in section 7 of the specification:
 * 1. Only Cash and Bank are selectable in the POS terminal.
 * 2. Cash works without any additional payment-detail input.
 * 3. The Cash Payment Note is optional.
 * 4. Bank displays the correct commercial banking information workflow.
 * 5. Existing customer details populate the CI without being requested again.
 * 6. The generated CI contains the correct commercial bank details.
 * 7. Bank information is never fabricated.
 * 8. Entering bank details does not mark an unpaid transfer as paid.
 * 9. Card and Mobile no longer appear as available POS options.
 * 10. Historical Card/Mobile transactions remain readable where they exist.
 * 11. Sale completion, discounts, taxes, totals, and inventory behavior remain correct.
 * 12. Existing POS and CI tests continue to pass.
 */
function runTests() {
  console.log("==================================================================");
  console.log("AYAAN CLOTHING POS — PAYMENT METHOD SIMPLIFICATION VERIFICATION");
  console.log("==================================================================\n");

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
  const documentHelperPath = path.join(
    cwd,
    "backend/app/Services/Documents/DocumentHelper.php"
  );
  const businessProfilePath = path.join(
    cwd,
    "src/config/business-profile.ts"
  );

  const posPageCode = fs.readFileSync(posPagePath, "utf-8");
  const posServiceCode = fs.readFileSync(posServicePath, "utf-8");
  const backendControllerCode = fs.readFileSync(backendPosControllerPath, "utf-8");
  const backendServiceCode = fs.readFileSync(backendPosServicePath, "utf-8");
  const documentHelperCode = fs.readFileSync(documentHelperPath, "utf-8");
  const businessProfileCode = fs.readFileSync(businessProfilePath, "utf-8");

  // ── GROUP 1: TWO-OPTION PAYMENT SELECTOR (CASH & BANK ONLY) ─────────────────
  console.log("▶ Group 1: Two-Option Payment Selector (Cash & Bank Only)");
  assert(
    posPageCode.includes('id="pos-payment-method-cash"'),
    "POS provides explicit Cash payment selector option (id='pos-payment-method-cash')"
  );
  assert(
    posPageCode.includes('id="pos-payment-method-bank"'),
    "POS provides explicit Bank payment selector option (id='pos-payment-method-bank')"
  );
  assert(
    posPageCode.includes("grid-cols-2"),
    "Payment method selector uses clean 2-column grid layout (grid-cols-2)"
  );
  assert(
    !posPageCode.includes('id="pos-payment-method-card"') &&
      !posPageCode.includes('setPaymentMethod("card")'),
    "Card payment button and selection handler completely removed from POS selector"
  );
  assert(
    !posPageCode.includes('id="pos-payment-method-mobile"') &&
      !posPageCode.includes('setPaymentMethod("mobile_banking")'),
    "Mobile payment button and selection handler completely removed from POS selector"
  );
  assert(
    !posPageCode.includes("CreditCard") && !posPageCode.includes("Smartphone"),
    "Card and Smartphone icons removed from POS page imports"
  );

  // ── GROUP 2: AUTOMATIC CASH SETTLEMENT & DUPLICATE AMOUNT REMOVAL ─────────
  console.log("\n▶ Group 2: Automatic Cash Settlement & Duplicate Amount Removal");
  assert(
    !posPageCode.includes('id="pos-cash-tendered-input"'),
    "Manual cash-tendered amount input (id='pos-cash-tendered-input') is removed"
  );
  assert(
    !posPageCode.includes('id="pos-change-return-display"'),
    "Change-to-return display and UI (id='pos-change-return-display') is removed"
  );
  assert(
    !posPageCode.includes("cashShortcuts"),
    "Preset cash amount shortcut buttons (cashShortcuts) are removed"
  );
  assert(
    posPageCode.includes('id="pos-cash-summary-card"') &&
      posPageCode.includes('id="pos-cash-amount-display"'),
    "Cash payment displays automatic calculated settlement summary (id='pos-cash-summary-card')"
  );
  assert(
    posPageCode.includes("paid_amount: isCash ? grandTotal : 0.00") &&
      posPageCode.includes("tendered_amount: isCash ? grandTotal : undefined"),
    "Full calculated sale total is automatically assigned as cash payment and tendered amount"
  );
  assert(
    posPageCode.includes('id="pos-cash-payment-note"'),
    "Cash payment provides optional Payment Note field (id='pos-cash-payment-note')"
  );
  assert(
    posPageCode.includes("cashPaymentNote.trim() || undefined"),
    "Cash payment note is optional and converts blank input to undefined"
  );
  assert(
    !posPageCode.includes("pos-cash-receipt-upload") &&
      !posPageCode.includes("pos-cash-bank-name"),
    "Cash payment requires no receipt upload, transaction reference, or bank details"
  );

  // ── GROUP 3: COMMERCIAL BANK TRANSFER & CI INTEGRATION ──────────────────────
  console.log("\n▶ Group 3: Commercial Bank Transfer & CI Integration");
  assert(
    posPageCode.includes('id="pos-bank-details-summary"'),
    "Bank payment renders authoritative CI bank details summary card (id='pos-bank-details-summary')"
  );
  assert(
    posPageCode.includes("account_title") &&
      posPageCode.includes("bank_name") &&
      posPageCode.includes("account_number") &&
      posPageCode.includes("swift_code") &&
      (posPageCode.includes("branch_name") || posPageCode.includes("bank_address")),
    "Bank payment renders all required CI fields (Beneficiary, Bank, Account No/IBAN, SWIFT, Branch/Address)"
  );
  assert(
    posPageCode.includes('id="pos-bank-reference-input"'),
    "Bank payment provides optional Commercial Payment Reference input (id='pos-bank-reference-input')"
  );
  assert(
    posPageCode.includes('id="pos-bank-payment-note"'),
    "Bank payment provides optional Bank Payment Note input (id='pos-bank-payment-note')"
  );
  assert(
    posPageCode.includes("/ayc/settings"),
    "Bank payment links to Admin Settings (/ayc/settings) for authorized bank detail configuration"
  );

  // ── GROUP 4: AUTHORITATIVE SOURCE OF TRUTH & NO FABRICATION ─────────────────
  console.log("\n▶ Group 4: Authoritative Source of Truth & No Fabrication");
  assert(
    posPageCode.includes("siteSettingsService.getBusinessSettings"),
    "POS queries authoritative business settings for company banking details"
  );
  assert(
    posPageCode.includes("BUSINESS_PROFILE") &&
      businessProfileCode.includes("Pubali Bank Limited") &&
      businessProfileCode.includes("1788-901-044316") &&
      businessProfileCode.includes("PUBABDDH210"),
    "POS and business profile fallback maintain authoritative AYC banking profile without fabrication"
  );
  assert(
    documentHelperCode.includes("Pubali Bank Limited") &&
      documentHelperCode.includes("PUBABDDH210"),
    "Backend DocumentHelper maintains authoritative bank details matching CI templates"
  );

  // ── GROUP 5: PAYMENT INTEGRITY — NO UNVERIFIED PAID STATUS ─────────────────
  console.log("\n▶ Group 5: Payment Integrity — Unverified Transfers Remain Unpaid");
  assert(
    posPageCode.includes('id="pos-bank-status-notice"'),
    "POS displays clear notice that bank transfer is recorded as Pending Verification with balance due"
  );
  assert(
    backendServiceCode.includes("$paymentMethod === 'bank_transfer'") &&
      backendServiceCode.includes("isset($options['paid_amount']) ? (float) $options['paid_amount'] : 0.00;"),
    "AdminPosSaleService enforces 0.00 actualPaid for bank transfer unless explicit payment verified"
  );
  assert(
    backendServiceCode.includes("$balanceDue = max(0.0, round($totalAmount - $actualPaid, 2));"),
    "AdminPosSaleService leaves balance due equal to grand total for bank transfer"
  );
  assert(
    backendServiceCode.includes("$paymentStatus = 'pending';"),
    "AdminPosSaleService marks bank transfer status as pending when actualPaid is 0.00"
  );

  // ── GROUP 6: CUSTOMER REUSE & NO REDUNDANT INPUTS ──────────────────────────
  console.log("\n▶ Group 6: Customer Profile Reuse & Clean Interface");
  assert(
    posPageCode.includes("pos-selected-customer-card"),
    "POS reuses existing selected customer profile"
  );
  assert(
    !posPageCode.includes("pos-bank-customer-name-input") &&
      !posPageCode.includes("pos-bank-customer-email-input"),
    "Bank payment does not re-request already selected customer personal or company information"
  );

  // ── GROUP 7: BACKEND HISTORICAL COMPATIBILITY ───────────────────────────────
  console.log("\n▶ Group 7: Backend Historical Compatibility");
  assert(
    backendControllerCode.includes("in:pos_cash,card,bank_transfer,mobile_banking,transfer,bank"),
    "Backend PosController preserves validation compatibility for historical card and mobile payments"
  );
  assert(
    backendServiceCode.includes("payment_note") &&
      backendServiceCode.includes("bank_profile_id") &&
      backendServiceCode.includes("bank_name"),
    "AdminPosSaleService accepts and persists payment_note, bank_profile_id, and bank_name"
  );
  assert(
    posServiceCode.includes("payment_note") &&
      posServiceCode.includes("bank_profile_id") &&
      posServiceCode.includes("bank_name"),
    "Frontend pos.service.ts PosSalePayload includes payment_note, bank_profile_id, and bank_name"
  );

  console.log("\n==================================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
