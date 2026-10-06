/**
 * Core SEO Configuration for Ayaan Clothing
 * B2B Wholesale Apparel Manufacturer & Exporter
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ayaan-clothing.vercel.app";

export const SITE_CONFIG = {
  name: "AYAAN CLOTHING",
  legalName: "AYAAN CLOTHING",
  brandMark: "AYN",
  tagline: "Ready-made Garments Manufacturer & Exporter",
  description:
    "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel, bulk fashion export, and custom OEM manufacturing for international buyers. Est. 2010.",
  url: SITE_URL,
  ogImage: `${SITE_URL}/og-image.jpg`,
  locale: "en_US",
  currency: "USD",
  foundingDate: "2010",
  address: {
    streetAddress: "House #33 (2nd floor), Road #12, Sector #11",
    addressLocality: "Uttara, Dhaka",
    postalCode: "1230",
    addressCountry: "BD",
    countryName: "Bangladesh",
  },
  contact: {
    email: "info@ayaanclothing.com",
    phone: "+880 1842-786000",
    whatsApp: "+880 1982-183886",
  },
  social: {
    facebook: "https://facebook.com",
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
  },
  exportMarkets: [
    "European Union",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Japan",
    "Middle East",
  ],
} as const;

export const CANONICAL_DOMAIN = "https://ayaanclothing.com";

/**
 * Resolves the canonical base origin ensuring localhost or dev environments
 * never leak into search engine canonical tags (STF-010).
 */
export function getCanonicalBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }
  return CANONICAL_DOMAIN;
}

/**
 * Resolves a strict canonical URL stripped of query parameters and fragment hashes.
 */
export function canonicalUrl(path: string): string {
  const baseUrl = getCanonicalBaseUrl();
  const cleanPath = path.split("?")[0].split("#")[0].replace(/^\/?/, "/");
  return `${baseUrl}${cleanPath}`;
}

/**
 * Clean absolute URL resolver
 */
export function absoluteUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}
