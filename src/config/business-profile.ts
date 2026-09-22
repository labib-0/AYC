/**
 * Central Business Profile Configuration
 * 
 * Authoritative source of truth for all customer-facing branding,
 * company information, exporter details, addresses, and metadata.
 * 
 * Sourced directly from official business identity:
 * - Business Name: AYAAN CLOTHING
 * - Business Type: Ready-made Garments Manufacturer & Exporter
 * - Address: House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh
 * - Postal Code: 1230
 * - Established: 2010
 * - Official Brand Mark: AYC
 */

export interface BusinessAddress {
  line1: string;
  line2: string;
  area: string;
  city: string;
  postalCode: string;
  country: string;
  countryCode: string;
  formatted: string;
}

export interface BusinessProfile {
  name: string;
  brandMark: string;
  description: string;
  shortDescription: string;
  establishedYear: number;
  address: BusinessAddress;
  brandColors: {
    orange: string;
    orangeClass: string;
  };
  contact: {
    // Configurable fields - null if not officially confirmed
    email: string | null;
    phone: string | null;
    whatsappNumber: string;
    whatsappUrl: string;
    website: string;
  };
  banking: {
    isConfigured: boolean;
    beneficiaryName: string;
    accountTitle: string;
    bankName: string | null;
    accountNumber: string | null;
    accountNo: string | null;
    swiftCode: string | null;
    bankAddress: string | null;
    branch: string | null;
    routingNumber: string | null;
  };
  legal: {
    registrationNumber: string | null;
    tin: string | null;
    bin: string | null;
    vatNumber: string | null;
    bgmeaNumber: string | null;
  };
}

export const WHATSAPP_BUSINESS_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801826304930";
export const WHATSAPP_BUSINESS_URL = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER.replace(/[^0-9]/g, "")}`;

/**
 * Helper to generate a standardized wa.me URL for the official business contact
 * with optional safely URL-encoded prefilled text.
 */
export function getWhatsAppUrl(prefilledText?: string): string {
  const cleanNumber = WHATSAPP_BUSINESS_NUMBER.replace(/[^0-9]/g, "");
  if (!prefilledText) {
    return `https://wa.me/${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(prefilledText)}`;
}

/**
 * Resolves the storefront public base URL for commercial deep links.
 * Works across local development (localhost:3000), Vercel deployments,
 * and optional environment variable overrides.
 */
export function getStorefrontBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL) {
    return process.env.NEXT_PUBLIC_CUSTOMER_APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

/**
 * Generates the universal commercial-order deep link for an order reference.
 * Example: https://demo-domain.com/order-access/AYN-20260922-697987
 */
export function getOrderAccessDeepLink(orderReference: string): string {
  const baseUrl = getStorefrontBaseUrl();
  const cleanRef = String(orderReference).trim().replace(/^#/, "");
  return `${baseUrl}/order-access/${encodeURIComponent(cleanRef)}`;
}

/**
 * Generates the prefilled WhatsApp commercial order message with deep link.
 */
export function getCommercialOrderWhatsAppMessage(order: {
  order_number: string;
  total_amount: number;
  shipping_company?: string | null;
  shipping_name?: string | null;
  shipping_city?: string | null;
  shipping_country_code?: string | null;
}): string {
  const deepLink = getOrderAccessDeepLink(order.order_number);
  const consignee = order.shipping_company || order.shipping_name || "Valued Consignee";
  const destination = [order.shipping_city, order.shipping_country_code].filter(Boolean).join(", ") || "—";
  const totalFormatted = `$${Number(order.total_amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;

  return [
    "Hello AYAAN CLOTHING,",
    "",
    `I have confirmed Commercial Order #${order.order_number}.`,
    "",
    `Total: ${totalFormatted}`,
    `Consignee: ${consignee}`,
    `Destination: ${destination}`,
    "",
    "Please advise on next steps.",
    "",
    "View Commercial Order:",
    deepLink,
  ].join("\n");
}

export const BUSINESS_PROFILE: BusinessProfile = {
  name: "AYAAN CLOTHING",
  brandMark: "AYC",
  description: "Ready-made Garments Manufacturer & Exporter",
  shortDescription: "Ready-made Garments Manufacturer & Exporter",
  establishedYear: 2010,
  address: {
    line1: "House #33 (2nd floor)",
    line2: "Road #12, Sector #11",
    area: "Uttara",
    city: "Dhaka",
    postalCode: "1230",
    country: "Bangladesh",
    countryCode: "BD",
    formatted: "House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh",
  },
  brandColors: {
    orange: "#EA580C",
    orangeClass: "text-[#EA580C]",
  },
  contact: {
    email: null,
    phone: null,
    whatsappNumber: WHATSAPP_BUSINESS_NUMBER,
    whatsappUrl: WHATSAPP_BUSINESS_URL,
    website: "www.ayaanclothing.com",
  },
  banking: {
    isConfigured: true,
    beneficiaryName: "M/S AYAAN  CLOTHING",
    accountTitle: "M/S AYAAN  CLOTHING",
    bankName: "Pubali Bank Limited",
    accountNumber: "1788-901-044316",
    accountNo: "1788-901-044316",
    swiftCode: "PUBABDDH210",
    bankAddress: "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh",
    branch: "Nawabpur Road Branch",
    routingNumber: null,
  },
  legal: {
    registrationNumber: null,
    tin: null,
    bin: null,
    vatNumber: null,
    bgmeaNumber: null,
  },
};

export default BUSINESS_PROFILE;
