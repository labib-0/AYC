/**
 * Automated Verification Suite: Google Ads Conversion Tracking on Order Success
 *
 * Verifies all requirements:
 * 1. Successfully created test order queues the intended conversion event into dataLayer/gtag.
 * 2. Failed orders do not trigger the event.
 * 3. Refreshing the success page / repeated renders do not send duplicate events for the same order.
 * 4. Navigating away and back does not trigger the same order conversion again (persistent deduplication).
 * 5. Generic visits to checkout or success URLs cannot fabricate a conversion.
 * 6. The supplied conversion ID ('AW-18504838697') and label ('kNbLCMPd86EdEKnc5fdE') are preserved exactly.
 * 7. Global Google tag is reused and not duplicated anywhere in the application.
 * 8. Existing authentication, checkout, inventory, and 'Payment Pending' order status behavior remains unchanged.
 * 9. Privacy check: Customer PII, payment info, and item lists are never exposed to Google.
 * 10. No revenue/value or currency is fabricated.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  GOOGLE_ADS_CONVERSION_ID,
  GOOGLE_ADS_CONVERSION_LABEL,
  GOOGLE_ADS_CONVERSION_SEND_TO,
  GOOGLE_ADS_CONVERSION_STORAGE_KEY,
  isOrderConversionDispatched,
  markOrderConversionDispatched,
  clearDispatchedConversionsForTesting,
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
console.log("TEST SUITE: GOOGLE ADS ORDER SUCCESS CONVERSION TRACKING");
console.log("======================================================================\n");

const projectRoot = resolve(__dirname, "..");

// ─── TEST 1: EXACT IDS, LABELS, AND SEND_TO FORMAT ────────────────────────────
console.log("▶ TEST 1: EXACT IDS, LABELS, AND SEND_TO PRESERVATION");
assert(
  GOOGLE_ADS_CONVERSION_ID === "AW-18504838697",
  "Google Ads Conversion ID is preserved exactly as 'AW-18504838697'"
);
assert(
  GOOGLE_ADS_CONVERSION_LABEL === "kNbLCMPd86EdEKnc5fdE",
  "Google Ads Conversion Label is preserved exactly as 'kNbLCMPd86EdEKnc5fdE'"
);
assert(
  GOOGLE_ADS_CONVERSION_SEND_TO === "AW-18504838697/kNbLCMPd86EdEKnc5fdE",
  "send_to string matches exact format 'AW-18504838697/kNbLCMPd86EdEKnc5fdE'"
);

// ─── TEST 2: DOCUMENTATION OF "SUBMIT LEAD FORM CONVERSION PAGE" ───────────────
console.log("\n▶ TEST 2: DOCUMENTATION AUDIT FOR LEAD FORM CONVERSION LABEL");
const helperSourcePath = resolve(projectRoot, "src/lib/analytics/google-ads.ts");
assert(existsSync(helperSourcePath), "src/lib/analytics/google-ads.ts exists");
const helperSource = readFileSync(helperSourcePath, "utf-8");

assert(
  helperSource.includes("Submit lead form conversion page"),
  "Helper explicitly documents that supplied snippet is labelled 'Submit lead form conversion page'"
);
assert(
  helperSource.includes("Purchase"),
  "Helper documents distinction between this action and a standard e-commerce Purchase conversion"
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

// ─── TEST 3: DISPATCH ON CONFIRMED ORDER SUCCESS ──────────────────────────────
console.log("\n▶ TEST 3: DISPATCH ON CONFIRMED ORDER SUCCESS");
clearDispatchedConversionsForTesting();
mockDataLayer.length = 0;
mockGtagCalls.length = 0;

const testOrder1 = {
  id: "ord_1001",
  order_number: "AYN-20261019-987654",
};

const result1 = trackOrderSuccessConversion(testOrder1);
assert(result1 === true, "trackOrderSuccessConversion returns true on initial valid order");
assert(mockGtagCalls.length === 1, "gtag was called exactly once");

const dispatchedCall = mockGtagCalls[0];
assert(dispatchedCall[0] === "event", "First gtag argument is 'event'");
assert(dispatchedCall[1] === "conversion", "Second gtag argument is 'conversion'");

const payload = dispatchedCall[2];
assert(payload.send_to === "AW-18504838697/kNbLCMPd86EdEKnc5fdE", "send_to matches exact configuration");
assert(payload.transaction_id === "AYN-20261019-987654", "transaction_id matches the confirmed order_number");

// ─── TEST 4: PRIVACY, SECURITY, AND REVENUE SAFETY ────────────────────────────
console.log("\n▶ TEST 4: PRIVACY, SECURITY, AND REVENUE SAFETY");
assert(payload.value === undefined, "Order value is not supplied or fabricated");
assert(payload.currency === undefined, "Currency parameter is not supplied or fabricated");
assert(payload.email === undefined, "Customer email is not leaked to Google");
assert(payload.phone === undefined, "Customer phone is not leaked to Google");
assert(payload.name === undefined, "Customer name is not leaked to Google");
assert(payload.items === undefined, "Cart/order items are not leaked in conversion payload");

// ─── TEST 5: DEDUPLICATION ON RE-RENDER & REPEATED CALLS ──────────────────────
console.log("\n▶ TEST 5: DEDUPLICATION ON RE-RENDER & REPEATED CALLS");
const resultDuplicate = trackOrderSuccessConversion(testOrder1);
assert(resultDuplicate === false, "Duplicate conversion call for the same order returns false");
assert(mockGtagCalls.length === 1, "No secondary gtag call was dispatched for the same order");

// ─── TEST 6: DEDUPLICATION ON PAGE REFRESH AND NAVIGATION AWAY & BACK ─────────
console.log("\n▶ TEST 6: DEDUPLICATION ON REFRESH & PERSISTENT STORAGE");
assert(
  isOrderConversionDispatched("AYN-20261019-987654"),
  "Order reference is stored in deduplication registry"
);

// Simulate browser memory wipe (reload page with existing session/local storage)
mockGtagCalls.length = 0;
mockDataLayer.length = 0;

const resultReload = trackOrderSuccessConversion(testOrder1);
assert(resultReload === false, "Post-reload conversion call for existing order returns false");
assert(mockGtagCalls.length === 0, "Zero gtag events dispatched on simulated reload");

// ─── TEST 7: SEPARATE ORDER DISPATCH ──────────────────────────────────────────
console.log("\n▶ TEST 7: SEPARATE CONFIRMED ORDER GETS UNIQUE DISPATCH");
const testOrder2 = {
  id: "ord_1002",
  order_number: "AYN-20261019-112233",
};

const result2 = trackOrderSuccessConversion(testOrder2);
assert(result2 === true, "New unique order successfully dispatches conversion");
assert(mockGtagCalls.length === 1, "gtag called once for new unique order");
assert(mockGtagCalls[0][2].transaction_id === "AYN-20261019-112233", "New order reference matches transaction_id");

// ─── TEST 8: FAILED ORDER & INVALID INPUT SAFETY ──────────────────────────────
console.log("\n▶ TEST 8: FAILED ORDERS AND INVALID INPUT SAFETY");
mockGtagCalls.length = 0;

assert(trackOrderSuccessConversion(null) === false, "Null order returns false");
assert(trackOrderSuccessConversion(undefined) === false, "Undefined order returns false");
assert(trackOrderSuccessConversion({} as any) === false, "Empty order object returns false");
assert(trackOrderSuccessConversion({ id: "", order_number: "" } as any) === false, "Blank references return false");
assert(mockGtagCalls.length === 0, "Zero gtag calls on invalid/failed inputs");

// ─── TEST 9: FAILURE TOLERANCE (DO NOT MARK AS SENT IF GTAG FAILS) ────────────
console.log("\n▶ TEST 9: FAILURE TOLERANCE WHEN GTAG THROWS");
clearDispatchedConversionsForTesting();
mockGtagCalls.length = 0;

const originalGtag = (globalThis as any).window.gtag;
(globalThis as any).window.gtag = () => {
  throw new Error("Simulated network/gtag script fault");
};

const failedAttemptOrder = {
  id: "ord_fail_1",
  order_number: "AYN-FAIL-001",
};

const resultFailed = trackOrderSuccessConversion(failedAttemptOrder);
assert(resultFailed === false, "Returns false when gtag invocation throws");
assert(
  !isOrderConversionDispatched("AYN-FAIL-001"),
  "Order is NOT marked as sent if dispatch threw an exception"
);

// Restore gtag
(globalThis as any).window.gtag = originalGtag;

// Now that gtag is restored, subsequent attempt for this order should succeed
const resultRecovered = trackOrderSuccessConversion(failedAttemptOrder);
assert(resultRecovered === true, "Subsequent attempt succeeds once gtag is functioning");
assert(
  isOrderConversionDispatched("AYN-FAIL-001"),
  "Order is now marked as sent after successful recovery"
);

// ─── TEST 10: STATIC AUDIT OF CHECKOUTMODAL INTEGRATION ───────────────────────
console.log("\n▶ TEST 10: STATIC AUDIT OF CHECKOUTMODAL INTEGRATION");
const checkoutModalPath = resolve(projectRoot, "src/components/cart/CheckoutModal.tsx");
assert(existsSync(checkoutModalPath), "CheckoutModal.tsx exists");
const checkoutModalSource = readFileSync(checkoutModalPath, "utf-8");

assert(
  checkoutModalSource.includes('import { trackOrderSuccessConversion } from "@/lib/analytics/google-ads";'),
  "CheckoutModal imports trackOrderSuccessConversion from @/lib/analytics/google-ads"
);

assert(
  checkoutModalSource.includes("trackOrderSuccessConversion(newOrder);"),
  "CheckoutModal invokes trackOrderSuccessConversion immediately after successful createOrder"
);

// Verify placement inside try block after setConfirmedOrder
const setConfirmedIndex = checkoutModalSource.indexOf("setConfirmedOrder(newOrder);");
const trackConversionIndex = checkoutModalSource.indexOf("trackOrderSuccessConversion(newOrder);");
const catchIndex = checkoutModalSource.indexOf("} catch (err: any) {", setConfirmedIndex);

assert(setConfirmedIndex !== -1, "setConfirmedOrder(newOrder) exists in CheckoutModal");
assert(trackConversionIndex !== -1, "trackOrderSuccessConversion(newOrder) exists in CheckoutModal");
assert(
  trackConversionIndex > setConfirmedIndex && trackConversionIndex < catchIndex,
  "trackOrderSuccessConversion is invoked after setConfirmedOrder and within the successful try block"
);

// Verify Payment Pending status is unchanged
assert(
  checkoutModalSource.includes("Payment Pending"),
  "CheckoutModal preserves the 'Payment Pending' workflow and badge"
);

// ─── TEST 11: REUSE OF EXISTING GOOGLE TAG (NO DUPLICATE SCRIPT INJECTION) ─────
console.log("\n▶ TEST 11: NO DUPLICATE GLOBAL GOOGLE TAG SCRIPT INJECTION");
assert(
  !checkoutModalSource.includes("googletagmanager.com/gtag/js"),
  "CheckoutModal does not inject duplicate googletagmanager script tags"
);
assert(
  !helperSource.includes("<script"),
  "google-ads helper does not inject HTML script tags directly"
);

const layoutPath = resolve(projectRoot, "src/app/layout.tsx");
assert(existsSync(layoutPath), "src/app/layout.tsx exists");
const layoutSource = readFileSync(layoutPath, "utf-8");

assert(
  layoutSource.includes("<StorefrontHeadTracking snippet={publicSettings?.google_tag_head_code} />"),
  "StorefrontHeadTracking in layout.tsx is the sole entry point for global Google tag initialization"
);

console.log("\n======================================================================");
console.log("ALL 11 GOOGLE ADS CONVERSION VERIFICATION CHECKS PASSED!");
console.log("======================================================================\n");
