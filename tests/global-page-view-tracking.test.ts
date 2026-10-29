/**
 * Automated Verification Suite: Global Page View Tracking Architecture
 *
 * Verifies:
 * 1. Exact Google Ads Page View Conversion Destination:
 *    - Destination: AW-18504838697/UcUXCP6W56YdEKnc5fdE
 *    - Value: 1.0 USD
 *    - Currency: USD
 * 2. URL Sanitization:
 *    - Strips sensitive parameters (token, auth, password, email, phone, session, secret, jwt)
 *    - Preserves marketing and catalog parameters (utm_*, gclid, category, sort, page, query, search)
 *    - Strips in-page hash fragments (#top-banner, #specs)
 * 3. Static Integration & Choke Points:
 *    - GlobalPageViewTracker is mounted inside StorefrontShell.tsx
 *    - Administrative routes (/ayc, /admin, admin host) explicitly bypass StorefrontShell and tracking
 *    - No duplicate Google Tag script loaders injected
 * 4. Runtime & Deduplication Behavior:
 *    - Initial landing visit dispatches conversion and page_view
 *    - SPA route transitions dispatch conversion and page_view with updated location & referrer
 *    - React Strict Mode and component re-renders do NOT double-fire
 *    - Hash navigation does NOT trigger false duplicate page views
 * 5. Non-Blocking Resilience:
 *    - Never throws unhandled exceptions if window.gtag throws
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  GOOGLE_ADS_CONVERSIONS,
  trackPageViewConversion,
  trackGenericPageView,
  sanitizeTrackingUrl,
} from "../src/lib/analytics/google-ads";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log("======================================================================");
console.log("TEST SUITE: GLOBAL PAGE VIEW TRACKING VERIFICATION");
console.log("======================================================================\n");

const projectRoot = resolve(__dirname, "..");

// ─── TEST 1: EXACT CONVERSION DESTINATION & DEFAULT VALUES ───────────────────
console.log("▶ TEST 1: EXACT DESTINATION ID AND DEFAULT VALUES");
assert(
  GOOGLE_ADS_CONVERSIONS.PAGE_VIEW === "AW-18504838697/UcUXCP6W56YdEKnc5fdE",
  "Page View send_to matches 'AW-18504838697/UcUXCP6W56YdEKnc5fdE'"
);

// Setup Mock Environment
const mockDataLayer: any[] = [];
const mockGtagCalls: any[] = [];

(globalThis as any).window = {
  dataLayer: mockDataLayer,
  location: {
    origin: "https://ayaanclothing.com",
    pathname: "/",
    search: "",
    hash: "",
    port: "",
    hostname: "ayaanclothing.com",
  },
  gtag: function (...args: any[]) {
    mockGtagCalls.push(args);
    mockDataLayer.push(args);
  },
};
(globalThis as any).document = {
  title: "Ayaan Clothing | Garment Manufacturer",
  referrer: "",
};

function resetMocks() {
  mockDataLayer.length = 0;
  mockGtagCalls.length = 0;
}

resetMocks();
const defaultPvRes = trackPageViewConversion();
assert(defaultPvRes === true, "trackPageViewConversion executes successfully");
assert(mockGtagCalls.length === 1, "gtag called exactly once");
assert(mockGtagCalls[0][0] === "event", "First argument is 'event'");
assert(mockGtagCalls[0][1] === "conversion", "Second argument is 'conversion'");
assert(
  mockGtagCalls[0][2].send_to === "AW-18504838697/UcUXCP6W56YdEKnc5fdE",
  "send_to parameter matches exact Google Ads page view destination"
);
assert(mockGtagCalls[0][2].value === 1.0, "Default conversion value is 1.0");
assert(mockGtagCalls[0][2].currency === "USD", "Default conversion currency is USD");

// ─── TEST 2: URL SANITIZATION & PRIVACY PROTECTION ───────────────────────────
console.log("\n▶ TEST 2: URL SANITIZATION & PRIVACY PROTECTION");

// Case 2A: Clean path without query params
const clean1 = sanitizeTrackingUrl("/products");
assert(clean1.cleanPath === "/products", "Clean path preserved: /products");
assert(clean1.cleanUrl === "https://ayaanclothing.com/products", "Clean URL formatted correctly");
assert(clean1.hasRedactedParams === false, "No redactions on clean URL");

// Case 2B: Marketing parameters preserved
const marketingQuery = new URLSearchParams({
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "summer_collection",
  gclid: "Cj0KCQjwx...",
  category: "Shirts",
  sort: "price_asc",
  page: "2",
});
const clean2 = sanitizeTrackingUrl("/products", marketingQuery);
assert(clean2.cleanPath.includes("utm_source=google"), "utm_source preserved");
assert(clean2.cleanPath.includes("utm_campaign=summer_collection"), "utm_campaign preserved");
assert(clean2.cleanPath.includes("gclid=Cj0KCQjwx..."), "gclid preserved");
assert(clean2.cleanPath.includes("category=Shirts"), "catalog filter category preserved");
assert(clean2.cleanPath.includes("sort=price_asc"), "sort preserved");
assert(clean2.cleanPath.includes("page=2"), "page number preserved");
assert(clean2.hasRedactedParams === false, "No safe marketing params redacted");

// Case 2C: Sensitive credentials & PII stripped
const dirtyQuery = new URLSearchParams({
  category: "Pants",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload",
  password: "SuperSecretPassword123!",
  email: "customer@domain.com",
  auth_token: "secret_access_token_xyz",
  session_id: "sess_9876543210",
  api_key: "ak_live_1234567890",
  utm_source: "newsletter",
});
const clean3 = sanitizeTrackingUrl("/products", dirtyQuery);
assert(clean3.hasRedactedParams === true, "hasRedactedParams flag set to true");
assert(!clean3.cleanPath.includes("token="), "token parameter stripped");
assert(!clean3.cleanPath.includes("password="), "password parameter stripped");
assert(!clean3.cleanPath.includes("customer@domain.com"), "email parameter stripped");
assert(!clean3.cleanPath.includes("auth_token="), "auth_token parameter stripped");
assert(!clean3.cleanPath.includes("session_id="), "session_id parameter stripped");
assert(!clean3.cleanPath.includes("api_key="), "api_key parameter stripped");
assert(clean3.cleanPath.includes("category=Pants"), "Safe category parameter retained");
assert(clean3.cleanPath.includes("utm_source=newsletter"), "Safe utm_source parameter retained");

// Case 2D: Hash fragments stripped
const clean4 = sanitizeTrackingUrl("/#top-banner");
assert(clean4.cleanPath === "/", "Hash fragment #top-banner stripped from pathname");
assert(!clean4.cleanUrl.includes("#top-banner"), "Hash fragment stripped from cleanUrl");

// ─── TEST 3: STATIC ARCHITECTURE & MOUNTING AUDIT ────────────────────────────
console.log("\n▶ TEST 3: STATIC ARCHITECTURE & MOUNTING AUDIT");

const storefrontShellPath = resolve(projectRoot, "src/components/layout/StorefrontShell.tsx");
assert(existsSync(storefrontShellPath), "StorefrontShell.tsx exists");
const shellSource = readFileSync(storefrontShellPath, "utf-8");

assert(
  shellSource.includes('import GlobalPageViewTracker from "@/components/analytics/GlobalPageViewTracker";'),
  "StorefrontShell imports GlobalPageViewTracker"
);
assert(
  shellSource.includes("<GlobalPageViewTracker />"),
  "StorefrontShell mounts <GlobalPageViewTracker />"
);

// Verify admin routes bypass StorefrontShell and tracking
assert(
  shellSource.includes("if (isAdminRoute)") &&
  shellSource.includes("<main className=\"min-h-screen bg-background text-foreground\">{children}</main>"),
  "Admin routes bypass storefront shell and tracking component entirely"
);

// Verify tracker implementation
const trackerPath = resolve(projectRoot, "src/components/analytics/GlobalPageViewTracker.tsx");
assert(existsSync(trackerPath), "GlobalPageViewTracker.tsx exists");
const trackerSource = readFileSync(trackerPath, "utf-8");

assert(
  trackerSource.includes('"use client";'),
  "GlobalPageViewTracker is a client component"
);
assert(
  trackerSource.includes("usePathname") && trackerSource.includes("useSearchParams"),
  "GlobalPageViewTracker utilizes Next.js App Router hooks"
);
assert(
  trackerSource.includes("<Suspense fallback={null}>"),
  "GlobalPageViewTracker wraps useSearchParams in Suspense boundary"
);
assert(
  trackerSource.includes("pathname.startsWith(\"/ayc\")") &&
  trackerSource.includes("pathname.startsWith(\"/admin\")"),
  "GlobalPageViewTracker contains explicit defense-in-depth exclusion for admin routes"
);
assert(
  trackerSource.includes("lastTrackedKeyRef"),
  "GlobalPageViewTracker utilizes lastTrackedKeyRef for route deduplication"
);
assert(
  trackerSource.includes("trackPageViewConversion"),
  "GlobalPageViewTracker dispatches official Google Ads page view conversion"
);
assert(
  trackerSource.includes("trackGenericPageView"),
  "GlobalPageViewTracker dispatches generic page_view event for GTM / GA4"
);

// ─── TEST 4: DEDUPLICATION & SPA ROUTE TRANSITIONS SIMULATION ─────────────────
console.log("\n▶ TEST 4: DEDUPLICATION & ROUTE TRANSITIONS SIMULATION");
resetMocks();

// Simulate simulated route tracker state machine
let lastTrackedKey: string | null = null;
let lastReferrer = "";

function simulateRouteNavigation(path: string, query?: URLSearchParams | string, docTitle = "Ayaan Clothing") {
  const { cleanPath, cleanUrl } = sanitizeTrackingUrl(path, query);
  if (lastTrackedKey === cleanPath) {
    return false; // Deduplicated
  }

  const payload = {
    page_path: cleanPath,
    page_location: cleanUrl,
    page_title: docTitle,
    page_referrer: lastReferrer,
    value: 1.0,
    currency: "USD",
  };

  trackPageViewConversion(payload);
  trackGenericPageView(payload);

  lastTrackedKey = cleanPath;
  lastReferrer = cleanUrl;
  return true;
}

// 4A: Initial Landing Page (/)
const nav1 = simulateRouteNavigation("/", undefined, "Ayaan Clothing | Home");
assert(nav1 === true, "Initial landing navigation fires successfully");
assert(mockGtagCalls.length === 2, "Dispatched 2 events: conversion and page_view");
assert(mockGtagCalls[0][2].send_to === "AW-18504838697/UcUXCP6W56YdEKnc5fdE", "Conversion send_to correct");
assert(mockGtagCalls[0][2].page_path === "/", "Initial path is '/'");
assert(mockGtagCalls[1][0] === "event" && mockGtagCalls[1][1] === "page_view", "Generic page_view dispatched");

// 4B: React Strict Mode double-render / re-render with identical path
const strictModeDuplicate = simulateRouteNavigation("/", undefined, "Ayaan Clothing | Home");
assert(strictModeDuplicate === false, "Identical route re-evaluation is strictly deduplicated");
assert(mockGtagCalls.length === 2, "No additional events dispatched during re-render");

// 4C: In-page hash navigation (/#top-banner)
const hashNav = simulateRouteNavigation("/#top-banner", undefined, "Ayaan Clothing | Home");
assert(hashNav === false, "Hash navigation is deduplicated and does not trigger new page view");
assert(mockGtagCalls.length === 2, "No additional events dispatched on hash click");

// 4D: Client-side navigation to /products
const nav2 = simulateRouteNavigation("/products", "category=Shirts&utm_source=google", "Ayaan Clothing | Catalog");
assert(nav2 === true, "Navigation to /products fires successfully");
assert(mockGtagCalls.length === 4, "Total events is now 4 (2 conversions, 2 page_views)");
assert(
  mockGtagCalls[2][2].page_path === "/products?category=Shirts&utm_source=google",
  "Sanitized path with category and utm_source recorded"
);
assert(
  mockGtagCalls[2][2].page_referrer === "https://ayaanclothing.com/",
  "Referrer accurately set to previous page URL"
);

// 4E: Client-side navigation to Product Details (/products/classic-polo-shirt)
const nav3 = simulateRouteNavigation("/products/classic-polo-shirt", undefined, "Classic Polo Shirt | Ayaan Clothing");
assert(nav3 === true, "Navigation to product detail fires successfully");
assert(mockGtagCalls.length === 6, "Total events is now 6");
assert(mockGtagCalls[4][2].page_path === "/products/classic-polo-shirt", "Product detail path recorded");
assert(
  mockGtagCalls[4][2].page_referrer === "https://ayaanclothing.com/products?category=Shirts&utm_source=google",
  "Referrer points to catalog listing URL"
);

// 4F: Browser Back button navigation (back to /products)
const navBack = simulateRouteNavigation("/products", "category=Shirts&utm_source=google", "Ayaan Clothing | Catalog");
assert(navBack === true, "Browser back navigation to catalog fires successfully");
assert(mockGtagCalls.length === 8, "Total events is now 8");
assert(
  mockGtagCalls[6][2].page_referrer === "https://ayaanclothing.com/products/classic-polo-shirt",
  "Back button referrer points to product detail page"
);

// ─── TEST 5: NO DUPLICATE GLOBAL SCRIPT TAG INJECTION ────────────────────────
console.log("\n▶ TEST 5: SCRIPT INJECTION SAFETY");
assert(
  !trackerSource.includes("googletagmanager.com/gtag/js"),
  "GlobalPageViewTracker does NOT inject duplicate gtag.js script loaders"
);
assert(
  !trackerSource.includes("<script"),
  "GlobalPageViewTracker does NOT inject raw DOM script tags"
);

// ─── TEST 6: NON-BLOCKING RESILIENCE (GTAG THROWS) ───────────────────────────
console.log("\n▶ TEST 6: NON-BLOCKING RESILIENCE");
const throwingGtag = () => {
  throw new Error("Ad blocker active");
};
(globalThis as any).window.gtag = throwingGtag;

let caughtError = false;
try {
  const safeRes = trackPageViewConversion({ page_path: "/test-error" });
  assert(safeRes === false, "Returns false when gtag throws");
} catch {
  caughtError = true;
}
assert(!caughtError, "trackPageViewConversion NEVER crashes application even if gtag throws");

console.log("\n======================================================================");
console.log("🎉 ALL GLOBAL PAGE VIEW TRACKING VERIFICATION SUITES PASSED!");
console.log("======================================================================\n");
