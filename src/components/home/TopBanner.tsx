"use client";

import { useState, useEffect } from "react";
import { DEFAULT_TOP_BANNER, getTopBannerConfig, TopBannerConfig } from "@/config/banner";

export default function TopBanner() {
  const [banner, setBanner] = useState<TopBannerConfig>(DEFAULT_TOP_BANNER);

  // Synchronize banner with admin-configured data & listen for updates
  useEffect(() => {
    setBanner(getTopBannerConfig());

    const handleDataUpdate = () => {
      setBanner(getTopBannerConfig());
    };

    window.addEventListener("ayaan:data-updated", handleDataUpdate);
    window.addEventListener("storage", handleDataUpdate);

    return () => {
      window.removeEventListener("ayaan:data-updated", handleDataUpdate);
      window.removeEventListener("storage", handleDataUpdate);
    };
  }, []);

  // Smooth scroll directly to the existing Featured Products section
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const featuredSection = document.getElementById("featured");
    if (featuredSection) {
      featuredSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = "featured";
    }
  };

  if (!banner.active) return null;

  return (
    <section
      id="top-banner"
      className="w-full bg-background pt-2.5 sm:pt-3.5 pb-0"
      aria-label="Ayaan Clothing Promotional Banner"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <a
          href={banner.target || "#featured"}
          onClick={handleClick}
          title="Browse Wholesale Collection — Featured Products"
          aria-label={`${banner.title || "Your Wholesale Apparel Sourcing Partner"} - Click to browse featured products`}
          className="group relative block w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-secondary/60 border border-border/70 hover:border-foreground/30 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-300 active:scale-[0.998]"
        >
          {/* Reduced Height (~15-20% slimmer): Thin promotional banner proportions */}
          <div className="relative w-full h-[90px] xs:h-[98px] sm:h-[118px] md:h-[135px] lg:h-[150px] xl:h-[158px] flex items-center">
            
            {/* Background Photographic Image (Natural appearance preserved) */}
            <img
              src={banner.imageUrl}
              alt={banner.altText}
              className="absolute inset-0 w-full h-full object-cover object-center md:object-right transition-transform duration-700 ease-out group-hover:scale-[1.012]"
              loading="eager"
            />

            {/* Subtle Professional Overlay: Preserves plaster photo texture without washing out */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-background/55 via-background/25 to-transparent sm:from-background/45 sm:via-background/15 sm:to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Clean, Minimal B2B Typography */}
            <div className="relative z-10 w-full max-w-xl px-5 sm:px-8 md:px-10 lg:px-12 py-2 sm:py-2.5 flex flex-col justify-center">
              
              {/* Eyebrow / Brand Mark */}
              <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold tracking-[0.2em] text-primary uppercase mb-0.5 sm:mb-1">
                {banner.eyebrow || "AYAAN CLOTHING"}
              </span>

              {/* Main Headline: Confident, professional B2B introduction */}
              <h1 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-[1.375rem] font-display font-extrabold uppercase tracking-tight text-foreground leading-[1.2]">
                {banner.title || "YOUR WHOLESALE APPAREL SOURCING PARTNER"}
              </h1>

              {/* Supporting Text: Quality apparel for retailers, boutiques & bulk buyers */}
              {banner.subtitle && (
                <p className="text-[10px] sm:text-[11px] md:text-xs font-sans text-muted-foreground mt-0.5 hidden xs:block line-clamp-1 leading-snug">
                  {banner.subtitle}
                </p>
              )}

              {/* Compact CTA: Secondary to headline */}
              <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] font-sans font-bold uppercase tracking-wider text-foreground/80 group-hover:text-primary transition-colors mt-1 sm:mt-1.5">
                <span>EXPLORE CATALOG →</span>
              </div>

            </div>

          </div>
        </a>
      </div>
    </section>
  );
}
