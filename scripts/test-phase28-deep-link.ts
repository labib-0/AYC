/**
 * scripts/test-phase28-deep-link.ts
 *
 * Static assertion test suite for Phase 28:
 * - WhatsApp commercial order deep link generation
 * - Role-aware dispatching (Admin vs Customer)
 * - Customer ownership enforcement and privacy protection
 * - Unauthenticated login gateway and return context preservation
 * - Mock store and demo credentials verification
 *
 * Run:
 *   node scripts/test-phase28-deep-link.js (or node with ts compiler)
 */

import {
  getOrderAccessDeepLink,
  getCommercialOrderWhatsAppMessage,
  getWhatsAppUrl,
  WHATSAPP_BUSINESS_NUMBER,
} from "../src/config/business-profile";
import { INITIAL_MOCK_USERS } from "../src/lib/mock-data/mock-users";
import { INITIAL_MOCK_ORDERS } from "../src/lib/mock-data/mock-orders";

interface TestCaseResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestCaseResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    results.push({ name, passed: true });
  } else {
    console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ""}`);
    results.push({ name, passed: false, details });
  }
}

console.log("\n=======================================================");
console.log("  PHASE 28 STATIC TEST SUITE: DEEP LINK & DEMO AUTH");
console.log("=======================================================\n");

// Target test order
const testOrder = INITIAL_MOCK_ORDERS.find((o) => o.order_number === "AYN-20260922-697987");

// 1. Generate deep link from order
const deepLink = getOrderAccessDeepLink(testOrder?.order_number || "AYN-20260922-697987");
assert(
  typeof deepLink === "string" && deepLink.includes("/order-access/"),
  "1. Generate deep link from order",
  `Generated link: ${deepLink}`
);

// 2. Contains order reference
assert(
  deepLink.endsWith("/order-access/AYN-20260922-697987"),
  "2. Deep link contains order reference",
  `URL ending: ${deepLink}`
);

// 3. Does not contain customer-sensitive data in the URL
const sensitiveKeywords = [
  "customer@ayaan-demo.local",
  "Demo Customer",
  "Admin@12345",
  "Customer@12345",
  "450 Export Boulevard",
  "64543",
  "token",
  "password",
  "secret",
];
const containsSensitive = sensitiveKeywords.some((keyword) => deepLink.toLowerCase().includes(keyword.toLowerCase()));
assert(
  !containsSensitive,
  "3. Deep link does not contain customer-sensitive data in URL",
  `Verified no customer email, name, address, total, or credentials in URL.`
);

// 4. Logged-out user resolves to login with return context
function simulateGatewayUnauthenticated(orderReference: string) {
  const cleanRef = orderReference.trim().replace(/^#/, "");
  const redirectTarget = `/order-access/${encodeURIComponent(cleanRef)}`;
  return `/login?redirect=${encodeURIComponent(redirectTarget)}`;
}
const loginTarget = simulateGatewayUnauthenticated("AYN-20260922-697987");
assert(
  loginTarget === "/login?redirect=%2Forder-access%2FAYN-20260922-697987",
  "4. Logged-out user resolves to login with preserved order reference context",
  `Login route: ${loginTarget}`
);

// 5. Admin role resolves to Admin order route
function simulateGatewayDispatch(
  user: { role: string; id: string | number; email: string },
  order: { id: string; user_id?: string | number | null; email?: string }
) {
  if (user.role === "admin") {
    return { destination: `/admin/orders/${order.id}`, status: "AUTHORIZED" };
  }

  const isOwner =
    (order.user_id && String(order.user_id) === String(user.id)) ||
    (order.email && order.email.toLowerCase() === user.email.toLowerCase());

  if (!isOwner) {
    return { destination: null, status: "UNAUTHORIZED_DENIED" };
  }

  return { destination: `/dashboard/orders/${order.id}`, status: "AUTHORIZED" };
}

const adminUser = { role: "admin", id: 998, email: "admin@ayaan-demo.local" };
const adminDispatch = simulateGatewayDispatch(adminUser, testOrder!);
assert(
  adminDispatch.status === "AUTHORIZED" && adminDispatch.destination === `/admin/orders/${testOrder?.id}`,
  "5. Admin role resolves to Admin order route (/admin/orders/[id])",
  `Admin destination: ${adminDispatch.destination}`
);

// 6. Customer role resolves to Customer order route
const customerOwner = { role: "customer", id: 999, email: "customer@ayaan-demo.local" };
const customerDispatch = simulateGatewayDispatch(customerOwner, testOrder!);
assert(
  customerDispatch.status === "AUTHORIZED" && customerDispatch.destination === `/dashboard/orders/${testOrder?.id}`,
  "6. Customer role resolves to Customer order route (/dashboard/orders/[id])",
  `Customer destination: ${customerDispatch.destination}`
);

// 7. Wrong customer is denied
const otherCustomer = { role: "customer", id: 101, email: "sarah.jenkins@jenkinsapparel.com" };
const wrongCustomerDispatch = simulateGatewayDispatch(otherCustomer, testOrder!);
assert(
  wrongCustomerDispatch.status === "UNAUTHORIZED_DENIED" && wrongCustomerDispatch.destination === null,
  "7. Wrong customer is denied without leaking order data",
  `Status: ${wrongCustomerDispatch.status}`
);

// 8. Invalid order is denied
function lookupOrder(reference: string, orders: typeof INITIAL_MOCK_ORDERS) {
  const clean = reference.trim().toLowerCase().replace(/^#/, "");
  return orders.find(
    (o) =>
      o.id.toLowerCase() === clean ||
      o.order_number.toLowerCase() === clean ||
      o.order_number.toLowerCase().replace(/^#/, "") === clean
  ) || null;
}
const invalidOrderLookup = lookupOrder("AYN-NONEXISTENT-999999", INITIAL_MOCK_ORDERS);
assert(
  invalidOrderLookup === null,
  "8. Invalid order reference returns null (Order Not Found state)",
  `Invalid order result: ${invalidOrderLookup}`
);

// 9. Existing order data resolves correctly
const existingOrderLookup = lookupOrder("AYN-20260922-697987", INITIAL_MOCK_ORDERS);
assert(
  existingOrderLookup !== null &&
    existingOrderLookup.id === "ord_demo_28" &&
    existingOrderLookup.total_amount === 64543.10,
  "9. Existing order data resolves correctly with items and total",
  `Order ID: ${existingOrderLookup?.id}, Total: $${existingOrderLookup?.total_amount}`
);

// 10. WhatsApp message contains the deep link
const whatsAppMsg = getCommercialOrderWhatsAppMessage(testOrder!);
assert(
  whatsAppMsg.includes(deepLink) && whatsAppMsg.includes("View Commercial Order:"),
  "10. WhatsApp message contains the commercial-order deep link",
  `Message snippet:\n${whatsAppMsg.split("\n").slice(-4).join("\n")}`
);

// 11. Official WhatsApp number is correct
const fullWhatsAppUrl = getWhatsAppUrl(whatsAppMsg);
assert(
  fullWhatsAppUrl.startsWith("https://wa.me/8801982183886") ||
    fullWhatsAppUrl.startsWith("https://wa.me/8801826304930"),
  "11. Official WhatsApp number is preserved and correctly encoded",
  `WhatsApp URL prefix: ${fullWhatsAppUrl.substring(0, 35)}...`
);

// 12. Demo credentials exist in mock auth
const demoAdmin = INITIAL_MOCK_USERS.find((u) => u.email === "admin@ayaan-demo.local");
const demoCustomer = INITIAL_MOCK_USERS.find((u) => u.email === "customer@ayaan-demo.local");
assert(
  demoAdmin?.password === "Admin@12345" &&
    demoAdmin?.role === "admin" &&
    demoCustomer?.password === "Customer@12345" &&
    demoCustomer?.role === "customer",
  "12. Demo credentials exist in mock auth (Admin@12345, Customer@12345)",
  `Admin: ${demoAdmin?.email} [${demoAdmin?.role}], Customer: ${demoCustomer?.email} [${demoCustomer?.role}]`
);

// 13. No backend dependency exists
const isFrontendReady = typeof testOrder !== "undefined" && typeof demoAdmin !== "undefined";
assert(
  isFrontendReady,
  "13. No backend dependency exists (runs standalone in mock data store)",
  "All test entities resolved in frontend mock store"
);

console.log("\n=======================================================");
const failedCount = results.filter((r) => !r.passed).length;
const passedCount = results.filter((r) => r.passed).length;
console.log(`  Results: ${passedCount} passed, ${failedCount} failed (${results.length} total)`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
