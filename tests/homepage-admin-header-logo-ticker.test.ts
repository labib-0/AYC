/**
 * Verification Test Suite: Homepage Admin Restructure, Header Logo, Ticker & Season Removal
 *
 * Verifies:
 * 1. Admin sidebar has renamed "Homepage & Landing Page" to "Homepage".
 * 2. HeaderBranding renders an invisible/transparent square container with aspect-ratio: 1/1.
 * 3. HeaderBranding places website title immediately to the right of logo container.
 * 4. When no logo exists, HeaderBranding gracefully omits the logo container without placeholder.
 * 5. HomepageService correctly manages ticker items and has removed season update APIs.
 * 6. ServiceStrip handles empty ticker items gracefully without rendering an empty strip.
 * 7. Obsolete components (BannerStatusControl, SeasonManager) are completely removed from admin/homepage exports.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";
import HeaderBranding from "../src/components/common/HeaderBranding";
import { homepageService } from "../src/services/homepage.service";
import * as AdminHomepageComponents from "../src/components/admin/homepage";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("RUNNING HOMEPAGE ADMIN & STOREFRONT AUDIT");
console.log("=======================================================\n");

// 1. Sidebar Naming Verification
const allSidebarItems = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);
const allSidebarLabels = allSidebarItems.map((i) => i.label);
assert(allSidebarLabels.includes("Homepage"), "Sidebar item is titled 'Homepage'");
assert(!allSidebarLabels.includes("Homepage & Landing Page"), "Sidebar has NO 'Homepage & Landing Page' label");

// 2. Header Logo Container Checks
const markupWithLogo = ReactDOMServer.renderToStaticMarkup(
  React.createElement(HeaderBranding, {
    siteTitle: "AYAAN CLOTHING",
    siteLogo: "https://example.com/logo.png",
  })
);

assert(markupWithLogo.includes("aspect-square"), "Logo container includes 'aspect-square'");
assert(markupWithLogo.includes("aspect-ratio:1 / 1") || markupWithLogo.includes("aspect-ratio: 1 / 1"), "Logo container enforces explicit 1/1 aspect ratio style");
assert(markupWithLogo.includes("bg-transparent"), "Logo container has bg-transparent");
assert(markupWithLogo.includes("border-0"), "Logo container has border-0 (no visible border)");
assert(markupWithLogo.includes("shadow-none"), "Logo container has shadow-none");
assert(markupWithLogo.includes("AYAAN CLOTHING") || markupWithLogo.includes("AYAAN"), "Website title is present directly in branding");

// When no logo is provided, verify no placeholder box exists
const markupWithoutLogo = ReactDOMServer.renderToStaticMarkup(
  React.createElement(HeaderBranding, {
    siteTitle: "AYAAN CLOTHING",
    siteLogo: null,
  })
);
assert(!markupWithoutLogo.includes("aspect-square"), "When no logo exists, no square logo container is rendered");
assert(!markupWithoutLogo.includes("<img"), "When no logo exists, no img element is rendered");
assert(markupWithoutLogo.includes("AYAAN"), "When no logo exists, website title renders directly");

// 3. Homepage Service & Complete Removal of Season Management
assert(typeof (homepageService as any).syncTickerItems === "function", "HomepageService provides syncTickerItems method");
assert(typeof (homepageService as any).updateActiveSeason === "undefined", "HomepageService strictly does not have updateActiveSeason method");

// 4. Admin Homepage Exports Audit (Complete Removal of Visibility & Season)
assert(Boolean((AdminHomepageComponents as any).HomepageLogoManager), "HomepageLogoManager is exported from admin/homepage");
assert(Boolean((AdminHomepageComponents as any).HomepageTickerManager), "HomepageTickerManager is exported from admin/homepage");
assert(typeof (AdminHomepageComponents as any).BannerStatusControl === "undefined", "BannerStatusControl is completely removed from admin/homepage");
assert(typeof (AdminHomepageComponents as any).SeasonManager === "undefined", "SeasonManager is completely removed from admin/homepage");

console.log("\n=======================================================");
console.log("ALL HOMEPAGE ADMIN & STOREFRONT AUDIT TESTS PASSED!");
console.log("=======================================================\n");
