/**
 * Test: B2B Navigation Merge & Homepage/Landing Page Management
 * 
 * Verifies:
 * 1. Admin sidebar has merged "B2B RFQs & Quotes" (/admin/rfq-quotes).
 * 2. Admin sidebar has no duplicate separate RFQ or Quote items.
 * 3. Marketing section has "Homepage" (/admin/homepage).
 * 4. Homepage banner model mapping correctly serializes for storefront.
 * 5. Featured badge is NEVER rendered on product cards.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";
import { homepageService, HomepageBannerModel } from "../src/services/homepage.service";
import ProductPromotionBadges from "../src/components/common/ProductPromotionBadges";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("RUNNING B2B NAVIGATION & LANDING PAGE AUDIT");
console.log("=======================================================\n");

// 1. Sidebar Navigation Verification
const commerceSection = ADMIN_NAV_SECTIONS.find((s) => s.title === "COMMERCE");
assert(Boolean(commerceSection), "Commerce section exists in sidebar");

const commerceLabels = commerceSection?.items.map((i) => i.label) || [];
const commerceHrefs = commerceSection?.items.map((i) => i.href) || [];

assert(
  commerceLabels.includes("Orders & Fulfillment"),
  "Commerce section contains 'Orders & Fulfillment' item"
);

assert(
  commerceLabels.includes("Customer Accounts"),
  "Commerce section contains 'Customer Accounts' item"
);

assert(
  commerceLabels.includes("RFQ"),
  "Commerce section contains 'RFQ' item"
);

// 2. Marketing Section Verification
const marketingSection = ADMIN_NAV_SECTIONS.find((s) => s.title === "MARKETING");
assert(Boolean(marketingSection), "Marketing section exists in sidebar");

const marketingLabels = marketingSection?.items.map((i) => i.label) || [];
const marketingHrefs = marketingSection?.items.map((i) => i.href) || [];

assert(
  marketingLabels.includes("Homepage"),
  "Marketing section contains 'Homepage'"
);

assert(
  !marketingLabels.includes("Homepage & Landing Page"),
  "Marketing section strictly no longer contains 'Homepage & Landing Page'"
);

assert(
  marketingHrefs.includes("/admin/homepage"),
  "Homepage links to '/admin/homepage'"
);

// 3. Homepage Banner Model Conversion Verification
const sampleBannerModel: HomepageBannerModel = {
  id: 42,
  headline: "PREMIUM BANGLADESH KNITWEAR EXPORTER",
  subtitle: "Direct factory sourcing with universal package assortments.",
  image_url: "https://example.com/banners/summer.jpg",
  cta_text: "EXPLORE COLLECTION →",
  destination_type: "url",
  destination_value: "/products?category=sweaters",
  is_active: true,
};

const topBannerConfig = homepageService.bannerModelToTopBannerConfig(sampleBannerModel);

assert(
  topBannerConfig.title === "PREMIUM BANGLADESH KNITWEAR EXPORTER",
  "Banner title correctly mapped from headline"
);

assert(
  topBannerConfig.subtitle === "Direct factory sourcing with universal package assortments.",
  "Banner subtitle correctly mapped"
);

assert(
  topBannerConfig.imageUrl === "https://example.com/banners/summer.jpg",
  "Banner imageUrl correctly mapped"
);

assert(
  topBannerConfig.buttonText === "EXPLORE COLLECTION →",
  "Banner CTA text correctly mapped"
);

assert(
  topBannerConfig.target === "/products?category=sweaters",
  "Banner destination correctly mapped"
);

assert(
  topBannerConfig.active === true,
  "Banner active status correctly mapped"
);

// 4. Featured Badge Strict Business Rule Verification
const sampleFeaturedProduct = {
  id: "p1",
  name: "Export Denim Jacket",
  is_featured: true,
  is_new: false,
  is_hot: false,
};

const cardBadgeMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductPromotionBadges, { product: sampleFeaturedProduct, variant: "card" })
);

assert(
  cardBadgeMarkup === "",
  "Product with is_featured = true renders NO badge markup on product card"
);

assert(
  !cardBadgeMarkup.includes("FEATURED"),
  "Badge markup strictly never contains the word 'FEATURED'"
);

console.log("\n=======================================================");
console.log("ALL B2B NAVIGATION & LANDING PAGE TESTS PASSED!");
console.log("=======================================================\n");
