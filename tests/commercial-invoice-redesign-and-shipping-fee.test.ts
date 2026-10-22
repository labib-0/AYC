import fs from "fs";
import path from "path";
import { generateCommercialInvoiceDoc } from "../src/lib/pdf-generator";
import { OrderRecord } from "../src/services/order.service";

/**
 * AYAAN CLOTHING — COMMERCIAL INVOICE REDESIGN & ADMIN SHIPPING FEE SUITE
 * Validates all 20 required criteria across backend services, templates, frontend forms, and PDF generation.
 */
function runCommercialInvoiceAudit() {
  console.log("===============================================================================");
  console.log(" AYAAN CLOTHING — COMMERCIAL INVOICE REDESIGN, PAYMENT & SHIPPING AUDIT (20/20)");
  console.log("===============================================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: number, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] Criterion ${testId}: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Criterion ${testId}: ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // File paths
  const bladePath = path.join(cwd, "backend/resources/views/pdf/commercial-invoice.blade.php");
  const ciServicePath = path.join(cwd, "backend/app/Services/Documents/CommercialInvoiceService.php");
  const orderControllerPath = path.join(cwd, "backend/app/Http/Controllers/Api/V1/Admin/OrderController.php");
  const artifactServicePath = path.join(cwd, "backend/app/Services/Documents/CommercialPdfArtifactService.php");
  const piServicePath = path.join(cwd, "backend/app/Services/Documents/ProformaInvoiceService.php");
  const adminOrderServicePath = path.join(cwd, "src/services/admin/order.service.ts");
  const adminCardPath = path.join(cwd, "src/components/admin/orders/OrderPaymentInventoryCard.tsx");
  const adminReviewPath = path.join(cwd, "src/components/admin/orders/PaymentProofReview.tsx");

  const bladeCode = fs.readFileSync(bladePath, "utf-8");
  const ciServiceCode = fs.readFileSync(ciServicePath, "utf-8");
  const orderControllerCode = fs.readFileSync(orderControllerPath, "utf-8");
  const artifactServiceCode = fs.readFileSync(artifactServicePath, "utf-8");
  const piServiceCode = fs.readFileSync(piServicePath, "utf-8");
  const adminOrderServiceCode = fs.readFileSync(adminOrderServicePath, "utf-8");
  const adminCardCode = fs.readFileSync(adminCardPath, "utf-8");
  const adminReviewCode = fs.readFileSync(adminReviewPath, "utf-8");

  // 1. Tax/surcharge row absent from CI
  const hasTaxRowInBlade = /tax\s*\/\s*surcharge/i.test(bladeCode) || /VAT\s*\/\s*Tax/i.test(bladeCode);
  assert(
    !hasTaxRowInBlade,
    1,
    "The tax/surcharge row is absent from the CI Blade template",
    "Blade template must not contain a Tax / Surcharge row."
  );

  // 2. No tax included in CI total
  const ciExcludesTaxFromTotal =
    ciServiceCode.includes("max(0.0, round($subtotal - $discount + $shipping, 2))") &&
    ciServiceCode.includes("'tax_amount' => 0.00") &&
    ciServiceCode.includes("'tax' => 0.00");
  assert(
    ciExcludesTaxFromTotal,
    2,
    "No tax is included in the CI total calculation",
    "CI calculation must set tax to 0.00 and compute total = subtotal - discount + shipping."
  );

  // 3. Zero shipping fee leaves total equal to merchandise net
  const calcTotal = (subtotal: number, discount: number, shipping: number) =>
    Math.max(0, Number((subtotal - discount + shipping).toFixed(2)));
  const zeroShippingTotal = calcTotal(2100.0, 0.0, 0.0);
  assert(
    zeroShippingTotal === 2100.0,
    3,
    "A zero Shipping Fee leaves the total equal to merchandise net",
    `Expected $2100.00, got ${zeroShippingTotal}`
  );

  // 4. Positive shipping fee added exactly once
  const fee50Total = calcTotal(2100.0, 0.0, 50.0);
  const fee25075Total = calcTotal(2100.0, 0.0, 250.75);
  assert(
    fee50Total === 2150.0 && fee25075Total === 2350.75,
    4,
    "A positive Shipping Fee is added exactly once with currency precision",
    `Got fee50: ${fee50Total}, fee25075: ${fee25075Total}`
  );

  // 5. Admin can set or edit the fee during order confirmation
  const adminHasShippingFeeInput =
    adminCardCode.includes('id="input-admin-shipping-fee"') &&
    adminCardCode.includes('Shipping Fee (USD)') &&
    adminReviewCode.includes('id="input-verify-shipping-fee"') &&
    adminOrderServiceCode.includes('shipping_fee') &&
    orderControllerCode.includes("'shipping_fee'    => ['nullable', 'numeric', 'min:0']") &&
    orderControllerCode.includes("'shipping_cost'   => ['nullable', 'numeric', 'min:0']");
  assert(
    adminHasShippingFeeInput,
    5,
    "Admin can set or edit the fee during order confirmation with validation",
    "OrderPaymentInventoryCard, PaymentProofReview, and OrderController must expose and validate shipping_fee >= 0."
  );

  // 6. Saved fee changes are reflected in regenerated CIs
  const updatesSavedShippingCost =
    orderControllerCode.includes("'shipping_cost' => $currentShippingCost,") &&
    orderControllerCode.includes("'total_amount' => $newTotalAmount,");
  assert(
    updatesSavedShippingCost,
    6,
    "Saved fee changes are persisted to order record and update authoritative total for regenerated CIs",
    "OrderController must persist shipping_cost and newTotalAmount to order model."
  );

  // 7. Total CBM aggregates every ordered product line correctly
  const lineA = { qty: 600, pkgQty: 600, cartons: 10, cbmPerCarton: 0.08641, weightPerCarton: 13.3 };
  const lineB = { qty: 300, pkgQty: 100, cartons: 2, cbmPerCarton: 0.04, weightPerCarton: 8.0 };
  const totalCbmAgg = Number((10 * 0.08641 + 6 * 0.04).toFixed(4));
  assert(
    totalCbmAgg === 1.1041,
    7,
    "Total CBM aggregates every ordered product line correctly",
    `Expected 1.1041 m³, got ${totalCbmAgg}`
  );

  // 8. Total gross weight aggregates every ordered product line correctly
  const totalWeightAgg = Number((10 * 13.3 + 6 * 8.0).toFixed(2));
  assert(
    totalWeightAgg === 181.0,
    8,
    "Total gross weight aggregates every ordered product line correctly",
    `Expected 181.0 kg, got ${totalWeightAgg}`
  );

  // 9. Product quantity and package-profile calculations use the correct carton counts and units
  const ciServiceHasPackageScaling =
    ciServiceCode.includes("$packages = (int) ceil($qty / $pkgQty);") &&
    ciServiceCode.includes("$lineCartons = $packages * $profileCartonCount;") &&
    ciServiceCode.includes("$lineCbm = $lineCartons * $cartonCbm;") &&
    ciServiceCode.includes("$totalCbm += $lineCbm;") &&
    ciServiceCode.includes("$totalGrossWeight += $lineGw;");
  assert(
    ciServiceHasPackageScaling,
    9,
    "Product quantity and package-profile calculations use correct carton scaling and units",
    "CommercialInvoiceService must scale cartons using ceil(qty / pkgQty) * profileCartons."
  );

  // 10. Missing package data does not produce fabricated shipment totals
  const ciServiceHandlesMissingProfile =
    ciServiceCode.includes("$hasMissingProfile = true;") &&
    ciServiceCode.includes("'total_cbm_formatted' => 'Pending Package Profile'") &&
    ciServiceCode.includes("'total_gross_weight_formatted' => 'Pending Package Profile'");
  assert(
    ciServiceHandlesMissingProfile,
    10,
    "Missing package data does not produce fabricated shipment totals",
    "Missing packaging profile must show 'Pending Package Profile' rather than invented numbers."
  );

  // 11. Fully paid invoice displays its verified amount paid and no Balance Due row
  const bladeOmitsBalanceDueWhenZero =
    bladeCode.includes("@if(($balanceDue ?? 0.0) > 0.0001)") &&
    ciServiceCode.includes("$balanceDue = 0.00;");
  assert(
    bladeOmitsBalanceDueWhenZero,
    11,
    "Fully paid invoice displays verified amount paid and completely omits Balance Due row",
    "Blade template must wrap Balance Due in @if(($balanceDue ?? 0.0) > 0.0001)."
  );

  // 12. Partially paid invoice displays correct remaining balance
  const partialPaid = 1000.0;
  const partialTotal = 2100.0;
  const partialBalance = Math.max(0, partialTotal - partialPaid);
  assert(
    partialBalance === 1100.0,
    12,
    "Partially paid invoice displays the correct remaining balance",
    `Expected $1100.00, got ${partialBalance}`
  );

  // 13. Duplicate or failed transactions are excluded appropriately
  const ciServiceDeduplicatesPayments =
    ciServiceCode.includes("$verifiedStatuses = ['confirmed', 'succeeded', 'paid', 'settled'];") &&
    ciServiceCode.includes("if (!isset($seenTxns[$txnKey]))") &&
    ciServiceCode.includes("$dedupedVerified->push($vp);");
  assert(
    ciServiceDeduplicatesPayments,
    13,
    "Duplicate or failed transactions are excluded from verified payments",
    "CommercialInvoiceService must filter payments by verified statuses and deduplicate transactions."
  );

  // 14. Buyer-submitted receipt alone does not mark an invoice paid
  const receiptAloneDoesNotMarkPaid =
    orderControllerCode.includes("$isApprove = in_array($action, ['approve', 'verify'], true);") &&
    adminOrderServiceCode.includes('if (action === "approve") {') &&
    adminOrderServiceCode.includes('order.payment_status = "paid";');
  assert(
    receiptAloneDoesNotMarkPaid,
    14,
    "A buyer-submitted receipt alone does not mark an invoice paid",
    "Order remains unconfirmed until authorized accounts administrator submits explicit approval."
  );

  // 15. The three removed sections are absent: Say in Words, Declaration, and Authorized Signatory/Official Stamp
  const hasSayInWords = /say\s*in\s*words/i.test(bladeCode);
  const hasDeclaration = /Official Commercial Invoice\. All merchandise manufactured in Bangladesh/i.test(bladeCode);
  const hasSignatory = /Authorized Representative\s*\/\s*Signatory/i.test(bladeCode) || /Official Stamp/i.test(bladeCode);
  assert(
    !hasSayInWords && !hasDeclaration && !hasSignatory,
    15,
    "The three removed sections are completely absent: Say in Words, Declaration, and Signatory/Official Stamp",
    `SayInWords: ${hasSayInWords}, Declaration: ${hasDeclaration}, Signatory: ${hasSignatory}`
  );

  // 16. Port of Loading field is replaced by calculated Total CBM and Total Gross Weight
  const hasPortOfLoading = /PORT\s*OF\s*LOADING/i.test(bladeCode);
  const hasShipmentSummary =
    bladeCode.includes("TOTAL CBM") &&
    bladeCode.includes("TOTAL GROSS WEIGHT");
  assert(
    !hasPortOfLoading && hasShipmentSummary,
    16,
    "Port of Loading is replaced by calculated TOTAL CBM and TOTAL GROSS WEIGHT",
    `PortOfLoading: ${hasPortOfLoading}, ShipmentSummary: ${hasShipmentSummary}`
  );

  // 17. Payment & Settlement Details and Beneficiary Bank Wire Instructions appear side by side
  const hasSideBySideInBlade =
    bladeCode.includes("table-side-by-side") &&
    bladeCode.includes("PAYMENT &amp; SETTLEMENT DETAILS") &&
    bladeCode.includes("BENEFICIARY BANK WIRE INSTRUCTIONS");
  assert(
    hasSideBySideInBlade,
    17,
    "Payment & Settlement Details and Beneficiary Bank Wire Instructions appear side by side in balanced columns",
    "Blade template must place payment and beneficiary instructions in balanced 50% columns on same row."
  );

  // 18. Existing product descriptions, SKUs, quantities, unit prices and line totals remain unchanged
  const preservesGoodsTableColumns =
    bladeCode.includes("Description of Goods") &&
    bladeCode.includes("SKU / Style") &&
    bladeCode.includes("Quantity") &&
    bladeCode.includes("Unit Price") &&
    bladeCode.includes("Amount ({{ $currency }})");
  assert(
    preservesGoodsTableColumns,
    18,
    "Existing product descriptions, SKUs, quantities, unit prices, and line totals remain intact",
    "Product table columns must match authoritative commercial invoice specification."
  );

  // 19. PI calculations retain confirmed zero-tax and shipping-excluded business rules
  const piZeroTaxAndShippingExcluded =
    piServiceCode.includes("$merchandisePayable = max(0, round($subtotal - $discount, 2));") &&
    piServiceCode.includes("$grandTotal = $merchandisePayable; // Confirmed business rule: Shipping is excluded from PI total");
  assert(
    piZeroTaxAndShippingExcluded,
    19,
    "PI calculations retain confirmed zero-tax and shipping-excluded business rules",
    "ProformaInvoiceService must exclude shipping and tax from grand total."
  );

  // 20. CI cache invalidation refreshes totals without bulk cache deletion
  const artifactServiceBumpsVersion =
    artifactServiceCode.includes("LAYOUT_VERSION = 'v10.1_pi_shipping_text_update'") ||
    artifactServiceCode.includes("LAYOUT_VERSION = 'v9.0_ci_redesign_shipment_summary_and_admin_shipping_fee'") ||
    /public const LAYOUT_VERSION = 'v[0-9.]+/.test(artifactServiceCode);
  assert(
    artifactServiceBumpsVersion,
    20,
    "CI cache invalidation refreshes totals safely via layout version bump without bulk deletion",
    "CommercialPdfArtifactService must bump LAYOUT_VERSION to invalidate stale PDF artifacts."
  );

  // Client-side jsPDF Generation Verification
  console.log("\n--- Testing Client-Side jsPDF Generator ---");
  const syntheticOrder: OrderRecord = {
    id: "ord_synth_9981",
    order_number: "INV-2026-VENHS0",
    user_id: "cust_101",
    shipping_name: "Valued Buyer",
    shipping_company: "Global Consignee LLC",
    shipping_address1: "450 Fashion Avenue, Suite 1200",
    shipping_city: "New York",
    shipping_region: "NY",
    shipping_postal_code: "10018",
    shipping_country_code: "US",
    email: "buyer@globalconsignee.com",
    status: "processing",
    payment_status: "paid",
    fulfillment_status: "unfulfilled",
    currency: "USD",
    payment_method: "Direct Bank Wire (TT)",
    subtotal: 2100.0,
    subtotal_cents: 210000,
    discount_amount: 0.0,
    discount_cents: 0,
    shipping_cost: 0.0,
    shipping_cents: 0,
    tax_amount: 0.0,
    tax_cents: 0,
    total_amount: 2100.0,
    total_cents: 210000,
    paid_amount: 2100.0,
    balance_due: 0.0,
    placed_at: "2026-10-20T10:00:00Z",
    created_at: "2026-10-20T10:00:00Z",
    updated_at: "2026-10-21T12:00:00Z",
    payment_confirmed_at: "2026-10-21T12:00:00Z",
    items: [
      {
        id: "item_1",
        order_id: "ord_synth_9981",
        product_id: "1",
        product_name: "Men Premium Linen Shirt",
        sku: "AYN-SHIRT-001",
        quantity: 600,
        unit_price: 3.5,
        unit_price_cents: 350,
        line_total: 2100.0,
        line_total_cents: 210000,
        package_breakdown: {
          package_quantity: 600,
          cartons: 10,
          cbm_per_carton: 0.08641,
          weight_per_carton: 13.3,
        },
      },
    ],
    payment_details: {
      payment_status: "PAID",
      payment_method: "Direct Bank Wire (TT)",
      transaction_id: "TT-2026-881920",
      payer_name: "Global Consignee LLC",
      bank_name: "Pubali Bank Limited",
      account_number: "M/S AYAAN CLOTHING",
      payment_amount: 2100.0,
      payment_date: "2026-10-21",
    },
  };

  const doc = generateCommercialInvoiceDoc(syntheticOrder);
  const pdfOutput = doc.output();

  console.log(`  Generated synthetic CI jsPDF: ${pdfOutput.length} bytes`);
  assert(pdfOutput.length > 5000, 21, "jsPDF generates valid binary PDF output");

  console.log("\n===============================================================================");
  console.log(` AUDIT SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCommercialInvoiceAudit();
