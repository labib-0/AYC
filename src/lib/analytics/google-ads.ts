/**
 * Google Ads Conversion Tracking Integration
 * AYAAN CLOTHING Storefront Analytics
 *
 * ============================================================================
 * IMPORTANT AUDIT & CLASSIFICATION NOTICE:
 * ============================================================================
 * The supplied Google Ads snippet configuration:
 *   - Conversion ID: AW-18504838697
 *   - Conversion Label: kNbLCMPd86EdEKnc5fdE
 *
 * In the Google Ads dashboard, this action is configured and labelled as:
 *   "Submit lead form conversion page"
 *
 * It is NOT currently configured as a native e-commerce "Purchase" conversion.
 * Although AYC triggers this event upon genuine backend order creation
 * (the canonical order placement state), it is critical that this is not
 * silently represented as an e-commerce Purchase conversion action.
 * If the business intends to track e-commerce purchases with revenue and
 * currency metrics, a dedicated "Purchase" conversion action must be created
 * in Google Ads and its corresponding conversion ID and label supplied.
 *
 * ============================================================================
 * ARCHITECTURAL CONSTRAINTS & BEHAVIOR:
 * ============================================================================
 * 1. Global Tag Reuse:
 *    Reuses the existing Google tag (AW-18504838697) initialized in <head> via
 *    admin-managed settings. Does NOT inject duplicate global scripts or containers.
 *
 * 2. Deduplication:
 *    - Client-side: Order references are stored in sessionStorage and localStorage
 *      to prevent duplicate events on React re-renders, back/forward navigation,
 *      or page refreshes.
 *    - Google Ads Server-side: Passes Google's official `transaction_id` parameter
 *      matching the unique confirmed order reference (e.g., "AYN-20261019-123456").
 *
 * 3. Privacy & Data Safety:
 *    Zero customer PII (name, email, phone, address), payment details, or item
 *    breakdowns are transmitted to Google.
 *
 * 4. Value / Revenue:
 *    No order value or currency parameters are sent because none were supplied.
 *    No revenue values are invented or estimated.
 *
 * 5. Failure Safety:
 *    If event dispatch fails or cannot be queued, the order is NOT marked as sent,
 *    allowing subsequent valid attempts.
 */

export const GOOGLE_ADS_CONVERSION_ID = "AW-18504838697";
export const GOOGLE_ADS_CONVERSION_LABEL = "kNbLCMPd86EdEKnc5fdE";
export const GOOGLE_ADS_CONVERSION_SEND_TO = `${GOOGLE_ADS_CONVERSION_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`;

export const GOOGLE_ADS_CONVERSION_STORAGE_KEY = "ayc_gads_conversions_dispatched";

export interface OrderConversionPayload {
  id?: string | number | null;
  order_number?: string | null;
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
 * Triggers Google Ads Conversion Event on Genuine Order Placement.
 *
 * @param order Order object containing confirmed order_number and/or id
 * @returns boolean `true` if event was successfully dispatched or queued; `false` if skipped or failed
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

  // Deduplication check: Do not fire duplicate event for the same order
  if (isOrderConversionDispatched(orderReference)) {
    return false;
  }

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

    // Dispatch conversion event with transaction_id for server-side deduplication
    gtag("event", "conversion", {
      send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
      transaction_id: orderReference,
    });

    // Mark as dispatched ONLY after successful execution without error
    markOrderConversionDispatched(orderReference);
    return true;
  } catch (err) {
    console.error("[Google Ads] Failed to dispatch order conversion event:", err);
    // Do not mark as sent if dispatch failed
    return false;
  }
}
