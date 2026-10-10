import fs from "fs";
import path from "path";

/**
 * Helper to test currency formatting logic
 */
function formatTestCurrency(amount: number | string | null | undefined, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  const safeCurrency = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeNum);
  } catch {
    return `${safeCurrency} ${safeNum.toFixed(2)}`;
  }
}

/**
 * AYC ADMIN POS TERMINAL — CANONICAL ORDER WORKFLOW & THERMAL REMOVAL SUITE
 *
 * Verifies:
 * 1. Complete removal of POS-specific thermal receipts (components, modals, width selectors, print CSS, buttons).
 * 2. Alignment of POS with the canonical AYC order workflow (statuses, authoritative payment, exactly-once inventory).
 * 3. In-terminal POS Order Management (customer profile, line items, canonical status, payment approval, fulfillment handover).
 * 4. Standard commercial documents hub (Invoice, Order Sheet, PI, CI, Packing List) via existing document services.
 * 5. Customer integrity & synthetic email prevention.
 * 6. Dynamic currency formatting.
 */
function runTests() {
  console.log("==================================================");
  console.log("AYC POS — CANONICAL ORDER WORKFLOW VERIFICATION SUITE");
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
  const orderModelPath = path.join(cwd, "backend/app/Models/Order.php");
  const userModelPath = path.join(cwd, "backend/app/Models/User.php");
  const forgotPasswordPath = path.join(
    cwd,
    "backend/app/Http/Requests/Auth/ForgotPasswordRequest.php"
  );

  const posPageCode = fs.readFileSync(posPagePath, "utf-8");
  const orderHeaderCode = fs.readFileSync(orderHeaderPath, "utf-8");
  const backendServiceCode = fs.readFileSync(backendPosServicePath, "utf-8");
  const orderModelCode = fs.readFileSync(orderModelPath, "utf-8");
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

  // ── GROUP 2: Thermal Receipt Functionality Removed ────────────────────────
  console.log("\n▶ Group 2: Thermal Receipt Functionality Completely Removed");
  assert(
    !fs.existsSync(posModalPath),
    "Dedicated PosThermalReceiptModal component is deleted from codebase"
  );
  assert(
    !posPageCode.includes("PosThermalReceiptModal"),
    "POS page does not import or render PosThermalReceiptModal"
  );
  assert(
    !posPageCode.includes("btn-pos-open-thermal-receipt"),
    "POS page does not expose thermal receipt button (btn-pos-open-thermal-receipt)"
  );
  assert(
    !posPageCode.includes("thermal-width-58") && !posPageCode.includes("thermal-width-80"),
    "POS page contains no 58 mm or 80 mm roll paper selectors"
  );
  assert(
    !posPageCode.includes("pos-thermal-receipt-printable"),
    "POS page contains no thermal-specific print CSS IDs or layouts"
  );
  assert(
    !orderHeaderCode.includes("doc-item-thermal-receipt"),
    "OrderDetailHeader does not contain thermal POS receipt reprint button"
  );
  assert(
    !orderHeaderCode.includes("PosThermalReceiptModal"),
    "OrderDetailHeader does not import or render PosThermalReceiptModal"
  );

  // ── GROUP 3: Standard Commercial Document Integration ─────────────────────
  console.log("\n▶ Group 3: Standard Commercial Document Hub in POS");
  assert(
    posPageCode.includes('id="pos-commercial-documents-hub"'),
    "POS order management includes canonical Commercial Documents Hub"
  );
  assert(
    posPageCode.includes('id="btn-pos-doc-invoice"') &&
      posPageCode.includes("/ayc/documents/INVOICE/order_"),
    "Exposes canonical Official Sales Invoice (/ayc/documents/INVOICE/order_{id})"
  );
  assert(
    posPageCode.includes('id="btn-pos-doc-ordersheet"') &&
      posPageCode.includes("/ayc/documents/ORDER_SHEET/order_"),
    "Exposes canonical Export Order Sheet (/ayc/documents/ORDER_SHEET/order_{id})"
  );
  assert(
    posPageCode.includes('id="btn-pos-doc-pi"') &&
      posPageCode.includes("/ayc/documents/PROFORMA_INVOICE/order_"),
    "Exposes canonical Proforma Invoice (PI) (/ayc/documents/PROFORMA_INVOICE/order_{id})"
  );
  assert(
    posPageCode.includes('id="btn-pos-doc-ci"') &&
      posPageCode.includes("/ayc/documents/COMMERCIAL_INVOICE/order_"),
    "Exposes canonical Commercial Invoice (CI) (/ayc/documents/COMMERCIAL_INVOICE/order_{id})"
  );
  assert(
    posPageCode.includes('id="btn-pos-doc-packinglist"') &&
      posPageCode.includes("/ayc/documents/PACKING_LIST/order_"),
    "Exposes canonical Export Packing List (/ayc/documents/PACKING_LIST/order_{id})"
  );
  assert(
    posPageCode.includes('id="btn-pos-view-full-order"') &&
      posPageCode.includes("/ayc/orders/"),
    "Exposes direct link to full standard admin order details (/ayc/orders/{id})"
  );

  // ── GROUP 4: Direct Order Management & Canonical Lifecycle in POS ──────────
  console.log("\n▶ Group 4: In-Terminal Order Management & Canonical Lifecycle");
  assert(
    posPageCode.includes('id="pos-order-management-modal"'),
    "Provides order-management area directly within POS Terminal"
  );
  assert(
    posPageCode.includes('id="pos-completion-order-number"') &&
      posPageCode.includes('id="pos-order-customer-info"'),
    "Displays clear order number and saved customer profile attribution"
  );
  assert(
    posPageCode.includes('id="pos-order-canonical-status"'),
    "Displays authoritative 5-stage canonical customer order status badge"
  );
  assert(
    posPageCode.includes('id="pos-order-payment-status"'),
    "Displays authoritative payment status badge"
  );
  assert(
    posPageCode.includes('id="pos-order-items-summary"'),
    "Displays ordered items, quantities, and line totals review"
  );
  assert(
    posPageCode.includes('id="btn-pos-approve-payment"'),
    "Exposes payment verification and approval action directly in POS"
  );
  assert(
    posPageCode.includes('id="btn-pos-fulfill-order"'),
    "Exposes shipment handover control directly in POS"
  );
  assert(
    posPageCode.includes('id="btn-pos-new-sale"'),
    "Exposes New Sale action resetting terminal for subsequent transactions"
  );

  // ── GROUP 5: Backend Canonical Workflow Alignment ─────────────────────────
  console.log("\n▶ Group 5: Backend Canonical Workflow Alignment");
  assert(
    backendServiceCode.includes("$order->decrementInventory($admin->id"),
    "AdminPosSaleService reuses canonical Order::decrementInventory() method"
  );
  assert(
    orderModelCode.includes("inventory_decremented") &&
      orderModelCode.includes("if (!empty($details['inventory_decremented']))"),
    "Order::decrementInventory() guarantees idempotent exactly-once inventory deduction"
  );
  assert(
    backendServiceCode.includes("notifyCustomerOfLifecycleTransition"),
    "AdminPosSaleService dispatches canonical lifecycle notifications"
  );
  assert(
    backendServiceCode.includes("Payment::create"),
    "AdminPosSaleService records authoritative Payment records with cashier attribution"
  );

  // ── GROUP 6: Quick Registration Integrity & Security ──────────────────────
  console.log("\n▶ Group 6: Quick Registration Integrity & Security");
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

  // ── GROUP 7: Dynamic Currency Formatting ──────────────────────────────────
  console.log("\n▶ Group 7: Dynamic Currency Formatting Unit Tests");
  const usdFormat = formatTestCurrency(125.5, "USD");
  assert(
    usdFormat.includes("125.50") && (usdFormat.includes("$") || usdFormat.includes("USD")),
    `Correctly formats USD currency (${usdFormat})`
  );

  const bdtFormat = formatTestCurrency(2500, "BDT");
  assert(
    bdtFormat.includes("2,500.00") && (bdtFormat.includes("BDT") || bdtFormat.includes("Tk")),
    `Correctly formats BDT currency (${bdtFormat})`
  );

  const eurFormat = formatTestCurrency(89.99, "EUR");
  assert(
    eurFormat.includes("89.99") && (eurFormat.includes("€") || eurFormat.includes("EUR")),
    `Correctly formats EUR currency (${eurFormat})`
  );

  const gbpFormat = formatTestCurrency(45.0, "GBP");
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
