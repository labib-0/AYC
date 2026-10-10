import type { Metadata } from "next";
import { Suspense } from "react";
import TopBanner from "@/components/home/TopBanner";
import ServiceStrip from "@/components/home/ServiceStrip";
import ShopByBrand from "@/components/home/ShopByBrand";
import AudienceSection from "@/components/home/AudienceSection";
import DesignTypeSection from "@/components/home/DesignTypeSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import HotSales from "@/components/home/HotSales";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import BrandTrust from "@/components/home/BrandTrust";
import { siteSettingsService } from "@/services/site-settings.service";
import { CANONICAL_DOMAIN, SITE_CONFIG } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let googleVerification: string | null = null;
  try {
    const settings = await siteSettingsService.getPublicSettings(true);
    googleVerification = settings.google_search_console_verification || null;
  } catch (err) {
    console.warn("Notice: Homepage metadata fetch failed, using fallback:", err);
  }

  const cleanToken = googleVerification ? googleVerification.trim() : null;

  return {
    title: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
    description:
      "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel, bulk fashion export, and custom OEM manufacturing for international buyers. Est. 2010.",
    alternates: {
      canonical: CANONICAL_DOMAIN,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: CANONICAL_DOMAIN,
      siteName: SITE_CONFIG.name,
      title: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
      description:
        "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel for international buyers.",
      images: [
        {
          url: `${CANONICAL_DOMAIN}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
      description:
        "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel for international buyers.",
      images: [`${CANONICAL_DOMAIN}/og-image.jpg`],
    },
    ...(cleanToken ? { verification: { google: cleanToken } } : {}),
  };
}

export default function Home() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      {/* 1. BANNER */}
      <TopBanner />

      {/* 2. SCROLLING STRIP */}
      <ServiceStrip />

      {/* 3. SHOP BY BRAND */}
      <ShopByBrand />

      {/* 4. AUDIENCE */}
      <AudienceSection />

      {/* 4.5. DESIGN TYPE */}
      <DesignTypeSection />

      {/* 5. CATEGORIES */}
      <CategoriesSection />

      {/* 6. HOT SALE */}
      <HotSales />

      {/* 7. FEATURED PRODUCTS */}
      <Suspense fallback={<div className="h-64 bg-background" />}>
        <FeaturedProducts />
      </Suspense>

      {/* 8. CERTIFICATE & TRUST */}
      <BrandTrust />
    </div>
  );
}
