/**
 * Safe Redirect Utility for Storefront Navigation
 * Protects against open redirect vulnerabilities and enforces customer boundary isolation.
 */

const BLOCKED_ADMIN_PREFIXES = ["/admin", "/ayc"];

/**
 * Sanitizes a target destination string to ensure it is a safe relative internal route.
 * Rejects external URLs, protocol-relative URLs (//), backslash bypasses (/\ or \\),
 * and disallows administrative routes (/admin, /ayc) for customer flows.
 *
 * @param target Raw redirect string from query parameters or session storage
 * @param fallback Safe default destination (defaults to "/dashboard")
 * @param allowAdmin Whether administrative destination routes are permitted (defaults to false)
 * @returns A safe relative route string
 */
export function sanitizeRedirectUrl(
  target: string | null | undefined,
  fallback = "/dashboard",
  allowAdmin = false
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return fallback;
  }

  // Reject protocol-relative URLs (//evil.com) or backslash variants (/\, \/, \\)
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.startsWith("\\/") ||
    trimmed.startsWith("\\\\") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }

  // Must begin with a single slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Reject URLs containing protocol schemes like http:, https:, javascript:, data:
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.includes(":")) {
    return fallback;
  }

  // Prevent control characters or line break smuggling
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  // Disallow administrative destinations for customer flows
  if (!allowAdmin) {
    const lower = trimmed.toLowerCase();
    for (const prefix of BLOCKED_ADMIN_PREFIXES) {
      if (lower === prefix || lower.startsWith(`${prefix}/`)) {
        return fallback;
      }
    }
  }

  return trimmed;
}
