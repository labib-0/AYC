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
  altText: "Ayaan Clothing — Garment Manufacturer & Exporter in Bangladesh",
  eyebrow: "Ayaan Clothing",
  title: "Garment Manufacturer & Exporter in Bangladesh",
  subtitle: "Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.",
  buttonText: "Explore Catalog →",
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
