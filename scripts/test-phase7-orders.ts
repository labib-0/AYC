import { adminOrderService } from "../src/services/admin/order.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase7StaticValidation() {
  console.log("============================================================");
  console.log("PHASE 7 — ORDERS & FULFILLMENT STATIC CODE & DATA VALIDATION");
  console.log("============================================================");

  // 1. Initial State & Pagination Verification
  console.log("\n--- 1. Order List & Pagination Tests ---");
  const page1 = await adminOrderService.getOrders({ page: 1, per_page: 20 });
  assert(page1.data.length === 20, `Page 1 returns 20 orders (received ${page1.data.length})`);
  assert(page1.total >= 25, `Total orders >= 25 (found ${page1.total})`);
  assert(page1.current_page === 1, "Current page is 1");
  assert(page1.last_page === 2, "Last page is 2 for 25 orders with 20/page");

  const page2 = await adminOrderService.getOrders({ page: 2, per_page: 20 });
  assert(page2.data.length >= 5, `Page 2 returns remaining orders (received ${page2.data.length})`);
  assert(page2.current_page === 2, "Current page is 2");
  assert(page1.data[0].id !== page2.data[0].id, "Page 1 and Page 2 orders are distinct");

  // 2. Metrics & KPI Summary
  console.log("\n--- 2. Order Metrics & KPI Summary Tests ---");
  const summary = await adminOrderService.getOrderSummary();
  assert(summary.totalOrders === page1.total, `Summary total matches store total (${summary.totalOrders})`);
  assert(summary.pending > 0, `Pending orders count: ${summary.pending}`);
  assert(summary.processing > 0, `Processing orders count: ${summary.processing}`);
  assert(summary.shipped > 0, `Shipped orders count: ${summary.shipped}`);
  assert(summary.paid > 0, `Paid orders count: ${summary.paid}`);
  assert(summary.pendingPayment > 0, `Pending payment orders count: ${summary.pendingPayment}`);

  // 3. Multi-Field Filter Tests
  console.log("\n--- 3. Multi-Field Filter Tests ---");
  const pendingOrders = await adminOrderService.getOrders({ status: "pending" });
  assert(pendingOrders.data.every((o) => o.status === "pending"), "Status filter 'pending' matches all returned items");

  const paidOrders = await adminOrderService.getOrders({ payment_status: "paid" });
  assert(paidOrders.data.every((o) => o.payment_status === "paid"), "Payment status filter 'paid' matches all returned items");

  const shippedFulfillment = await adminOrderService.getOrders({ fulfillment_status: "shipped" });
  assert(shippedFulfillment.data.every((o) => o.fulfillment_status === "shipped"), "Fulfillment status filter 'shipped' matches all returned items");

  // Combined filters
  const combinedFilter = await adminOrderService.getOrders({
    status: "processing",
    payment_status: "paid",
  });
  assert(
    combinedFilter.data.every((o) => o.status === "processing" && o.payment_status === "paid"),
    "Combined filter (status=processing, payment=paid) correctly narrows results"
  );

  // 4. Search Tests
  console.log("\n--- 4. Search Functionality Tests ---");
  // Search by order number
  const sampleOrder = page1.data[0];
  const searchByNumber = await adminOrderService.getOrders({ search: sampleOrder.order_number });
  assert(searchByNumber.data.some((o) => o.order_number === sampleOrder.order_number), `Found order by order_number (${sampleOrder.order_number})`);

  // Search by customer name
  const searchByName = await adminOrderService.getOrders({ search: sampleOrder.shipping_name });
  assert(searchByName.data.some((o) => o.shipping_name.toLowerCase().includes(sampleOrder.shipping_name.toLowerCase())), `Found order by customer name (${sampleOrder.shipping_name})`);

  // Search by company name if present
  const orderWithCompany = page1.data.find((o) => Boolean(o.shipping_company));
  if (orderWithCompany && orderWithCompany.shipping_company) {
    const searchByCompany = await adminOrderService.getOrders({ search: orderWithCompany.shipping_company });
    assert(searchByCompany.data.some((o) => o.shipping_company === orderWithCompany.shipping_company), `Found order by company name (${orderWithCompany.shipping_company})`);
  }

  // Search by email
  const searchByEmail = await adminOrderService.getOrders({ search: sampleOrder.email });
  assert(searchByEmail.data.some((o) => o.email.toLowerCase().includes(sampleOrder.email.toLowerCase())), `Found order by email (${sampleOrder.email})`);

  // 5. Allowed Status Transitions
  console.log("\n--- 5. Status Transition Matrix Tests ---");
  const pendingNext = adminOrderService.getAllowedNextStatuses("pending");
  assert(pendingNext.includes("confirmed") && pendingNext.includes("processing") && pendingNext.includes("cancelled"), "Pending allowed transitions: confirmed, processing, cancelled");

  const processingNext = adminOrderService.getAllowedNextStatuses("processing");
  assert(processingNext.includes("shipped") && processingNext.includes("cancelled"), "Processing allowed transitions: shipped, cancelled");

  const shippedNext = adminOrderService.getAllowedNextStatuses("shipped");
  assert(shippedNext.includes("delivered"), "Shipped allowed transition: delivered");

  const deliveredNext = adminOrderService.getAllowedNextStatuses("delivered");
  assert(deliveredNext.includes("refunded"), "Delivered allowed transition: refunded");

  const cancelledNext = adminOrderService.getAllowedNextStatuses("cancelled");
  assert(cancelledNext.length === 0, "Cancelled is a terminal state (no further transitions allowed)");

  // 6. Order Detail & Mutation Tests
  console.log("\n--- 6. Order Detail & Mutation Tests ---");
  // Find an order to test mutations on
  const testOrder = page1.data.find((o) => o.status === "pending") || page1.data[0];
  const orderDetail = await adminOrderService.getOrderById(testOrder.id);
  assert(orderDetail.id === testOrder.id, `Retrieved order detail for ID ${testOrder.id}`);
  assert(Array.isArray(orderDetail.items) && orderDetail.items.length > 0, "Order has line items");
  assert(orderDetail.total_amount > 0, `Order total is historical positive value: $${orderDetail.total_amount}`);

  // Test not-found error
  let notFoundCaught = false;
  try {
    await adminOrderService.getOrderById("non-existent-order-99999");
  } catch {
    notFoundCaught = true;
  }
  assert(notFoundCaught, "getOrderById correctly throws for non-existent order ID");

  // Mutation 1: Update order status
  const updatedStatus = await adminOrderService.updateOrderStatus(
    testOrder.id,
    "confirmed",
    "Admin confirmed B2B sales contract."
  );
  assert(updatedStatus.status === "confirmed", "Order status successfully updated to 'confirmed'");
  assert(
    updatedStatus.status_events?.some((e) => e.message?.includes("Admin confirmed B2B sales contract.")),
    "Status event appended to order timeline"
  );

  // Mutation 2: Update fulfillment
  const updatedFulfillment = await adminOrderService.updateFulfillment(
    testOrder.id,
    "processing",
    "AWB-TRACK-99182",
    "DHL Express Cargo",
    "Dispatched to terminal warehouse."
  );
  assert(updatedFulfillment.fulfillment_status === "processing", "Fulfillment status updated to 'processing'");
  assert(updatedFulfillment.carrier === "DHL Express Cargo", "Carrier updated to 'DHL Express Cargo'");
  assert(updatedFulfillment.tracking_number === "AWB-TRACK-99182", "Tracking number updated");

  // Mutation 3: Payment Proof Review
  const orderWithProof = page1.data.find((o) => Boolean(o.payment_proof_url)) || testOrder;
  const approvedPayment = await adminOrderService.reviewPaymentProof(
    orderWithProof.id,
    "approve",
    "Bank swift MT103 verified with treasury."
  );
  assert(approvedPayment.payment_status === "paid", "Payment proof approval sets payment_status to 'paid'");
  assert(approvedPayment.status === "processing", "Payment proof approval sets order status to 'processing'");

  // Mutation 4: Create Aramex Shipment
  const shipmentResult = await adminOrderService.createAramexShipment(testOrder.id);
  assert(Boolean(shipmentResult.tracking_number), `Aramex AWB tracking generated: ${shipmentResult.tracking_number}`);
  assert(shipmentResult.order.fulfillment_status === "shipped", "Order fulfillment status updated to 'shipped'");

  // Mutation 5: Refresh tracking
  const trackingRefresh = await adminOrderService.refreshTracking(testOrder.id);
  assert(Boolean(trackingRefresh.tracking.status), `Live carrier tracking retrieved: ${trackingRefresh.tracking.status}`);

  // Mutation 6: Ocean Freight Quote Update (Carrier-Neutral)
  const quoteResult = await adminOrderService.updateShippingQuote(testOrder.id, {
    amount: 320.50,
    quote_reference: "QT-LCL-2026-TEST",
    carrier: "Pacific Ocean Logistics",
    valid_until: "2026-12-31",
    notes: "FOB Chattogram to Rotterdam terminal quote.",
  });
  assert(quoteResult.order.shipping_cost === 320.50, "Shipping cost updated to $320.50");
  assert(quoteResult.order.carrier === "Pacific Ocean Logistics", "Carrier updated carrier-neutrally without hardcoded provider");

  // 7. Historical Price and Snapshot Integrity
  console.log("\n--- 7. Historical Price & Snapshot Integrity Tests ---");
  for (const item of orderDetail.items || []) {
    assert(typeof item.unit_price === "number" && item.unit_price > 0, `Line item '${item.product_name}' preserves historical unit_price: $${item.unit_price}`);
    assert(typeof item.line_total === "number" && item.line_total > 0, `Line item preserves historical line_total: $${item.line_total}`);
    assert(item.quantity > 0, `Line item quantity is positive: ${item.quantity}`);
  }

  // 8. Carrier Neutrality Check
  console.log("\n--- 8. Carrier Neutrality Verification ---");
  const freshOrders = await adminOrderService.getOrders({ per_page: 50 });
  const hasHardcodedAkijInTitles = freshOrders.data.some((o) =>
    o.carrier === "Akij Sea Freight"
  );
  assert(!hasHardcodedAkijInTitles, "No orders have hardcoded 'Akij Sea Freight' as carrier");

  console.log("\n============================================================");
  console.log("ALL PHASE 7 STATIC & CODE-LEVEL VALIDATION TESTS PASSED! 🎉");
  console.log("============================================================");
}

runPhase7StaticValidation().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
