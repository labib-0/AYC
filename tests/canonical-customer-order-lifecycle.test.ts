/**
 * AYAAN CLOTHING — CANONICAL CUSTOMER ORDER LIFECYCLE VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Exactly 5 canonical customer lifecycle states:
 *    ORDER PLACED -> PAYMENT PENDING -> WAITING FOR APPROVAL -> ORDER CONFIRMED -> ON SHIPMENT
 * 2. Backend authoritative customer_status precedence
 * 3. Fallback compatibility mapping for historical orders
 * 4. Payment rejection preserves PAYMENT_PENDING state
 * 5. Timeline stage indexing and progress calculation
 */

import assert from "assert";
import {
  getCanonicalCustomerStatus,
  getOrderStatusPresentation,
  getCanonicalStepIndex,
  CANONICAL_TIMELINE_STAGES,
  CanonicalCustomerStatus,
} from "../src/lib/order-status";
import { OrderRecord } from "../src/services/order.service";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failed++;
  }
}

console.log("================================================================================");
console.log("TEST SUITE: CANONICAL CUSTOMER ORDER LIFECYCLE (5-STAGE WORKFLOW)");
console.log("================================================================================");

const baseOrder: OrderRecord = {
  id: "ord_101",
  order_number: "AYN-20261008-CANON1",
  user_id: 1,
  status: "pending",
  payment_status: "pending",
  fulfillment_status: "unfulfilled",
  currency: "USD",
  email: "buyer@ayaanclothing.com",
  shipping_name: "Tariq Rahman",
  shipping_address1: "Gulshan Avenue 12",
  shipping_city: "Dhaka",
  shipping_postal_code: "1212",
  shipping_country_code: "BD",
  payment_method: "bank_transfer",
  subtotal: 500,
  subtotal_cents: 50000,
  shipping_cost: 50,
  shipping_cents: 5000,
  tax_amount: 0,
  tax_cents: 0,
  discount_amount: 0,
  discount_cents: 0,
  total_amount: 550,
  total_cents: 55000,
  placed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [],
};

test("1. Order creation resolves to ORDER_PLACED when status is placed/order_placed", () => {
  const placedOrder: OrderRecord = {
    ...baseOrder,
    status: "order_placed",
    payment_status: "pending",
  };
  assert.strictEqual(getCanonicalCustomerStatus(placedOrder), "ORDER_PLACED");
  assert.strictEqual(getOrderStatusPresentation(placedOrder).label, "Order Placed");
  assert.strictEqual(getCanonicalStepIndex("ORDER_PLACED"), 1);
});

test("2. New unpaid order resolves to PAYMENT_PENDING", () => {
  const pendingOrder: OrderRecord = {
    ...baseOrder,
    status: "pending",
    payment_status: "pending",
  };
  assert.strictEqual(getCanonicalCustomerStatus(pendingOrder), "PAYMENT_PENDING");
  assert.strictEqual(getOrderStatusPresentation(pendingOrder).label, "Payment Pending");
  assert.strictEqual(getCanonicalStepIndex("PAYMENT_PENDING"), 2);
});

test("3. Payment proof upload resolves to WAITING_FOR_APPROVAL", () => {
  const submittedOrder: OrderRecord = {
    ...baseOrder,
    status: "pending",
    payment_status: "payment_submitted",
    payment_proof_url: "https://ayaanclothing.com/storage/receipts/proof_123.pdf",
  };
  assert.strictEqual(getCanonicalCustomerStatus(submittedOrder), "WAITING_FOR_APPROVAL");
  assert.strictEqual(getOrderStatusPresentation(submittedOrder).label, "Waiting for Approval");
  assert.ok(getOrderStatusPresentation(submittedOrder).description.includes("waiting for payment approval"));
  assert.strictEqual(getCanonicalStepIndex("WAITING_FOR_APPROVAL"), 3);
});

test("4. Rejected payment returns customer state to PAYMENT_PENDING for re-submission", () => {
  const rejectedOrder: OrderRecord = {
    ...baseOrder,
    status: "pending",
    payment_status: "failed",
    payment_proof_url: "https://ayaanclothing.com/storage/receipts/rejected.pdf",
  };
  assert.strictEqual(getCanonicalCustomerStatus(rejectedOrder), "PAYMENT_PENDING");
  assert.strictEqual(getOrderStatusPresentation(rejectedOrder).label, "Payment Pending");
});

test("5. Admin payment approval resolves to ORDER_CONFIRMED", () => {
  const confirmedOrder: OrderRecord = {
    ...baseOrder,
    status: "processing",
    payment_status: "paid",
    payment_confirmed_at: new Date().toISOString(),
  } as any;
  assert.strictEqual(getCanonicalCustomerStatus(confirmedOrder), "ORDER_CONFIRMED");
  assert.strictEqual(getOrderStatusPresentation(confirmedOrder).label, "Order Confirmed");
  assert.strictEqual(getCanonicalStepIndex("ORDER_CONFIRMED"), 4);
});

test("6. Active shipment transition resolves to ON_SHIPMENT", () => {
  const shippedOrder: OrderRecord = {
    ...baseOrder,
    status: "processing",
    payment_status: "paid",
    fulfillment_status: "shipped",
    carrier: "Aramex",
    tracking_number: "ARM-894729104",
    carrier_status: "in_transit",
  };
  assert.strictEqual(getCanonicalCustomerStatus(shippedOrder), "ON_SHIPMENT");
  assert.strictEqual(getOrderStatusPresentation(shippedOrder).label, "On Shipment");
  assert.strictEqual(getCanonicalStepIndex("ON_SHIPMENT"), 5);
});

test("7. Delivered or fulfilled historical orders resolve cleanly to ON_SHIPMENT", () => {
  const deliveredOrder: OrderRecord = {
    ...baseOrder,
    status: "delivered",
    payment_status: "paid",
    fulfillment_status: "delivered",
  };
  assert.strictEqual(getCanonicalCustomerStatus(deliveredOrder), "ON_SHIPMENT");
  assert.strictEqual(getOrderStatusPresentation(deliveredOrder).label, "On Shipment");
});

test("8. Prioritizes authoritative backend customer_status attribute over fallback fields", () => {
  const backendAuthoritativeOrder: OrderRecord = {
    ...baseOrder,
    status: "custom_internal_state",
    customer_status: "WAITING_FOR_APPROVAL",
  };
  assert.strictEqual(getCanonicalCustomerStatus(backendAuthoritativeOrder), "WAITING_FOR_APPROVAL");
  assert.strictEqual(getOrderStatusPresentation(backendAuthoritativeOrder).label, "Waiting for Approval");
});

test("9. Exactly five canonical stages in the timeline definition", () => {
  assert.strictEqual(CANONICAL_TIMELINE_STAGES.length, 5);
  const expectedKeys: CanonicalCustomerStatus[] = [
    "ORDER_PLACED",
    "PAYMENT_PENDING",
    "WAITING_FOR_APPROVAL",
    "ORDER_CONFIRMED",
    "ON_SHIPMENT",
  ];
  assert.deepStrictEqual(CANONICAL_TIMELINE_STAGES.map((s) => s.key), expectedKeys);
  assert.deepStrictEqual(CANONICAL_TIMELINE_STAGES.map((s) => s.stepNumber), [1, 2, 3, 4, 5]);
});

console.log("--------------------------------------------------------------------------------");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
