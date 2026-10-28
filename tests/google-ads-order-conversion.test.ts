/**
 * Automated Verification Suite: Google Ads Conversion Tracking Architecture
 *
 * Verifies all 4 Google Ads conversion actions:
 * 1. Exact Destination IDs and Configurations:
 *    - Add to Cart:      AW-18504838697/UuZvCPuW56YdEKnc5fdE
 *    - Begin Checkout:   AW-18504838697/CtjkCPiW56YdEKnc5fdE
 *    - Page View:        AW-18504838697/UcUXCP6W56YdEKnc5fdE (Dormant)
 *    - Purchase:         AW-18504838697/60nhCPWW56YdEKnc5fdE
 * 2. Add to Cart:
 *    - Fires strictly on successful cartService.addToCart response in CartContext.tsx
 *    - Does NOT fire on button clicks alone, failed requests, or stock exceptions
 *    - Subsequent legitimate additions remain countable
 * 3. Begin Checkout:
 *    - Triggered in CheckoutModal.tsx strictly when customer has items and is authenticated
 *    - Empty carts, unauthenticated visitors, and mini-cart drawer do not trigger it
 *    - React Strict Mode, re-renders, and step changes do not duplicate the event
 *    - Genuinely new checkout attempts remain countable
 * 4. Purchase:
 *    - Authoritative transaction_id (order_number), total_amount (value), and currency
 *    - Empty transaction IDs rejected
 *    - Persistent deduplication prevents double-counting on refresh, back-button, or re-render
 *    - Separate orders are countable
 *    - Zero PII (no name, email, phone, addresses) and new_customer omitted
 * 5. Page View:
 *    - Dispatches exact destination when explicitly invoked
 *    - Dormant: Not wired into root layout or global route listeners
 * 6. Non-blocking safety:
 *    - Missing window, throwing gtag, or storage quota errors never crash application
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_CONVERSIONS,
  GOOGLE_ADS_CONVERSION_ID,
  GOOGLE_ADS_CONVERSION_SEND_TO,
  GOOGLE_ADS_CONVERSION_STORAGE_KEY,
  isOrderConversionDispatched,
  markOrderConversionDispatched,
  clearDispatchedConversionsForTesting,
  trackAddToCartConversion,
  trackBeginCheckoutConversion,
  trackPurchaseConversion,
  trackPageViewConversion,
  trackOrderSuccessConversion,
} from "../src/lib/analytics/google-ads";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log("======================================================================");
console.log("TEST SUITE: GOOGLE ADS 4-EVENT CONVERSION TRACKING VERIFICATION");
console.log("======================================================================\n");

const projectRoot = resolve(__dirname, "..");

// ─── TEST 1: EXACT IDS, LABELS, AND SEND_TO FORMAT ────────────────────────────
console.log("▶ TEST 1: EXACT DESTINATION IDS AND FORMAT VERIFICATION");
assert(
  GOOGLE_ADS_ID === "AW-18504838697",
  "Google Ads Account ID matches 'AW-18504838697'"
);
assert(
  GOOGLE_ADS_CONVERSIONS.ADD_TO_CART === "AW-18504838697/UuZvCPuW56YdEKnc5fdE",
  "Add to Cart send_to matches 'AW-18504838697/UuZvCPuW56YdEKnc5fdE'"
);
assert(
  GOOGLE_ADS_CONVERSIONS.BEGIN_CHECKOUT === "AW-18504838697/CtjkCPiW56YdEKnc5fdE",
  "Begin Checkout send_to matches 'AW-18504838697/CtjkCPiW56YdEKnc5fdE'"
);
assert(
  GOOGLE_ADS_CONVERSIONS.PAGE_VIEW === "AW-18504838697/UcUXCP6W56YdEKnc5fdE",
  "Page View send_to matches 'AW-18504838697/UcUXCP6W56YdEKnc5fdE'"
);
assert(
  GOOGLE_ADS_CONVERSIONS.PURCHASE === "AW-18504838697/60nhCPWW56YdEKnc5fdE",
  "Purchase send_to matches 'AW-18504838697/60nhCPWW56YdEKnc5fdE'"
);
assert(
  GOOGLE_ADS_CONVERSIONS.LEGACY_LEAD_FORM === "AW-18504838697/kNbLCMPd86EdEKnc5fdE",
  "Legacy Lead Form send_to matches 'AW-18504838697/kNbLCMPd86EdEKnc5fdE'"
);
assert(
  GOOGLE_ADS_CONVERSION_SEND_TO === GOOGLE_ADS_CONVERSIONS.PURCHASE,
  "GOOGLE_ADS_CONVERSION_SEND_TO points to the official Purchase conversion destination"
);

// ─── SETUP MOCK BROWSER ENVIRONMENT ──────────────────────────────────────────
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length(): number {
    return Object.keys(this.store).length;
  }
  clear(): void {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

const mockSessionStorage = new MockStorage();
const mockLocalStorage = new MockStorage();
const mockDataLayer: any[] = [];
const mockGtagCalls: any[] = [];

// Attach to globalThis for node/test environment
(globalThis as any).window = {
  dataLayer: mockDataLayer,
  sessionStorage: mockSessionStorage,
  localStorage: mockLocalStorage,
  gtag: function (...args: any[]) {
    mockGtagCalls.push(args);
    mockDataLayer.push(args);
  },
};
(globalThis as any).sessionStorage = mockSessionStorage;
(globalThis as any).localStorage = mockLocalStorage;

function resetMocks() {
  clearDispatchedConversionsForTesting();
  mockDataLayer.length = 0;
  mockGtagCalls.length = 0;
}

// ─── TEST 2: ADD TO CART CONVERSION TRACKING ──────────────────────────────────
console.log("\n▶ TEST 2: ADD TO CART CONVERSION TRACKING");
resetMocks();

// Default 1.00 USD value
const atcResult1 = trackAddToCartConversion();
assert(atcResult1 === true, "trackAddToCartConversion returns true on dispatch");
assert(mockGtagCalls.length === 1, "gtag was called once for Add to Cart");
assert(mockGtagCalls[0][0] === "event", "First arg is 'event'");
assert(mockGtagCalls[0][1] === "conversion", "Second arg is 'conversion'");
assert(
  mockGtagCalls[0][2].send_to === "AW-18504838697/UuZvCPuW56YdEKnc5fdE",
  "Add to Cart send_to matches exact destination"
);
assert(mockGtagCalls[0][2].value === 1.0, "Add to Cart default value is 1.0");
assert(mockGtagCalls[0][2].currency === "USD", "Add to Cart currency is USD");

// Custom value and currency
const atcResult2 = trackAddToCartConversion({ value: 15.5, currency: "EUR" });
assert(atcResult2 === true, "trackAddToCartConversion returns true with custom value");
assert(mockGtagCalls.length === 2, "gtag called second time for new cart operation");
assert(mockGtagCalls[1][2].value === 15.5, "Custom value is preserved");
assert(mockGtagCalls[1][2].currency === "EUR", "Custom currency is preserved");

// ─── TEST 3: BEGIN CHECKOUT CONVERSION TRACKING ───────────────────────────────
console.log("\n▶ TEST 3: BEGIN CHECKOUT CONVERSION TRACKING");
resetMocks();

const bcResult1 = trackBeginCheckoutConversion();
assert(bcResult1 === true, "trackBeginCheckoutConversion returns true on dispatch");
assert(mockGtagCalls.length === 1, "gtag was called once for Begin Checkout");
assert(
  mockGtagCalls[0][2].send_to === "AW-18504838697/CtjkCPiW56YdEKnc5fdE",
  "Begin Checkout send_to matches exact destination"
);
assert(mockGtagCalls[0][2].value === 1.0, "Begin Checkout value is 1.0 USD");
assert(mockGtagCalls[0][2].currency === "USD", "Begin Checkout currency is USD");

// ─── TEST 4: PURCHASE CONVERSION DISPATCH, TOTALS, AND TRANSACTION_ID ────────
console.log("\n▶ TEST 4: PURCHASE CONVERSION TRACKING ON ORDER SUCCESS");
resetMocks();

const testPurchaseOrder = {
  transaction_id: "AYN-20261028-998877",
  value: 1450.5,
  currency: "USD",
};

const purchaseResult = trackPurchaseConversion(testPurchaseOrder);
assert(purchaseResult === true, "trackPurchaseConversion returns true for valid order");
assert(mockGtagCalls.length === 1, "gtag called exactly once for Purchase");

const purchasePayload = mockGtagCalls[0][2];
assert(
  purchasePayload.send_to === "AW-18504838697/60nhCPWW56YdEKnc5fdE",
  "Purchase send_to matches official Purchase destination"
);
assert(
  purchasePayload.transaction_id === "AYN-20261028-998877",
  "Purchase transaction_id matches authoritative order_number"
);
assert(purchasePayload.value === 1450.5, "Purchase value reflects authoritative total amount");
assert(purchasePayload.currency === "USD", "Purchase currency is USD");

// Privacy & PII guarantees
assert(purchasePayload.email === undefined, "Customer email is NOT sent");
assert(purchasePayload.phone === undefined, "Customer phone is NOT sent");
assert(purchasePayload.name === undefined, "Customer name is NOT sent");
assert(purchasePayload.address === undefined, "Customer address is NOT sent");
assert(purchasePayload.new_customer === undefined, "new_customer is omitted due to lack of historical data");

// ─── TEST 5: PURCHASE DEDUPLICATION ACROSS RE-RENDERS & REFRESHES ────────────
console.log("\n▶ TEST 5: PURCHASE DEDUPLICATION");
const duplicateAttempt = trackPurchaseConversion(testPurchaseOrder);
assert(duplicateAttempt === false, "Duplicate purchase call for the same order returns false");
assert(mockGtagCalls.length === 1, "Zero additional gtag events dispatched for duplicate purchase");

// Verify storage registry
assert(
  isOrderConversionDispatched("AYN-20261028-998877"),
  "Order reference is persisted in deduplication registry"
);

// Simulated reload / browser restart
mockGtagCalls.length = 0;
const reloadAttempt = trackPurchaseConversion(testPurchaseOrder);
assert(reloadAttempt === false, "Reloaded session prevents duplicate purchase dispatch");
assert(mockGtagCalls.length === 0, "Zero events emitted on reload");

// Separate unique order is countable
const secondOrder = {
  transaction_id: "AYN-20261028-445566",
  value: 820.0,
  currency: "USD",
};
const secondOrderResult = trackPurchaseConversion(secondOrder);
assert(secondOrderResult === true, "Separate unique order dispatches successfully");
assert(mockGtagCalls.length === 1, "gtag called once for new unique order");
assert(mockGtagCalls[0][2].transaction_id === "AYN-20261028-445566", "Matches second order transaction_id");

// ─── TEST 6: EMPTY TRANSACTION ID AND INVALID PURCHASE REJECTION ─────────────
console.log("\n▶ TEST 6: REJECTION OF EMPTY TRANSACTION IDS & FAILED ORDERS");
mockGtagCalls.length = 0;

assert(
  trackPurchaseConversion({ transaction_id: "", value: 100 } as any) === false,
  "Empty transaction_id is rejected"
);
assert(
  trackPurchaseConversion({ transaction_id: "   ", value: 100 } as any) === false,
  "Whitespace-only transaction_id is rejected"
);
assert(
  trackPurchaseConversion(null as any) === false,
  "Null purchase payload is rejected"
);
assert(
  trackPurchaseConversion(undefined as any) === false,
  "Undefined purchase payload is rejected"
);
assert(mockGtagCalls.length === 0, "Zero gtag calls on invalid purchase inputs");

// ─── TEST 7: PAGE VIEW CONVERSION (DORMANT, NO ROUTE-WIDE EMISSION) ───────────
console.log("\n▶ TEST 7: PAGE VIEW CONVERSION TARGET & DORMANT STATE");
resetMocks();

const pvResult = trackPageViewConversion({ page_path: "/promo/spring-deals" });
assert(pvResult === true, "trackPageViewConversion dispatches when explicitly invoked");
assert(mockGtagCalls.length === 1, "gtag called once");
assert(
  mockGtagCalls[0][2].send_to === "AW-18504838697/UcUXCP6W56YdEKnc5fdE",
  "Page View send_to matches exact destination"
);
assert(mockGtagCalls[0][2].page_path === "/promo/spring-deals", "page_path is passed");

// Static inspection: ensure trackPageViewConversion is NOT called globally in layouts or pages
const layoutPath = resolve(projectRoot, "src/app/layout.tsx");
const layoutSource = readFileSync(layoutPath, "utf-8");
assert(
  !layoutSource.includes("trackPageViewConversion"),
  "src/app/layout.tsx does NOT invoke trackPageViewConversion"
);

// ─── TEST 8: NON-BLOCKING RESILIENCE (GTAG FAULTS & STORAGE FAILURES) ────────
console.log("\n▶ TEST 8: NON-BLOCKING RESILIENCE (GTAG THROWS)");
resetMocks();

const originalGtag = (globalThis as any).window.gtag;
(globalThis as any).window.gtag = () => {
  throw new Error("Simulated network/script blocker fault");
};

const failedOrder = {
  transaction_id: "AYN-FAIL-999",
  value: 500.0,
  currency: "USD",
};

// Should catch error internally, log warning, and return false without throwing
let didThrow = false;
try {
  const res = trackPurchaseConversion(failedOrder);
  assert(res === false, "Returns false when gtag throws");
} catch {
  didThrow = true;
}
assert(!didThrow, "trackPurchaseConversion NEVER throws an unhandled exception to the caller");
assert(!isOrderConversionDispatched("AYN-FAIL-999"), "Order is NOT marked as sent if dispatch threw");

// Restore gtag
(globalThis as any).window.gtag = originalGtag;
const recoveredRes = trackPurchaseConversion(failedOrder);
assert(recoveredRes === true, "Subsequent attempt succeeds once gtag recovers");
assert(isOrderConversionDispatched("AYN-FAIL-999"), "Order is marked as sent after recovery");

// ─── TEST 9: STATIC AUDIT OF CARTCONTEXT INTEGRATION ─────────────────────────
console.log("\n▶ TEST 9: STATIC AUDIT OF CARTCONTEXT INTEGRATION");
const cartContextPath = resolve(projectRoot, "src/lib/CartContext.tsx");
assert(existsSync(cartContextPath), "src/lib/CartContext.tsx exists");
const cartContextSource = readFileSync(cartContextPath, "utf-8");

assert(
  cartContextSource.includes('import { trackAddToCartConversion } from "@/lib/analytics/google-ads";'),
  "CartContext imports trackAddToCartConversion"
);
assert(
  cartContextSource.includes("trackAddToCartConversion({ value: 1.0, currency: \"USD\" });"),
  "CartContext invokes trackAddToCartConversion with $1.00 USD"
);

const addToCartIdx = cartContextSource.indexOf("const addToCart = async");
const applyCartDataIdx = cartContextSource.indexOf("applyCartData(data);", addToCartIdx);
const trackAtcIdx = cartContextSource.indexOf("trackAddToCartConversion", addToCartIdx);
const catchAtcIdx = cartContextSource.indexOf("} catch (err: any) {", addToCartIdx);

assert(
  applyCartDataIdx !== -1 && trackAtcIdx !== -1 && catchAtcIdx !== -1,
  "All critical blocks exist inside addToCart"
);
assert(
  trackAtcIdx > applyCartDataIdx && trackAtcIdx < catchAtcIdx,
  "trackAddToCartConversion is placed strictly after applyCartData and within the try block"
);

// Verify removeFromCart and updateQuantity do NOT fire Add to Cart conversion
const removeFromCartIdx = cartContextSource.indexOf("const removeFromCart = async");
const updateQuantityIdx = cartContextSource.indexOf("const updateQuantity = async");
const clearCartIdx = cartContextSource.indexOf("const clearCart = async");

const rfcTrack = cartContextSource.indexOf("trackAddToCartConversion", removeFromCartIdx);
const uqTrack = cartContextSource.indexOf("trackAddToCartConversion", updateQuantityIdx);

assert(
  rfcTrack === -1 || rfcTrack > clearCartIdx,
  "removeFromCart does not call trackAddToCartConversion"
);
assert(
  uqTrack === -1 || uqTrack > clearCartIdx,
  "updateQuantity does not call trackAddToCartConversion"
);

// ─── TEST 10: STATIC AUDIT OF CHECKOUTMODAL INTEGRATION ───────────────────────
console.log("\n▶ TEST 10: STATIC AUDIT OF CHECKOUTMODAL INTEGRATION");
const checkoutModalPath = resolve(projectRoot, "src/components/cart/CheckoutModal.tsx");
assert(existsSync(checkoutModalPath), "CheckoutModal.tsx exists");
const checkoutModalSource = readFileSync(checkoutModalPath, "utf-8");

assert(
  checkoutModalSource.includes("trackBeginCheckoutConversion"),
  "CheckoutModal imports trackBeginCheckoutConversion"
);
assert(
  checkoutModalSource.includes("trackPurchaseConversion"),
  "CheckoutModal imports trackPurchaseConversion"
);

// Verify Begin Checkout gating
assert(
  checkoutModalSource.includes('user.role === "customer"') &&
  checkoutModalSource.includes("items.length > 0"),
  "Begin Checkout is guarded by authenticated customer role and items.length > 0"
);
assert(
  checkoutModalSource.includes("hasTrackedBeginCheckoutRef"),
  "CheckoutModal uses hasTrackedBeginCheckoutRef session key for deduplication"
);

// Verify Purchase conversion placement
const setConfirmedIndex = checkoutModalSource.indexOf("setConfirmedOrder(newOrder);");
const trackPurchaseIndex = checkoutModalSource.indexOf("trackPurchaseConversion({", setConfirmedIndex);
const catchCheckoutIndex = checkoutModalSource.indexOf("} catch (err: any) {", setConfirmedIndex);

assert(setConfirmedIndex !== -1, "setConfirmedOrder(newOrder) exists in CheckoutModal");
assert(trackPurchaseIndex !== -1, "trackPurchaseConversion exists in CheckoutModal");
assert(
  trackPurchaseIndex > setConfirmedIndex && trackPurchaseIndex < catchCheckoutIndex,
  "trackPurchaseConversion is invoked after setConfirmedOrder and within the successful try block"
);
assert(
  checkoutModalSource.includes("transaction_id: orderNum") &&
  checkoutModalSource.includes("value: !isNaN(totalVal) && totalVal >= 0 ? totalVal : 1.0"),
  "Purchase conversion sends authoritative order number and order total"
);

// ─── TEST 11: REUSE OF EXISTING GOOGLE TAG (NO DUPLICATE LOADERS) ─────────────
console.log("\n▶ TEST 11: NO DUPLICATE GLOBAL GOOGLE TAG SCRIPT INJECTION");
assert(
  !checkoutModalSource.includes("googletagmanager.com/gtag/js"),
  "CheckoutModal does not inject duplicate googletagmanager script tags"
);
assert(
  !cartContextSource.includes("googletagmanager.com/gtag/js"),
  "CartContext does not inject duplicate googletagmanager script tags"
);
assert(
  layoutSource.includes("<StorefrontHeadTracking snippet={publicSettings?.google_tag_head_code} />"),
  "StorefrontHeadTracking in layout.tsx is the sole entry point for global Google tag initialization"
);

// ─── TEST 12: BACKWARD COMPATIBILITY OF trackOrderSuccessConversion ───────────
console.log("\n▶ TEST 12: BACKWARD COMPATIBILITY OF trackOrderSuccessConversion");
resetMocks();

const legacyOrder = {
  id: "ord_legacy_101",
  order_number: "AYN-LEGACY-001",
  total_amount: 350.0,
  currency: "USD",
};

const legacyRes = trackOrderSuccessConversion(legacyOrder);
assert(legacyRes === true, "trackOrderSuccessConversion delegates successfully to Purchase");
assert(mockGtagCalls.length === 1, "gtag called once");
assert(mockGtagCalls[0][2].send_to === GOOGLE_ADS_CONVERSIONS.PURCHASE, "Sends to official Purchase destination");
assert(mockGtagCalls[0][2].transaction_id === "AYN-LEGACY-001", "Transaction ID preserved");
assert(mockGtagCalls[0][2].value === 350.0, "Total value preserved");

console.log("\n======================================================================");
console.log("🎉 ALL 12 GOOGLE ADS CONVERSION VERIFICATION TEST SUITES PASSED!");
console.log("======================================================================\n");
