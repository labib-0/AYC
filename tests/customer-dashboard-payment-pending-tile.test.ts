import fs from "fs";
import path from "path";
import { getCanonicalCustomerStatus } from "../src/lib/order-status";
import { OrderRecord } from "../src/lib/services/orders";

/**
 * CUSTOMER DASHBOARD PAYMENT PENDING TILE & RECEIPT UPDATE VERIFICATION SUITE
 */
function runTests() {
  console.log("==================================================");
  console.log("CUSTOMER DASHBOARD PAYMENT PENDING TILE & RECEIPT AUDIT");
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

  // 1. Dashboard KPI Cards Visual & Semantic Structure
  const kpiPath = path.join(cwd, "src/components/dashboard/DashboardKPICards.tsx");
  const kpiCode = fs.readFileSync(kpiPath, "utf-8");

  assert(
    kpiCode.includes('title: "Payment Pending"') &&
    kpiCode.includes('href: "/dashboard/orders?status=PAYMENT_PENDING"') &&
    kpiCode.includes('cta: "Review Pending Payments"') &&
    kpiCode.includes('CreditCard') &&
    kpiCode.includes('pendingPaymentsCount = 0') &&
    kpiCode.includes('"Order Awaiting Payment" : "Orders Awaiting Payment"'),
    "DashboardKPICards defines Payment Pending tile with exact heading, CTA, icon, and pluralization"
  );

  assert(
    kpiCode.includes('bg-amber-500/10 text-amber-600') &&
    kpiCode.includes('hover:border-amber-300'),
    "Payment Pending tile uses the designated amber warning/status accent colors"
  );

  // 2. Real Authorized Data Connection in Dashboard Page
  const dashboardPath = path.join(cwd, "src/app/dashboard/page.tsx");
  const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");

  assert(
    dashboardCode.includes('getCanonicalCustomerStatus') &&
    dashboardCode.includes('getCanonicalCustomerStatus(o) === "PAYMENT_PENDING"') &&
    dashboardCode.includes('pendingPaymentsCount={pendingPaymentsCount}'),
    "Dashboard page calculates pendingPaymentsCount from authoritative getCanonicalCustomerStatus"
  );

  assert(
    dashboardCode.includes('(o.user_id && String(o.user_id) === String(user.id)) ||') &&
    dashboardCode.includes('(o.email && user.email && o.email.toLowerCase() === user.email.toLowerCase())'),
    "Dashboard strictly enforces customer data isolation before counting orders"
  );

  // 3. Actionable Destination in Orders Page
  const ordersPath = path.join(cwd, "src/app/dashboard/orders/page.tsx");
  const ordersCode = fs.readFileSync(ordersPath, "utf-8");

  assert(
    ordersCode.includes('useSearchParams') &&
    ordersCode.includes('searchParams.get("status")') &&
    ordersCode.includes('normalized === "PAYMENT_PENDING"'),
    "Orders page reads search query param and activates PAYMENT_PENDING tab filter"
  );

  assert(
    ordersCode.includes('React.Suspense') &&
    ordersCode.includes('<CustomerOrdersContent />'),
    "Orders page wraps search parameter component in Suspense boundary"
  );

  // 4. Sidebar & Documents Center Preservation
  const sidebarPath = path.join(cwd, "src/components/dashboard/DashboardSidebar.tsx");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");

  assert(
    sidebarCode.includes('href: "/dashboard/documents"') &&
    sidebarCode.includes('label: "Documents"'),
    "Dashboard sidebar preserves Documents navigation link intact"
  );

  // 5. Customer Payment Receipt Update Verification
  const orderDetailPath = path.join(cwd, "src/app/dashboard/orders/[id]/page.tsx");
  const orderDetailCode = fs.readFileSync(orderDetailPath, "utf-8");

  assert(
    orderDetailCode.includes('id="btn-toggle-replace-receipt"') &&
    orderDetailCode.includes('id="input-customer-receipt-upload"') &&
    orderDetailCode.includes('id="btn-submit-payment-details"') &&
    orderDetailCode.includes('uploadPaymentProof(selectedFile, order.id, details)'),
    "Customer order details page provides receipt replacement and upload controls"
  );

  assert(
    !orderDetailCode.includes('useState("Pubali Bank Limited")') &&
    orderDetailCode.includes('setPaymentBank(pd.bank_name)'),
    "Customer receipt form correctly handles buyer bank without hardcoding beneficiary bank"
  );

  // 6. Canonical Status Logic Unit Verification
  const samplePendingOrder = {
    id: "ord_101",
    order_number: "AYC-2026-00101",
    user_id: 1,
    status: "processing",
    payment_status: "pending",
    fulfillment_status: "unfulfilled",
    total_amount: 1250.00,
    subtotal: 1250.00,
    shipping_cost: 0,
    tax_amount: 0,
    discount_amount: 0,
    currency: "USD",
    items: [],
  } as unknown as OrderRecord;

  const samplePaidOrder = {
    id: "ord_102",
    order_number: "AYC-2026-00102",
    user_id: 1,
    status: "processing",
    payment_status: "paid",
    fulfillment_status: "unfulfilled",
    total_amount: 3400.00,
    subtotal: 3400.00,
    shipping_cost: 0,
    tax_amount: 0,
    discount_amount: 0,
    currency: "USD",
    items: [],
  } as unknown as OrderRecord;

  const sampleSubmittedOrder = {
    id: "ord_103",
    order_number: "AYC-2026-00103",
    user_id: 1,
    status: "processing",
    payment_status: "payment_submitted",
    fulfillment_status: "unfulfilled",
    total_amount: 2100.00,
    subtotal: 2100.00,
    shipping_cost: 0,
    tax_amount: 0,
    discount_amount: 0,
    currency: "USD",
    items: [],
  } as unknown as OrderRecord;

  assert(
    getCanonicalCustomerStatus(samplePendingOrder) === "PAYMENT_PENDING",
    "getCanonicalCustomerStatus resolves PAYMENT_PENDING for unpaid order"
  );

  assert(
    getCanonicalCustomerStatus(samplePaidOrder) === "ORDER_CONFIRMED",
    "getCanonicalCustomerStatus resolves ORDER_CONFIRMED for paid order"
  );

  assert(
    getCanonicalCustomerStatus(sampleSubmittedOrder) === "WAITING_FOR_APPROVAL",
    "getCanonicalCustomerStatus resolves WAITING_FOR_APPROVAL for submitted payment receipt"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
