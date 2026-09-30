"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { homepageService, HomepageTickerItem } from "@/services/homepage.service";

export default function ServiceStrip() {
  const [tickerItems, setTickerItems] = useState<HomepageTickerItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTicker = async () => {
      try {
        const data = await homepageService.getStorefrontHomepageData();
        if (isMounted) {
          setTickerItems(data.ticker_items || []);
          setLoaded(true);
        }
      } catch (err) {
        console.warn("ServiceStrip: failed to load ticker items", err);
        if (isMounted) {
          setLoaded(true);
        }
      }
    };

    loadTicker();

    const handleUpdate = () => {
      loadTicker();
    };

    window.addEventListener("ayaan:homepage-updated", handleUpdate);
    window.addEventListener("ayaan:data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("ayaan:homepage-updated", handleUpdate);
      window.removeEventListener("ayaan:data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Filter only active items with non-empty text
  const activeItems = useMemo(() => {
    return tickerItems.filter((item) => item.is_active && item.text && item.text.trim().length > 0);
  }, [tickerItems]);

  // Gracefully hide if loaded and no active items exist (Requirement 23: Empty Ticker State)
  if (loaded && activeItems.length === 0) {
    return null;
  }

  // If still loading and no items yet, don't show an empty strip
  if (!loaded && activeItems.length === 0) {
    return null;
  }

  // To ensure seamless CSS marquee looping (-50% translation) without empty gaps on ultra-wide screens,
  // ensure the base list has at least 6-8 entries before duplicating into two identical tracks.
  const displayItems = [...activeItems];
  while (displayItems.length < 6 && displayItems.length > 0) {
    displayItems.push(...activeItems);
  }

  return (
    <section
      id="homepage-ticker"
      ref={sectionRef}
      className="w-full bg-background pt-0 pb-0.5 select-none overflow-hidden"
      aria-label="Homepage Scrolling Keywords"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        {/* Ticker Strip (Thin, flat bar with subtle borders) */}
        <div className="relative w-full h-8 sm:h-8.5 overflow-hidden border-y border-border/50 bg-secondary/15 dark:bg-card/25 flex items-center">
          
          {/* Subtle edge fades */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-r from-background to-transparent z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-6 bg-gradient-to-l from-background to-transparent z-10"
            aria-hidden="true"
          />

          {/* Continuous Right-to-Left Ticker Track (2 identical sets for seamless 0% -> -50% loop) */}
          <div
            className="animate-ticker-marquee items-center"
            role="marquee"
            aria-live="off"
          >
            {/* Set 1 */}
            <div className="flex items-center shrink-0 pl-3 sm:pl-4">
              {displayItems.map((item, idx) => (
                <div
                  key={`set1-${item.id || idx}-${idx}`}
                  className="inline-flex items-center whitespace-nowrap shrink-0"
                >
                  <span className="font-display font-bold tracking-tight text-foreground text-[11px] sm:text-xs uppercase">
                    {item.text.trim()}
                  </span>

                  {/* Orange Bullet Separator */}
                  <span
                    className="mx-3.5 sm:mx-5 text-[#EA580C] font-sans text-xs select-none shrink-0"
                    aria-hidden="true"
                  >
                    •
                  </span>
                </div>
              ))}
            </div>

            {/* Set 2 (Identical duplicate for seamless marquee illusion) */}
            <div className="flex items-center shrink-0 pl-3 sm:pl-4" aria-hidden="true">
              {displayItems.map((item, idx) => (
                <div
                  key={`set2-${item.id || idx}-${idx}`}
                  className="inline-flex items-center whitespace-nowrap shrink-0"
                >
                  <span className="font-display font-bold tracking-tight text-foreground text-[11px] sm:text-xs uppercase">
                    {item.text.trim()}
                  </span>

                  {/* Orange Bullet Separator */}
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
