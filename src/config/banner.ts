import { mockStore } from "@/lib/mock-data/mock-store";

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
 * Retrieves the active top banner configuration.
 * Dynamically resolves admin-configured promotions (type 'top_banner' or 'hero_banner')
 * while gracefully falling back to DEFAULT_TOP_BANNER.
 */
export function getTopBannerConfig(): TopBannerConfig {
  try {
    const promotions = mockStore.getPromotions();
    const bannerPromo = promotions.find(
      (p) => p.type === "top_banner" || p.type === "hero_banner"
    );

    if (bannerPromo) {
      if (!bannerPromo.is_active) {
        return {
          id: bannerPromo.id,
          imageUrl: bannerPromo.image_url || DEFAULT_TOP_BANNER.imageUrl,
          altText: bannerPromo.title || DEFAULT_TOP_BANNER.altText,
          eyebrow: DEFAULT_TOP_BANNER.eyebrow,
          title: bannerPromo.title || DEFAULT_TOP_BANNER.title,
          subtitle: bannerPromo.subtitle !== undefined ? bannerPromo.subtitle : DEFAULT_TOP_BANNER.subtitle,
          buttonText: bannerPromo.button_text || DEFAULT_TOP_BANNER.buttonText,
          target: bannerPromo.button_target || DEFAULT_TOP_BANNER.target,
          active: false,
        };
      }

      if (bannerPromo.image_url) {
        return {
          id: bannerPromo.id,
          imageUrl: bannerPromo.image_url,
          altText: bannerPromo.title || DEFAULT_TOP_BANNER.altText,
          eyebrow: DEFAULT_TOP_BANNER.eyebrow,
          title: bannerPromo.title || DEFAULT_TOP_BANNER.title,
          subtitle: bannerPromo.subtitle !== undefined ? bannerPromo.subtitle : DEFAULT_TOP_BANNER.subtitle,
          buttonText: bannerPromo.button_text || DEFAULT_TOP_BANNER.buttonText,
          target: bannerPromo.button_target || DEFAULT_TOP_BANNER.target,
          active: true,
        };
      }
    }
  } catch {
    // Fallback gracefully if mockStore is not ready
  }

  return DEFAULT_TOP_BANNER;
}
