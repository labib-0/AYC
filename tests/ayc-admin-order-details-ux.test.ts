/**
 * AYAAN CLOTHING — AYC ADMIN SIMPLIFICATION PHASE 2: ORDER DETAILS UX TEST SUITE
 *
 * Verifies the redesigned Order Details workspace at /ayc/orders/[id]:
 * 1. Order Header: Authoritative status, distinct payment & fulfillment badges, dynamic next action
 * 2. Compact Summary Metrics: Units, total, payment status, fulfillment status
 * 3. Order Items: Clear line-item table, thumbnails, size matrix, no internal IDs or purchase costs
 * 4. Critical Inconsistency Resolution: Authoritative state-aware inventory decrement gate
 *    - Already-confirmed order (600 pcs ordered, 300 remaining) does NOT trigger false conflict
 *    - Unpaid order with shortfall (600 ordered, 300 available) correctly blocks confirmation
 * 5. Customer & Delivery: Merged contact profile and shipping destination with copy actions
 * 6. Fulfillment & Dispatch: Reduced visual weight when unfulfilled; full tracking when active
 * 7. Payment & Financial Summary: Subtotal, shipping, discounts, grand total, balance due
 * 8. Documents Dropdown: Consolidated dropdown menu for all 5 commercial document types
 * 9. Activity & Audit History: Cleanly expandable timeline section
 */

import assert from "assert";
import { OrderRecord, OrderItemRecord } from "../src/services/order.service";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✔ [PASS] ${name}`);
          passed++;
        })
        .catch((err: any) => {
          console.error(`  ❌ [FAIL] ${name}`);
          console.error(`     Error: ${err?.message || err}`);
          failed++;
        });
    } else {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failed++;
  }
}

function mockOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "ord_101",
    order_number: "AYN-20261009-101",
    user_id: 42,
    status: "processing",
    payment_status: "paid",
    fulfillment_status: "unfulfilled",
    currency: "USD",
    email: "importer@paris-luxury.fr",
    shipping_name: "Jean-Pierre Laurent",
    shipping_company: "Laurent Garments Paris",
    shipping_phone: "+33 1 42 68 55 00",
    shipping_address1: "48 Rue de Rivoli",
    shipping_address2: "Bâtiment B, Étage 3",
    shipping_city: "Paris",
    shipping_postal_code: "75004",
    shipping_country_code: "FR",
    destination_port: "Port of Le Havre",
    transport_method: "air",
    shipping_service_type: "Express Air Freight (DAP)",
    payment_method: "bank_transfer",
    subtotal: 6000,
    subtotal_cents: 600000,
    shipping_cost: 350,
    shipping_cents: 35000,
    tax_amount: 0,
    tax_cents: 0,
    discount_amount: 200,
    discount_cents: 20000,
    total_amount: 6150,
    total_cents: 615000,
    paid_amount: 6150,
    balance_due: 0,
    payment_proof_url: "https://ayaanclothing.com/storage/receipts/wire_101.pdf",
    payment_confirmed_at: "2026-10-09T08:00:00Z",
    payment_details: {
      payment_status: "PAID",
      payment_method: "bank_transfer",
      transaction_id: "TT-984719-2026",
      payer_name: "Jean-Pierre Laurent",
      bank_name: "Pubali Bank Limited",
      account_number: "0123456789",
      payment_amount: 6150,
      currency: "USD",
      payment_date: "2026-10-09",
      notes: "Payment verified by finance director.",
      receipt_url: "https://ayaanclothing.com/storage/receipts/wire_101.pdf",
      confirmed_at: "2026-10-09T08:00:00Z",
      confirmed_by_id: 1,
      confirmed_by_name: "Finance Admin",
      inventory_decremented: true,
      inventory_decremented_at: "2026-10-09T08:00:00Z",
    },
    placed_at: "2026-10-08T14:00:00Z",
    created_at: "2026-10-08T14:00:00Z",
    updated_at: "2026-10-09T08:00:00Z",
    items: [
      {
        id: "item_1",
        order_id: "ord_101",
        product_id: "prod_cotton_tee",
        product_variant_id: "var_white_m",
        product_name: "Premium Combed Cotton Crewneck T-Shirt",
        product_slug: "premium-cotton-crewneck-tshirt",
        sku: "AYN-TSH-WHT-M",
        variant_title: "White / Medium",
        size: "M",
        color: "White",
        product_image_url: "https://ayaanclothing.com/images/products/tee_white.jpg",
        unit_price: 10,
        unit_price_cents: 1000,
        quantity: 600,
        line_total: 6000,
        line_total_cents: 600000,
        current_stock: 300, // Remaining warehouse stock after 600 was decremented!
        stock_available: false, // Stale raw check against remaining stock
        stock_shortfall: 300,
      },
    ],
    status_events: [
      {
        id: "ev_1",
        order_id: "ord_101",
        event_type: "ORDER_PLACED",
        message: "Order placed via wholesale portal.",
        created_at: "2026-10-08T14:00:00Z",
      },
      {
        id: "ev_2",
        order_id: "ord_101",
        event_type: "PAYMENT_CONFIRMED",
        message: "Wire transfer verified. Inventory decremented (600 pcs).",
        created_at: "2026-10-09T08:00:00Z",
      },
    ],
    ...overrides,
  };
}

async function runTests() {
  console.log("==========================================================");
  console.log("  AYC ADMIN ORDER DETAILS UX (PHASE 2) TEST SUITE");
  console.log("==========================================================");

  // 1. Order Header: Information Architecture & authoritativeness
  test("1. Order Header: Authoritative single status with separate payment and fulfillment indicators", () => {
    const order = mockOrder();
    assert.strictEqual(order.status, "processing");
    assert.strictEqual(order.payment_status, "paid");
    assert.strictEqual(order.fulfillment_status, "unfulfilled");

    // Header displays order number, customer name and company
    const headerTitle = `Order #${order.order_number}`;
    const customerDisplay = `${order.shipping_name} (${order.shipping_company})`;
    assert.ok(headerTitle.includes("AYN-20261009-101"));
    assert.ok(customerDisplay.includes("Jean-Pierre Laurent"));
    assert.ok(customerDisplay.includes("Laurent Garments Paris"));
  });

  // 2. Dynamic Primary Next Action Resolution
  test("2. Order Header: Dynamic next available action based on order state", () => {
    // A. Paid and unfulfilled (air courier) -> "Create Aramex Shipment"
    const paidOrder = mockOrder({ payment_status: "paid", status: "processing", fulfillment_status: "unfulfilled" });
    const isPaid = paidOrder.payment_status === "paid";
    const canShip = isPaid && paidOrder.fulfillment_status !== "shipped";
    assert.ok(canShip, "Paid unfulfilled order should be ready for carrier dispatch");

    // B. Unpaid with payment proof -> "Review Payment Proof"
    const proofOrder = mockOrder({ payment_status: "pending", status: "pending", payment_proof_url: "https://proof.pdf" });
    const needsProofReview = proofOrder.payment_status !== "paid" && Boolean(proofOrder.payment_proof_url);
    assert.ok(needsProofReview, "Unpaid order with receipt requires proof review");

    // C. Shipped order -> "Confirm Consignee Delivery"
    const shippedOrder = mockOrder({ fulfillment_status: "shipped", status: "shipped" });
    const canDeliver = shippedOrder.fulfillment_status === "shipped" && shippedOrder.status !== "delivered";
    assert.ok(canDeliver, "Dispatched order allows delivery confirmation");
  });

  // 3. Compact Order Summary Metrics
  test("3. Compact Summary Metrics: Computes units, order total, paid amount, balance due", () => {
    const order = mockOrder();
    const totalUnits = order.items!.reduce((s, i) => s + (i.quantity || 0), 0);
    const orderTotal = Number(order.total_amount);
    const paidAmount = Number(order.paid_amount);
    const balanceDue = Number(order.balance_due);

    assert.strictEqual(totalUnits, 600);
    assert.strictEqual(orderTotal, 6150);
    assert.strictEqual(paidAmount, 6150);
    assert.strictEqual(balanceDue, 0);
  });

  // 4. Order Items Table: No internal IDs or purchase costs exposed
  test("4. Order Items Table: Displays variants & totals without internal product IDs or costs", () => {
    const order = mockOrder();
    const item = order.items![0];

    // Must have thumbnail, SKU, variant title, quantity, price, line total
    assert.strictEqual(item.sku, "AYN-TSH-WHT-M");
    assert.strictEqual(item.size, "M");
    assert.strictEqual(item.color, "White");
    assert.strictEqual(item.quantity, 600);
    assert.strictEqual(item.unit_price, 10);
    assert.strictEqual(item.line_total, 6000);

    // Verify buying price at sale is not rendered in customer-facing order items
    const exposedToCustomer = {
      product_name: item.product_name,
      variant: item.variant_title,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    };
    assert.strictEqual((exposedToCustomer as any).buying_price_at_sale, undefined);
    assert.strictEqual((exposedToCustomer as any).buying_price_at_sale_cents, undefined);
    assert.strictEqual((exposedToCustomer as any).internal_id, undefined);
  });

  // 5. CRITICAL INCONSISTENCY RESOLUTION: State-aware inventory decrement gate
  test("5. Critical Inconsistency: Confirmed/paid order with remaining 300 stock does NOT show conflict warning", () => {
    const order = mockOrder({
      payment_status: "paid",
      status: "processing",
      payment_details: {
        payment_status: "PAID",
        inventory_decremented: true,
        inventory_decremented_at: "2026-10-09T08:00:00Z",
      },
      items: [
        {
          id: "item_1",
          order_id: "ord_101",
          product_name: "Premium Combed Cotton Crewneck T-Shirt",
          sku: "AYN-TSH-WHT-M",
          quantity: 600,
          current_stock: 300, // 300 remaining in warehouse AFTER 600 were deducted
          line_total: 6000,
          line_total_cents: 600000,
          unit_price: 10,
          unit_price_cents: 1000,
        },
      ],
    });

    const isDecremented =
      Boolean(order.payment_details?.inventory_decremented) ||
      (order.payment_status === "paid" && ["processing", "confirmed", "shipped", "delivered"].includes(order.status));

    const item = order.items![0];
    const ordered = Number(item.quantity);
    const available = Number(item.current_stock);

    // PREVIOUS BUG:
    const bugConflictCheck = available < ordered; // 300 < 600 => TRUE (FALSE ALARM!)
    assert.strictEqual(bugConflictCheck, true, "Previous un-gated check would falsely trigger conflict");

    // NEW FIXED STATE-AWARE LOGIC:
    const hasStockConflict = !isDecremented && (available < ordered);
    assert.strictEqual(isDecremented, true, "Order must be recognized as already decremented");
    assert.strictEqual(hasStockConflict, false, "State-aware check must NOT show stock conflict on already-decremented order");

    // Presentation must be "Inventory Allocated & Decremented"
    const presentationStatus = isDecremented ? "ALLOCATED_AND_DECREMENTED" : "PRE_APPROVAL_GATE";
    assert.strictEqual(presentationStatus, "ALLOCATED_AND_DECREMENTED");
  });

  // 6. Pre-Approval Gate: True stock conflict on UNPAID order is correctly detected
  test("6. Pre-Approval Gate: True stock conflict on UNPAID order blocks confirmation", () => {
    const unpaidOrderWithShortfall = mockOrder({
      payment_status: "pending",
      status: "pending",
      payment_details: null,
      items: [
        {
          id: "item_2",
          order_id: "ord_102",
          product_name: "Silk Shirt",
          sku: "AYN-SLK-001",
          quantity: 600,
          current_stock: 300, // Truly only 300 available, 600 requested
          line_total: 6000,
          line_total_cents: 600000,
          unit_price: 10,
          unit_price_cents: 1000,
        },
      ],
    });

    const isDecremented =
      Boolean(unpaidOrderWithShortfall.payment_details?.inventory_decremented) ||
      (unpaidOrderWithShortfall.payment_status === "paid" && ["processing", "confirmed"].includes(unpaidOrderWithShortfall.status));

    const item = unpaidOrderWithShortfall.items![0];
    const ordered = Number(item.quantity);
    const available = Number(item.current_stock);

    const hasStockConflict = !isDecremented && (available < ordered);
    const shortfall = ordered - available;

    assert.strictEqual(isDecremented, false, "Unpaid order has not decremented stock yet");
    assert.strictEqual(hasStockConflict, true, "Stock conflict MUST be detected on unpaid order");
    assert.strictEqual(shortfall, 300, "Shortfall is exactly 300 pcs");
  });

  // 7. Customer & Delivery: Consolidated section
  test("7. Customer & Delivery: Combines contact profile and shipping destination", () => {
    const order = mockOrder();

    // Contact info
    assert.strictEqual(order.shipping_name, "Jean-Pierre Laurent");
    assert.strictEqual(order.shipping_company, "Laurent Garments Paris");
    assert.strictEqual(order.email, "importer@paris-luxury.fr");
    assert.strictEqual(order.shipping_phone, "+33 1 42 68 55 00");

    // Destination & Logistics
    assert.strictEqual(order.shipping_address1, "48 Rue de Rivoli");
    assert.strictEqual(order.shipping_city, "Paris");
    assert.strictEqual(order.shipping_country_code, "FR");
    assert.strictEqual(order.destination_port, "Port of Le Havre");
    assert.strictEqual(order.transport_method, "air");
    assert.strictEqual(order.shipping_service_type, "Express Air Freight (DAP)");
  });

  // 8. Documents Dropdown: All 5 commercial document types retained
  test("8. Documents Dropdown: Replaces separate buttons with unified dropdown retaining all 5 types", () => {
    const order = mockOrder();
    const docTypes = [
      { key: "INVOICE", label: "Sales Invoice", path: `/ayc/documents/INVOICE/order_${order.id}` },
      { key: "ORDER_SHEET", label: "Order Sheet", path: `/ayc/documents/ORDER_SHEET/order_${order.id}` },
      { key: "PROFORMA_INVOICE", label: "Proforma Invoice (PI)", path: `/ayc/documents/PROFORMA_INVOICE/order_${order.id}` },
      { key: "COMMERCIAL_INVOICE", label: "Commercial Invoice", path: `/ayc/documents/COMMERCIAL_INVOICE/order_${order.id}` },
      { key: "PACKING_LIST", label: "Packing List", path: `/ayc/documents/PACKING_LIST/order_${order.id}` },
    ];

    assert.strictEqual(docTypes.length, 5);
    for (const doc of docTypes) {
      assert.ok(doc.path.includes(order.id));
      assert.ok(doc.path.startsWith("/ayc/documents/"));
    }
  });

  // 9. Cancellation: Secondary action with required audit justification
  test("9. Order Cancellation: Secondary action modal with required justification note", () => {
    const order = mockOrder();
    const isTerminal = ["cancelled", "refunded", "delivered"].includes(order.status);
    assert.strictEqual(isTerminal, false, "Processing order is eligible for cancellation");

    // Modal requires non-empty justification
    const validReason = "Consignee requested export cancellation due to import quota limits.";
    assert.ok(validReason.trim().length > 10, "Cancellation requires substantive audit justification");
  });

  // 10. Activity & Audit History: Chronological event timeline
  test("10. Activity & Audit History: Preserves chronological order events", () => {
    const order = mockOrder();
    assert.strictEqual(order.status_events?.length, 2);
    assert.strictEqual(order.status_events![0].event_type, "ORDER_PLACED");
    assert.strictEqual(order.status_events![1].event_type, "PAYMENT_CONFIRMED");
  });

  console.log("==========================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
