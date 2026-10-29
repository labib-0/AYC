"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  trackPageViewConversion,
  trackGenericPageView,
  sanitizeTrackingUrl,
} from "@/lib/analytics/google-ads";

/**
 * Inner tracker component utilizing Next.js navigation hooks.
 * Wrapped in Suspense to maintain App Router static optimization.
 */
function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tracks the last dispatched page key (sanitized path + query) to prevent duplicate emissions
  const lastTrackedKeyRef = useRef<string | null>(null);
  // Maintains client-side referrer across SPA route transitions
  const lastReferrerRef = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;

    // Defense-in-depth: Strictly exclude administrative and internal staff routes
    const isClientAdmin =
      typeof window !== "undefined" &&
      (window.location.port === "3001" ||
        window.location.hostname.startsWith("admin.") ||
        window.location.hostname === "admin.localhost");

    if (
      isClientAdmin ||
      pathname.startsWith("/ayc") ||
      pathname.startsWith("/admin")
    ) {
      return;
    }

    // Sanitize path and query parameters (strip auth tokens, passwords, customer PII)
    const { cleanPath, cleanUrl } = sanitizeTrackingUrl(pathname, searchParams);

    // Deduplication check:
    // If the sanitized path and query match the most recently dispatched page, skip emission.
    // This guards against:
    // 1. React Strict Mode double-invocation of effects in development and hydration checks
    // 2. Component re-renders triggered by state updates (e.g. modals opening, carts updating)
    // 3. In-page hash clicks (e.g. /#top-banner, /products#specifications)
    // 4. Redundant fast clicks on the active page link
    if (lastTrackedKeyRef.current === cleanPath) {
      return;
    }

    const referrer =
      lastReferrerRef.current ||
      (typeof document !== "undefined" ? document.referrer : "");
    const title = typeof document !== "undefined" ? document.title : "";

    const payload = {
      page_path: cleanPath,
      page_location: cleanUrl,
      page_title: title,
      page_referrer: referrer,
      value: 1.0,
      currency: "USD",
    };

    // 1. Dispatch authoritative Google Ads Page View conversion:
    // Destination: AW-18504838697/UcUXCP6W56YdEKnc5fdE
    trackPageViewConversion(payload);

    // 2. Dispatch generic page_view event for standard GTM / GA4 continuity
    trackGenericPageView(payload);

    // Record dispatched key and update referrer for subsequent SPA transitions
    lastTrackedKeyRef.current = cleanPath;
    lastReferrerRef.current = cleanUrl;
  }, [pathname, searchParams]);

  return null;
}

/**
 * GlobalPageViewTracker
 *
 * Reusable client tracking component that captures page views across the entire AYC storefront:
 * - Initial landing page load (direct, search, marketing campaign)
 * - Subsequent Next.js App Router client transitions (links, menus, product cards, filters)
 * - Browser back, forward, and reload navigation
 * - Excludes admin routes (/ayc, /admin)
 * - Deduplicates sequential identical events
 * - Strips sensitive credentials from URLs
 */
export default function GlobalPageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
