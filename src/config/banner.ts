import { mockStore } from "@/lib/mock-data/mock-store";

export interface TopBannerConfig {
  id?: string | number;
  imageUrl: string;
  altText: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  target: string;
  active: boolean;
}

/**
 * Authoritative default configuration for the thin top banner.
 * Designed for B2B wholesale clothing: clean visual, subtle copy, direct anchor to #featured.
 */
export const DEFAULT_TOP_BANNER: TopBannerConfig = {
  id: "top-banner-default",
  imageUrl: "/images/homepage-banner.jpg",
  altText: "AYAAN CLOTHING — Your Wholesale Apparel Sourcing Partner",
  eyebrow: "AYAAN CLOTHING",
  title: "YOUR WHOLESALE APPAREL SOURCING PARTNER",
  subtitle: "Quality apparel for retailers, boutiques and bulk buyers, with dependable sourcing and export-ready support.",
  target: "#featured",
  active: true,
};

/**
 * Retrieves the active top banner configuration.
 * Dynamically resolves admin-configured promotions (type 'top_banner' or 'hero_banner')
 * while gracefully falling back to DEFAULT_TOP_BANNER.
 */
export function getTopBannerConfig(): TopBannerConfig {
  if (typeof window !== "undefined") {
    try {
      const promotions = mockStore.getPromotions();
      const activePromo = promotions.find(
        (p) =>
          (p.type === "top_banner" || p.type === "hero_banner") &&
          p.is_active &&
          Boolean(p.image_url)
      );

      if (activePromo && activePromo.image_url && !activePromo.image_url.includes("ayaan-top-banner")) {
        return {
          id: activePromo.id,
          imageUrl: activePromo.image_url,
          altText: activePromo.title || DEFAULT_TOP_BANNER.altText,
          eyebrow: DEFAULT_TOP_BANNER.eyebrow,
          title: activePromo.title || DEFAULT_TOP_BANNER.title,
          subtitle: activePromo.subtitle || DEFAULT_TOP_BANNER.subtitle,
          target: activePromo.button_target || DEFAULT_TOP_BANNER.target,
          active: activePromo.is_active,
        };
      }
    } catch {
      // Fallback gracefully if mockStore is not ready
    }
  }

  return DEFAULT_TOP_BANNER;
}
