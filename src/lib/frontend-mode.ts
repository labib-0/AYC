/**
 * Frontend Mode Configuration & State Controller
 *
 * Controls whether the application operates in Frontend-First / Mock Mode
 * or connects to the real local Laravel backend API.
 */

const FRONTEND_ONLY_STORAGE_KEY = "ayaan_frontend_only_mode";

/**
 * Returns whether the application is running in frontend-only architecture.
 * When NEXT_PUBLIC_FRONTEND_ONLY is explicitly set to "false", returns false (real backend mode).
 * If undefined or "true", defaults to frontend-only mode for safety.
 */
export function isFrontendOnly(): boolean {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem(FRONTEND_ONLY_STORAGE_KEY);
    if (override !== null) {
      return override === "true";
    }
  }

  // Environment variable check
  const envVal = process.env.NEXT_PUBLIC_FRONTEND_ONLY;
  if (envVal !== undefined) {
    return envVal === "true" || envVal === "1";
  }

  return true;
}

/**
 * Programmatically toggle or set frontend-only mode in the browser
 */
export function setFrontendOnly(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(FRONTEND_ONLY_STORAGE_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent("ayaan:frontend-mode-changed", { detail: { enabled } }));
  }
}
