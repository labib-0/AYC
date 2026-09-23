import { Suspense } from "react";
import TopBanner from "@/components/home/TopBanner";
import ServiceStrip from "@/components/home/ServiceStrip";
import ShopByBrand from "@/components/home/ShopByBrand";
import HotSales from "@/components/home/HotSales";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoryHighlights from "@/components/home/CategoryHighlights";
import Testimonials from "@/components/home/Testimonials";
import BrandTrust from "@/components/home/BrandTrust";

export default function Home() {
  return (
    <div className="flex flex-col gap-5 sm:gap-7 lg:gap-9">
      {/* 1. BANNER */}
      <TopBanner />

      {/* 2. SCROLLING STRIP */}
      <ServiceStrip />

      {/* 3. SHOP BY BRAND */}
      <ShopByBrand />

      {/* 4. HOT SALE */}
      <HotSales />

      {/* 5. FEATURED PRODUCTS */}
      <Suspense fallback={<div className="h-64 bg-background" />}>
        <FeaturedProducts />
      </Suspense>

      {/* 6. AUDIENCE */}
      <CategoryHighlights />

      {/* 7. WHAT OUR CUSTOMERS SAY */}
      <Testimonials />

      {/* 8. CERTIFICATE */}
      <BrandTrust />
    </div>
  );
}
