"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { DEFAULT_TOP_BANNER, TopBannerConfig } from "@/config/banner";
import { homepageService } from "@/services/homepage.service";

const HERO_BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1760 160'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%2318181b'/%3E%3Crect width='60%25' height='100%25' fill='%2327272a' filter='url(%23b)' opacity='0.7'/%3E%3C/svg%3E";

export interface TopBannerViewProps {
  initialBanner?: TopBannerConfig;
}

export default function TopBannerView({
  initialBanner = DEFAULT_TOP_BANNER,
}: TopBannerViewProps) {
  const [banner, setBanner] = useState<TopBannerConfig>(initialBanner);
  const [imgSrc, setImgSrc] = useState<string>(
    initialBanner.imageUrl || DEFAULT_TOP_BANNER.imageUrl
  );
  const [isFailed, setIsFailed] = useState<boolean>(false);

  // Synchronize banner if initialBanner prop changes (e.g. server re-render)
  useEffect(() => {
    if (initialBanner) {
      setBanner(initialBanner);
      if (initialBanner.imageUrl) {
        setImgSrc(initialBanner.imageUrl);
        setIsFailed(false);
      }
    }
  }, [initialBanner]);

  // Synchronize banner with backend-driven Laravel API & listen for updates
  useEffect(() => {
    let isMounted = true;

    const loadBanner = async () => {
      const data = await homepageService.getStorefrontHomepageData(true);
      if (!isMounted) return;
      if (data?.banner) {
        const config = homepageService.bannerModelToTopBannerConfig(data.banner);
        setBanner(config);
        if (config.imageUrl) {
          setImgSrc(config.imageUrl);
          setIsFailed(false);
        }
      }
    };

    const handleDataUpdate = () => {
      loadBanner();
    };

    window.addEventListener("ayaan:homepage-updated", handleDataUpdate);
    window.addEventListener("ayaan:data-updated", handleDataUpdate);
    window.addEventListener("storage", handleDataUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("ayaan:homepage-updated", handleDataUpdate);
      window.removeEventListener("ayaan:data-updated", handleDataUpdate);
      window.removeEventListener("storage", handleDataUpdate);
    };
  }, []);

  // Handle smooth scroll if anchor, or normal navigation if URL
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = banner.target || "#featured";
    if (target.startsWith("#")) {
      e.preventDefault();
      const targetId = target.replace(/^#/, "");
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.location.hash = targetId;
      }
    }
  };

  if (!banner.active) return null;

  return (
    <section
      id="top-banner"
      className="w-full bg-background pt-2.5 sm:pt-3.5 pb-0"
      aria-label="Ayaan Clothing — Garment Manufacturer & Exporter in Bangladesh"
    >
      <span id="built-for-international-buyers" className="sr-only" aria-hidden="true" />
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        <a
          href={banner.target || "#featured"}
          onClick={handleClick}
          title="Browse Wholesale Collection — Featured Products"
          aria-label={`${banner.title || "Garment Manufacturer & Exporter in Bangladesh"} - Click to browse featured products`}
          className="group relative block w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-secondary/60 border border-border/70 hover:border-foreground/30 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-300 active:scale-[0.998]"
        >
          {/* Responsive Proportional Banner Container: Matches natural 3400/534 ratio on mobile, fixed desktop heights */}
          <div className="relative w-full aspect-[3400/534] sm:aspect-auto sm:h-[118px] md:h-[135px] lg:h-[150px] xl:h-[158px] flex items-center bg-[#ecdccb] dark:bg-zinc-950 overflow-hidden">
            {/* Background Photographic Image (Proportional contain on mobile, cover on desktop) */}
            {imgSrc && !isFailed ? (
              <Image
                src={imgSrc}
                alt={banner.altText || "Ayaan Clothing — Garment Manufacturer & Exporter in Bangladesh"}
                fill
                preload={true}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1760px"
                placeholder="blur"
                blurDataURL={HERO_BLUR_DATA_URL}
                onError={() => {
                  if (imgSrc !== DEFAULT_TOP_BANNER.imageUrl) {
                    setImgSrc(DEFAULT_TOP_BANNER.imageUrl);
                  } else {
                    setIsFailed(true);
                  }
                }}
                className="object-contain sm:object-cover object-center md:object-right transition-transform duration-700 ease-out group-hover:scale-[1.012]"
              />
            ) : null}

            {/* Subtle Professional Overlay: Preserves photo texture on desktop without washing out */}
            <div
              className="hidden sm:block absolute inset-0 bg-gradient-to-r from-background/55 via-background/25 to-transparent sm:from-background/45 sm:via-background/15 sm:to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Accessible SEO Heading for Mobile & Full Typography for Desktop */}
            <div className="relative z-10 w-full max-w-xl px-5 sm:px-8 md:px-10 lg:px-12 py-2 sm:py-2.5 flex flex-col justify-center">
              {/* Eyebrow / Brand Mark */}
              <span className="hidden sm:inline-block text-[9.5px] sm:text-[10.5px] font-mono font-bold tracking-[0.2em] text-primary uppercase mb-0.5 sm:mb-1">
                {banner.eyebrow || "Ayaan Clothing"}
              </span>

              {/* Main Headline: Confident, professional B2B introduction */}
              <h1 className="sr-only sm:not-sr-only sm:text-base md:text-lg lg:text-xl xl:text-[1.375rem] font-display font-extrabold tracking-tight text-foreground leading-[1.2]">
                {banner.title === "YOUR WHOLESALE APPAREL SOURCING PARTNER" || banner.title === "Your Wholesale Apparel Sourcing Partner"
                  ? "Garment Manufacturer & Exporter in Bangladesh"
                  : banner.title || "Garment Manufacturer & Exporter in Bangladesh"}
              </h1>

              {/* Supporting Text */}
              {banner.subtitle && (
                <p className="text-[10px] sm:text-[11px] md:text-xs font-sans text-muted-foreground mt-0.5 hidden sm:block line-clamp-1 leading-snug">
                  {banner.subtitle}
                </p>
              )}

              {/* Action Prompt */}
              {banner.buttonText && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold text-primary hover:underline mt-1">
                  <span>{banner.buttonText.replace(/^EXPLORE CATALOG/i, "Explore Catalog")}</span>
                </span>
              )}
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
