/**
 * AYC Flash Toast / Auth Feedback Notification Utility
 *
 * Provides redirect-persistent flash messages stored in sessionStorage and
 * immediate notification dispatch via CustomEvents.
 * Guarantees single consumption to prevent duplicate toasts across re-renders.
 */

export interface FlashToast {
  id: string;
  type: "success" | "error";
  message: string;
  timestamp: number;
}

export const FLASH_TOAST_STORAGE_KEY = "ayaan_auth_flash_toast";
export const FLASH_TOAST_EVENT_NAME = "ayaan:flash_toast";

/**
 * Stage a flash toast to be displayed on the next page (or current page).
 */
export function setFlashToast(type: "success" | "error", message: string): FlashToast | null {
  if (typeof window === "undefined") return null;

  try {
    const toast: FlashToast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(FLASH_TOAST_STORAGE_KEY, JSON.stringify(toast));

    // Also dispatch immediately for pages that don't reload or unmount
    window.dispatchEvent(
      new CustomEvent<FlashToast>(FLASH_TOAST_EVENT_NAME, { detail: toast })
    );

    return toast;
  } catch {
    return null;
  }
}

/**
 * Retrieve and atomically clear the current flash toast from sessionStorage.
 * Ensures the notification is consumed exactly once.
 */
export function consumeFlashToast(): FlashToast | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY);
    if (!raw) return null;

    // Atomically remove upon consumption
    sessionStorage.removeItem(FLASH_TOAST_STORAGE_KEY);

    const parsed = JSON.parse(raw) as FlashToast;
    if (parsed && typeof parsed.message === "string" && (parsed.type === "success" || parsed.type === "error")) {
      return parsed;
    }
    return null;
  } catch {
    try {
      sessionStorage.removeItem(FLASH_TOAST_STORAGE_KEY);
    } catch {}
    return null;
  }
}

/**
 * Peek at the current flash toast without removing it (useful for inspection/testing).
 */
export function peekFlashToast(): FlashToast | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlashToast;
  } catch {
    return null;
  }
}

/**
 * Clear any pending flash toast.
 */
export function clearFlashToast(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(FLASH_TOAST_STORAGE_KEY);
  } catch {}
}
