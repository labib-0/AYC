/**
 * Google Ads Conversion Tracking Integration
 * AYAAN CLOTHING Storefront Analytics
 *
 * ============================================================================
 * CONVERSION DESTINATIONS & ARCHITECTURAL SPECIFICATION:
 * ============================================================================
 * Account Tag: AW-18504838697
 *
 * Official Event Mappings:
 * 1. Add to Cart:
 *    - Destination: AW-18504838697/UuZvCPuW56YdEKnc5fdE
 *    - Value: 1.00 USD (or item value)
 *    - Choke Point: src/lib/CartContext.tsx inside addToCart() success path
 *
 * 2. Begin Checkout:
 *    - Destination: AW-18504838697/CtjkCPiW56YdEKnc5fdE
 *    - Value: 1.00 USD
 *    - Choke Point: src/components/cart/CheckoutModal.tsx on authenticated customer modal open with items
 *
 * 3. Purchase:
 *    - Destination: AW-18504838697/60nhCPWW56YdEKnc5fdE
 *    - Value: Authoritative newOrder.total_amount (e.g., 1450.00 USD)
 *    - Transaction ID: Authoritative newOrder.order_number (e.g., AYN-20261028-123456)
 *    - Choke Point: src/components/cart/CheckoutModal.tsx immediately after successful createOrder()
 *
 * 4. Page View:
 *    - Destination: AW-18504838697/UcUXCP6W56YdEKnc5fdE
 *    - Status: Dormant (Unresolved target URL). Exposed as typed helper but not called globally.
 *
 * ============================================================================
 * SAFETY & PRIVACY INVARIANTS:
 * ============================================================================
 * 1. Global Tag Reuse:
 *    Reuses existing Google base tag (AW-18504838697) initialized in <head>.
 *    Does NOT inject duplicate global scripts, loaders, or containers.
 *
 * 2. Deduplication:
 *    - Purchase: Deduplicated using unique order_number in sessionStorage + localStorage
 *      and Google Ads transaction_id server deduplication.
 *    - Begin Checkout: Session-scoped ref deduplication in CheckoutModal.
 *    - Add to Cart: Triggered strictly after successful async cart backend response.
 *
 * 3. Privacy & Data Safety:
 *    Zero customer PII (name, email, phone, address), payment details, or item
 *    breakdowns are transmitted to Google.
 *
 * 4. Non-Blocking Execution:
 *    Tracking failures, ad blockers, or storage quota errors never disrupt shopping,
 *    checkout, or order creation.
 */

export const GOOGLE_ADS_ID = "AW-18504838697";

export const GOOGLE_ADS_CONVERSIONS = {
  ADD_TO_CART: `${GOOGLE_ADS_ID}/UuZvCPuW56YdEKnc5fdE`,
  BEGIN_CHECKOUT: `${GOOGLE_ADS_ID}/CtjkCPiW56YdEKnc5fdE`,
  PAGE_VIEW: `${GOOGLE_ADS_ID}/UcUXCP6W56YdEKnc5fdE`,
  PURCHASE: `${GOOGLE_ADS_ID}/60nhCPWW56YdEKnc5fdE`,
  // Legacy lead form conversion retained for backward compatibility
  LEGACY_LEAD_FORM: `${GOOGLE_ADS_ID}/kNbLCMPd86EdEKnc5fdE`,
} as const;

// Backward-compatibility exports
export const GOOGLE_ADS_CONVERSION_ID = GOOGLE_ADS_ID;
export const GOOGLE_ADS_CONVERSION_LABEL = "60nhCPWW56YdEKnc5fdE";
export const GOOGLE_ADS_CONVERSION_SEND_TO = GOOGLE_ADS_CONVERSIONS.PURCHASE;
export const GOOGLE_ADS_LEGACY_LEAD_SEND_TO = GOOGLE_ADS_CONVERSIONS.LEGACY_LEAD_FORM;

export const GOOGLE_ADS_CONVERSION_STORAGE_KEY = "ayc_gads_conversions_dispatched";

export interface OrderConversionPayload {
  id?: string | number | null;
  order_number?: string | null;
  total_amount?: number | string | null;
  currency?: string | null;
}

/**
 * Safely dispatches a Google Ads conversion event via window.gtag and window.dataLayer.
 * Guarantees that tracking errors never throw or disrupt application operations.
 */
function safeGtagEvent(eventName: string, params: Record<string, any>): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    // Initialize or reuse window.dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];

    // Ensure window.gtag helper function exists to queue into dataLayer
    if (typeof (window as any).gtag !== "function") {
      (window as any).gtag = function (...args: any[]) {
        ((window as any).dataLayer as any[]).push(args);
      };
    }

    const gtag = (window as any).gtag;
    gtag("event", eventName, params);
    return true;
  } catch (err) {
    console.warn("[Google Ads] Safe event dispatch failed (non-blocking):", err);
    return false;
  }
}

/**
 * Safely inspects whether an order conversion has already been dispatched.
 */
export function isOrderConversionDispatched(orderReference: string): boolean {
  if (!orderReference || typeof window === "undefined") {
    return false;
  }

  const cleanRef = orderReference.trim();
  if (!cleanRef) return false;

  try {
    const sessionList = sessionStorage.getItem(GOOGLE_ADS_CONVERSION_STORAGE_KEY);
    if (sessionList) {
      const parsed: string[] = JSON.parse(sessionList);
      if (Array.isArray(parsed) && parsed.includes(cleanRef)) {
        return true;
      }
    }
  } catch {
    // Ignore storage parse/access errors
  }

  try {
    const localList = localStorage.getItem(GOOGLE_ADS_CONVERSION_STORAGE_KEY);
    if (localList) {
      const parsed: string[] = JSON.parse(localList);
      if (Array.isArray(parsed) && parsed.includes(cleanRef)) {
        return true;
      }
    }
  } catch {
    // Ignore storage parse/access errors
  }

  return false;
}

/**
 * Safely records that an order conversion was dispatched to prevent duplicates.
 */
export function markOrderConversionDispatched(orderReference: string): void {
  if (!orderReference || typeof window === "undefined") {
    return;
  }

  const cleanRef = orderReference.trim();
  if (!cleanRef) return;

  const updateList = (storage: Storage) => {
    try {
      const raw = storage.getItem(GOOGLE_ADS_CONVERSION_STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(cleanRef)) {
        list.push(cleanRef);
        // Keep storage bounded to recent 100 orders
        if (list.length > 100) {
          list.splice(0, list.length - 100);
        }
        storage.setItem(GOOGLE_ADS_CONVERSION_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {
      // Storage might be disabled or full; silently handle
    }
  };

  try {
    updateList(sessionStorage);
  } catch {
    // Ignore
  }

  try {
    updateList(localStorage);
  } catch {
    // Ignore
  }
}

/**
 * Clears recorded conversion tracking history (intended for test environments).
 */
export function clearDispatchedConversionsForTesting(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(GOOGLE_ADS_CONVERSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    localStorage.removeItem(GOOGLE_ADS_CONVERSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * 1. Add to Cart Conversion
 * Destination: AW-18504838697/UuZvCPuW56YdEKnc5fdE
 * Default value: 1.00 USD
 */
export function trackAddToCartConversion(params?: { value?: number; currency?: string }): boolean {
  const val = params?.value !== undefined && !isNaN(params.value) && params.value >= 0 ? params.value : 1.0;
  const curr = params?.currency || "USD";

  return safeGtagEvent("conversion", {
    send_to: GOOGLE_ADS_CONVERSIONS.ADD_TO_CART,
    value: val,
    currency: curr,
  });
}

/**
 * 2. Begin Checkout Conversion
 * Destination: AW-18504838697/CtjkCPiW56YdEKnc5fdE
 * Default value: 1.00 USD
 */
export function trackBeginCheckoutConversion(params?: { value?: number; currency?: string }): boolean {
  const val = params?.value !== undefined && !isNaN(params.value) && params.value >= 0 ? params.value : 1.0;
  const curr = params?.currency || "USD";

  return safeGtagEvent("conversion", {
    send_to: GOOGLE_ADS_CONVERSIONS.BEGIN_CHECKOUT,
    value: val,
    currency: curr,
  });
}

/**
 * 3. Purchase Conversion
 * Destination: AW-18504838697/60nhCPWW56YdEKnc5fdE
 * Authoritative transaction_id, total order value, and currency.
 * Deduplicated client-side via sessionStorage/localStorage and server-side via transaction_id.
 */
export function trackPurchaseConversion(params: {
  transaction_id: string;
  value: number;
  currency?: string;
}): boolean {
  if (!params || !params.transaction_id) {
    console.warn("[Google Ads] Skipping purchase conversion: Missing transaction_id.");
    return false;
  }

  const cleanTxId = String(params.transaction_id).trim();
  if (!cleanTxId) {
    console.warn("[Google Ads] Skipping purchase conversion: Empty transaction_id.");
    return false;
  }

  // Deduplication check: Do not fire duplicate event for the same order
  if (isOrderConversionDispatched(cleanTxId)) {
    return false;
  }

  const cleanVal = !isNaN(Number(params.value)) && Number(params.value) >= 0 ? Number(params.value) : 1.0;
  const cleanCurrency = params.currency || "USD";

  const success = safeGtagEvent("conversion", {
    send_to: GOOGLE_ADS_CONVERSIONS.PURCHASE,
    transaction_id: cleanTxId,
    value: cleanVal,
    currency: cleanCurrency,
  });

  if (success) {
    markOrderConversionDispatched(cleanTxId);
    return true;
  }

  return false;
}

/**
 * 4. Page View Conversion
 * Destination: AW-18504838697/UcUXCP6W56YdEKnc5fdE
 * Kept DORMANT. Not triggered automatically on route transitions.
 */
export function trackPageViewConversion(params?: {
  page_path?: string;
  value?: number;
  currency?: string;
}): boolean {
  const val = params?.value !== undefined && !isNaN(params.value) && params.value >= 0 ? params.value : 1.0;
  const curr = params?.currency || "USD";

  const payload: Record<string, any> = {
    send_to: GOOGLE_ADS_CONVERSIONS.PAGE_VIEW,
    value: val,
    currency: curr,
  };

  if (params?.page_path) {
    payload.page_path = params.page_path;
  }

  return safeGtagEvent("conversion", payload);
}

/**
 * Canonical Order Success Conversion (Backward-Compatible Wrapper)
 * Dispatches the official Purchase conversion using authoritative order details.
 */
export function trackOrderSuccessConversion(order: OrderConversionPayload | null | undefined): boolean {
  if (!order) {
    return false;
  }

  const rawRef = order.order_number || (order.id !== null && order.id !== undefined ? String(order.id) : "");
  const orderReference = rawRef.trim();

  if (!orderReference) {
    console.warn("[Google Ads] Skipping conversion: Order has no valid reference or identifier.");
    return false;
  }

  const totalAmount = Number((order as any).total_amount);
  const currency = (order as any).currency || "USD";

  return trackPurchaseConversion({
    transaction_id: orderReference,
    value: !isNaN(totalAmount) && totalAmount >= 0 ? totalAmount : 1.0,
    currency,
  });
}
