/**
 * Centralized Product URL and Customer-Facing Deep Link Generator
 *
 * Authoritative single source of truth for:
 * - Canonical storefront product URLs (/products/[slug])
 * - WhatsApp product inquiry messages with direct public product links
 * - Product sharing and deep links
 *
 * Rules:
 * - NEVER use admin URLs (/admin/products/..., edit routes, API routes)
 * - NEVER use internal database numeric IDs as the public URL unless slug is unavailable
 * - Always URL-encode WhatsApp messages safely
 */

import { BUSINESS_PROFILE, getStorefrontBaseUrl, getWhatsAppUrl } from "@/config/business-profile";

export interface ProductUrlTarget {
  name?: string;
  slug?: string;
  sku?: string;
  id?: string | number;
}

/**
 * Normalizes a product target into a clean, public customer-facing relative path.
 * Canonical route: /products/[slug]
 */
export function getProductPath(productOrSlug: ProductUrlTarget | string): string {
  if (typeof productOrSlug === "string") {
    const raw = productOrSlug.trim();
    if (!raw) return "/products";
    if (raw.startsWith("/products/")) return raw;
    if (raw.startsWith("/")) return `/products${raw}`;
    return `/products/${encodeURIComponent(raw)}`;
  }

  const slug = productOrSlug.slug?.trim() || String(productOrSlug.id || "").trim();
  if (!slug) return "/products";
  return `/products/${encodeURIComponent(slug)}`;
}

/**
 * Returns the fully qualified public canonical URL for a storefront product.
 * Example: https://ayaanclothing.com/products/ladies-embroidered-mesh-brief
 */
export function getProductCanonicalUrl(productOrSlug: ProductUrlTarget | string): string {
  const baseUrl = getStorefrontBaseUrl();
  const path = getProductPath(productOrSlug);
  return `${baseUrl}${path}`;
}

/**
 * Builds the standardized customer/admin WhatsApp product inquiry text.
 * Structure:
 *
 * Hello AYAAN CLOTHING,
 *
 * I am interested in:
 * Product: [Name]
 * SKU: [SKU]
 * Quantity: [Qty] pcs (if provided)
 * Product Link: [Canonical URL]
 */
export function getProductWhatsAppMessage(
  product: { name: string; sku?: string; slug?: string; id?: string | number },
  quantity?: number
): string {
  const canonicalUrl = getProductCanonicalUrl(product);
  const skuText = product.sku?.trim() ? product.sku.trim() : "—";

  const lines = [
    `Hello ${BUSINESS_PROFILE.name},`,
    "",
    "I am interested in:",
    `Product: ${product.name.trim()}`,
    `SKU: ${skuText}`,
  ];

  if (quantity !== undefined && quantity > 0) {
    lines.push(`Quantity: ${quantity} pcs`);
  }

  lines.push(`Product Link: ${canonicalUrl}`);

  return lines.join("\n");
}

/**
 * Generates the full wa.me link with safely URL-encoded product inquiry message.
 */
export function getProductWhatsAppUrl(
  product: { name: string; sku?: string; slug?: string; id?: string | number },
  quantity?: number
): string {
  const message = getProductWhatsAppMessage(product, quantity);
  return getWhatsAppUrl(message);
}
