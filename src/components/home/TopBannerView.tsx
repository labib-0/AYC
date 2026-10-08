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
      aria-label="Ayaan Clothing Promotional Banner"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        <a
          href={banner.target || "#featured"}
          onClick={handleClick}
          title="Browse Wholesale Collection — Featured Products"
          aria-label={`${banner.title || "Your Wholesale Apparel Sourcing Partner"} - Click to browse featured products`}
          className="group relative block w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-secondary/60 border border-border/70 hover:border-foreground/30 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-300 active:scale-[0.998]"
        >
          {/* Reduced Height (~15-20% slimmer): Thin promotional banner proportions */}
          <div className="relative w-full h-[90px] xs:h-[98px] sm:h-[118px] md:h-[135px] lg:h-[150px] xl:h-[158px] flex items-center bg-zinc-950 overflow-hidden">
            {/* Background Photographic Image (Natural appearance preserved) */}
            {imgSrc && !isFailed ? (
              <Image
                src={imgSrc}
                alt={banner.altText || "AYAAN CLOTHING — Your Wholesale Apparel Sourcing Partner"}
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
                className="object-cover object-center md:object-right transition-transform duration-700 ease-out group-hover:scale-[1.012]"
              />
            ) : null}

            {/* Subtle Professional Overlay: Preserves photo texture without washing out */}
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
              <h1 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-[1.375rem] font-display font-extrabold tracking-tight text-foreground leading-[1.2]">
                {banner.title === "YOUR WHOLESALE APPAREL SOURCING PARTNER"
                  ? "Your Wholesale Apparel Sourcing Partner"
                  : banner.title || "Your Wholesale Apparel Sourcing Partner"}
              </h1>

              {/* Supporting Text: Quality apparel for retailers, boutiques & bulk buyers */}
              {banner.subtitle && (
                <p className="text-[10px] sm:text-[11px] md:text-xs font-sans text-muted-foreground mt-0.5 hidden xs:block line-clamp-1 leading-snug">
                  {banner.subtitle}
                </p>
              )}

              {/* Action Prompt */}
              {banner.buttonText && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold text-primary hover:underline mt-1">
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
