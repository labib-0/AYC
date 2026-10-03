/**
 * Canonical URL & Domain Configuration Module
 * Ayaan Clothing Architecture
 *
 * Centralizes resolution of Customer and Admin origins for:
 * - Cross-environment navigation
 * - Host isolation
 * - Vercel multi-project deployments
 */

export const DEFAULT_CUSTOMER_APP_URL = "https://ayaanclothing.com";
export const DEFAULT_ADMIN_APP_URL = "https://ayaanclothing.com/ayc";

/**
 * Resolves the absolute URL for the public customer storefront.
 */
export function getCustomerAppUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CUSTOMER_APP_URL) {
    return process.env.NEXT_PUBLIC_CUSTOMER_APP_URL.replace(/\/$/, "");
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    // If on admin port 3001 in local development, point to customer port 3000
    if (port === "3001") {
      return `${protocol}//${hostname}:3000`;
    }
    // If on admin subdomain e.g. admin.ayaanclothing.com, point to apex
    if (hostname.startsWith("admin.")) {
      const apex = hostname.replace(/^admin\./, "");
      return `${protocol}//${apex}${port ? `:${port}` : ""}`;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }
  return DEFAULT_CUSTOMER_APP_URL;
}

/**
 * Resolves the absolute URL for the private admin management portal.
 */
export function getAdminAppUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_APP_URL) {
    let url = process.env.NEXT_PUBLIC_ADMIN_APP_URL.replace(/\/$/, "");
    if (!url.endsWith("/ayc") && !url.includes("/ayc/")) {
      url = `${url}/ayc`;
    }
    return url;
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    // If on customer port 3000 in local development, point to admin port 3001
    if (port === "3000") {
      return `${protocol}//${hostname}:3001/ayc`;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ""}/ayc`;
  }
  return DEFAULT_ADMIN_APP_URL;
}
