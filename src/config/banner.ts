export interface TopBannerConfig {
  id?: string | number;
  imageUrl: string;
  altText: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  target: string;
  active: boolean;
}

/**
 * Authoritative default configuration for the thin top banner.
 * Designed for B2B wholesale clothing: clean visual, subtle copy, direct anchor to #featured.
 * Decoupled from legacy Promotion entities.
 */
export const DEFAULT_TOP_BANNER: TopBannerConfig = {
  id: "top-banner-default",
  imageUrl: "/images/homepage-banner.jpg",
  altText: "AYAAN CLOTHING — Your Wholesale Apparel Sourcing Partner",
  eyebrow: "AYAAN CLOTHING",
  title: "YOUR WHOLESALE APPAREL SOURCING PARTNER",
  subtitle: "Quality apparel for retailers, boutiques and bulk buyers, with dependable sourcing and export-ready support.",
  buttonText: "EXPLORE CATALOG →",
  target: "#featured",
  active: true,
};

/**
 * Retrieves the authoritative top banner configuration.
 * Independent and decoupled from legacy promotion entities.
 */
export function getTopBannerConfig(): TopBannerConfig {
  return { ...DEFAULT_TOP_BANNER };
}
