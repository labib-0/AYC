import type { Metadata } from "next";
import { SITE_CONFIG, absoluteUrl } from "./config";

/**
 * Generates SEO metadata for Category Catalog pages
 */
export function generateCategoryMetadata(categoryName: string): Metadata {
  const cleanName = categoryName.trim();
  const title = `${cleanName} Wholesale Apparel & Bulk Sourcing | ${SITE_CONFIG.name}`;
  const description = `Explore direct manufacturer export wholesale ${cleanName} from Bangladesh. Premium quality fabrics, factory-direct wholesale pricing, and international bulk order fulfillment by Ayaan Clothing.`;
  const canonical = absoluteUrl(`/search?category=${encodeURIComponent(cleanName)}`);

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
          alt: `${cleanName} Wholesale Apparel Collection — Ayaan Clothing`,
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
