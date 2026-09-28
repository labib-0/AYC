import { Suspense } from "react";
import TopBanner from "@/components/home/TopBanner";
import ServiceStrip from "@/components/home/ServiceStrip";
import ShopByBrand from "@/components/home/ShopByBrand";
import AudienceSection from "@/components/home/AudienceSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import HotSales from "@/components/home/HotSales";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import BrandTrust from "@/components/home/BrandTrust";

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
