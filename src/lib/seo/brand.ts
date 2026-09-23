import type { Metadata } from "next";
import { SITE_CONFIG, absoluteUrl } from "./config";

/**
 * Generates SEO metadata for Brand Collection pages
 */
export function generateBrandMetadata(brandName: string): Metadata {
  const cleanName = brandName.trim();
  const title = `${cleanName} Wholesale Apparel & Master Copy Sourcing | ${SITE_CONFIG.name}`;
  const description = `Shop authentic export quality ${cleanName} apparel wholesale collections. Ready-made garments sourced and exported from Dhaka, Bangladesh with fast global B2B delivery.`;
  const canonical = absoluteUrl(`/search?brand=${encodeURIComponent(cleanName)}`);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: "website",
      images: [
        {
          url: SITE_CONFIG.ogImage,
          width: 1200,
          height: 630,
          alt: `${cleanName} Garments Wholesale Sourcing — Ayaan Clothing`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_CONFIG.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
