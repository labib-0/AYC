/**
 * Frontend Architecture Controller
 *
 * Ayaan Clothing is a standalone frontend-only Next.js application.
 */

/**
 * Returns whether the application is running in frontend-only architecture.
 * Always returns true.
 */
export function isFrontendOnly(): boolean {
  return true;
}

/**
 * Retained for backwards compatibility as a no-op.
 */
export function setFrontendOnly(_enabled: boolean): void {
  // No-op: application is permanently frontend-only
}
