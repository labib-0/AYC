"use client";

import { useEffect, useRef } from "react";

export interface HeadlineItem {
  id: string;
  lead: string;
  detail: string;
}

/**
 * Authoritative 8 B2B headline items preserving core trust/service values.
 */
export const TICKER_HEADLINES: HeadlineItem[] = [
  {
    id: "headline-1",
    lead: "AYAAN CLOTHING",
    detail: "WHOLESALE APPAREL SELLER",
  },
  {
    id: "headline-2",
    lead: "VERIFIED STOCK",
    detail: "AUDITED AVAILABILITY",
  },
  {
    id: "headline-3",
    lead: "FACTORY DIRECT",
    detail: "DIRECT MANUFACTURER SOURCING",
  },
  {
    id: "headline-4",
    lead: "EXPORT READY",
    detail: "EXPORT-STANDARD PACKING",
  },
  {
    id: "headline-5",
    lead: "GLOBAL SHIPPING",
    detail: "AIR & SEA WORLDWIDE",
  },
  {
    id: "headline-6",
    lead: "BULK ORDER SUPPORT",
    detail: "BUILT FOR WHOLESALE BUYERS",
  },
  {
    id: "headline-7",
    lead: "QUALITY APPAREL",
    detail: "FOR RETAILERS & BOUTIQUES",
  },
  {
    id: "headline-8",
    lead: "BUSINESS SOURCING",
    detail: "WHOLESALE APPAREL FOR YOUR BUSINESS",
  },
];

export default function ServiceStrip() {
  const sectionRef = useRef<HTMLElement>(null);

  // Preserve anchor event listener compatibility
  useEffect(() => {
    const handleExpandAboutUs = () => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("expand-about-us", handleExpandAboutUs);
    return () => window.removeEventListener("expand-about-us", handleExpandAboutUs);
  }, []);

  return (
    <section
      id="built-for-international-buyers"
      ref={sectionRef}
      className="w-full bg-background pt-0 pb-0.5 select-none"
      aria-label="Ayaan Clothing Business & Wholesale Headlines"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* TV News Headline Strip (Thin, flat bar with subtle borders) */}
        <div className="relative w-full h-8 sm:h-8.5 overflow-hidden border-y border-border/50 bg-secondary/15 dark:bg-card/25 flex items-center">
          
          {/* Subtle edge fades (kept narrow so initial text is never clipped or obscured) */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-r from-background to-transparent z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-6 bg-gradient-to-l from-background to-transparent z-10"
            aria-hidden="true"
          />

          {/* Continuous Right-to-Left Ticker Track (Duplicated 8 items for seamless 0% -> -50% loop) */}
          <div
            className="animate-ticker-marquee items-center"
            role="marquee"
            aria-live="off"
          >
            {/* Set 1 of 8 Headlines: Bold Title + Lighter Subtitle + Orange Dot */}
            <div className="flex items-center shrink-0 pl-3 sm:pl-4">
              {TICKER_HEADLINES.map((item) => (
                <div
                  key={`set1-${item.id}`}
                  className="inline-flex items-center whitespace-nowrap shrink-0"
                >
                  <div className="inline-flex items-center">
                    {/* BOLD TITLE */}
                    <span className="font-display font-bold tracking-tight text-foreground text-[11px] sm:text-xs uppercase">
                      {item.lead}
                    </span>
                    {/* EM-DASH */}
                    <span className="text-muted-foreground/45 font-normal text-[11px] sm:text-xs mx-1">
                      —
                    </span>
                    {/* LIGHTER SUBTITLE */}
                    <span className="font-sans font-normal text-muted-foreground tracking-normal text-[10px] sm:text-[11px] uppercase">
                      {item.detail}
                    </span>
                  </div>

                  {/* Elegant Orange Bullet Separator */}
                  <span
                    className="mx-3.5 sm:mx-5 text-[#EA580C] font-sans text-xs select-none shrink-0"
                    aria-hidden="true"
                  >
                    •
                  </span>
                </div>
              ))}
            </div>

            {/* Set 2 of 8 Headlines (Identical duplicate for seamless marquee illusion) */}
            <div className="flex items-center shrink-0 pl-3 sm:pl-4" aria-hidden="true">
              {TICKER_HEADLINES.map((item) => (
                <div
                  key={`set2-${item.id}`}
                  className="inline-flex items-center whitespace-nowrap shrink-0"
                >
                  <div className="inline-flex items-center">
                    {/* BOLD TITLE */}
                    <span className="font-display font-bold tracking-tight text-foreground text-[11px] sm:text-xs uppercase">
                      {item.lead}
                    </span>
                    {/* EM-DASH */}
                    <span className="text-muted-foreground/45 font-normal text-[11px] sm:text-xs mx-1">
                      —
                    </span>
                    {/* LIGHTER SUBTITLE */}
                    <span className="font-sans font-normal text-muted-foreground tracking-normal text-[10px] sm:text-[11px] uppercase">
                      {item.detail}
                    </span>
                  </div>

                  {/* Elegant Orange Bullet Separator */}
                  <span
                    className="mx-3.5 sm:mx-5 text-[#EA580C] font-sans text-xs select-none shrink-0"
                    aria-hidden="true"
                  >
                    •
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
