import { Suspense } from "react";
import TopBanner from "@/components/home/TopBanner";
import ServiceStrip from "@/components/home/ServiceStrip";
import CategoryHighlights from "@/components/home/CategoryHighlights";
import HotSales from "@/components/home/HotSales";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import ShopByBrand from "@/components/home/ShopByBrand";
import Testimonials from "@/components/home/Testimonials";
import BrandTrust from "@/components/home/BrandTrust";

export default function Home() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-5">
        <TopBanner />
        <ServiceStrip />
        <ShopByBrand />
        <HotSales />
        <Suspense fallback={<div className="h-64 bg-background" />}>
          <FeaturedProducts />
        </Suspense>
        <CategoryHighlights />
      </div>
      <Testimonials />
      <BrandTrust />
    </>
  );
}
