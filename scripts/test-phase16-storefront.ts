/**
 * Phase 16 — Customer Storefront Static Validation Script
 * ========================================================
 * Headless static assertions for all Phase 16 audit rules.
 * Run: npx tsx scripts/test-phase16-storefront.ts
 */

import * as fs from "fs";
import * as path from "path";

const SRC = path.join(__dirname, "..", "src");
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(SRC, "..", relPath), "utf-8");
}

function readSrcFile(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ── 1. Landing Page Section Order ──────────────────────────────────────────
console.log("\n📄 1. Landing Page Section Order (page.tsx)");
{
  const page = readSrcFile("app/page.tsx");
  const topBannerIdx = page.indexOf("<TopBanner");
  const serviceStripIdx = page.indexOf("<ServiceStrip");
  const featuredIdx = page.indexOf("<FeaturedProducts");
  const hotSalesIdx = page.indexOf("<HotSales");
  const shopByBrandIdx = page.indexOf("<ShopByBrand");
  const categoryHighlightsIdx = page.indexOf("<CategoryHighlights");
  const testimonialsIdx = page.indexOf("<Testimonials");
  const brandTrustIdx = page.indexOf("<BrandTrust");

  assert("TopBanner exists", topBannerIdx >= 0);
  assert("ServiceStrip exists", serviceStripIdx >= 0);
  assert("FeaturedProducts exists", featuredIdx >= 0);
  assert("Correct order: TopBanner → ServiceStrip → Featured → HotSales → ShopByBrand → CategoryHighlights → Testimonials → BrandTrust",
    topBannerIdx < serviceStripIdx &&
    serviceStripIdx < featuredIdx &&
    featuredIdx < hotSalesIdx &&
    hotSalesIdx < shopByBrandIdx &&
    shopByBrandIdx < categoryHighlightsIdx &&
    categoryHighlightsIdx < testimonialsIdx &&
    testimonialsIdx < brandTrustIdx
  );
}

// ── 2. Mobile Nav Accordion (Header.tsx) ───────────────────────────────────
console.log("\n📄 2. Mobile Nav Accordion (Header.tsx)");
{
  const header = readSrcFile("components/layout/Header.tsx");
  assert("mobileAccordion state exists", header.includes("mobileAccordion"));
  assert("Accordion collapses to 'none'", header.includes('"none"'));
}

// ── 3. Locked Girls Image URL ──────────────────────────────────────────────
console.log("\n📄 3. Locked Girls Image URL");
{
  const categories = readSrcFile("data/categories.json");
  assert("Girls image URL preserved in categories.json",
    categories.includes("photo-1622290291468-a28f7a7dc6a8")
  );
  const products = readSrcFile("data/products.json");
  assert("Girls image URL preserved in products.json",
    products.includes("photo-1622290291468-a28f7a7dc6a8")
  );
}

// ── 4. Headline Ticker (8 items) ───────────────────────────────────────────
console.log("\n📄 4. Headline Ticker (ServiceStrip.tsx)");
{
  const strip = readSrcFile("components/home/ServiceStrip.tsx");
  const headlines = [
    "AYAAN CLOTHING",
    "VERIFIED STOCK",
    "FACTORY DIRECT",
    "EXPORT READY",
    "GLOBAL SHIPPING",
    "BULK ORDER SUPPORT",
    "QUALITY APPAREL",
    "BUSINESS SOURCING",
  ];
  for (const h of headlines) {
    assert(`Headline "${h}" present`, strip.includes(h));
  }
  assert("Orange bullet separator #EA580C", strip.includes("#EA580C"));
}

// ── 5. Filter Order: BRAND → AUDIENCE → DESIGN TYPE → PRODUCT CATEGORY ───
console.log("\n📄 5. Filter Rail Order (GlobalFilterRail.tsx)");
{
  const rail = readSrcFile("components/common/GlobalFilterRail.tsx");
  // Match the <h3> heading text to avoid false positives from prop names
  const brandIdx = rail.indexOf(">\n          BRAND\n");
  const audienceIdx = rail.indexOf(">\n          AUDIENCE\n");
  const designTypeIdx = rail.indexOf(">\n          DESIGN TYPE\n");
  const categoryIdx = rail.indexOf(">\n          PRODUCT CATEGORY\n");
  // Fallback: match the comment markers which are more reliable
  const brandCommentIdx = rail.indexOf("1. BRAND");
  const audienceCommentIdx = rail.indexOf("2. AUDIENCE");
  const designTypeCommentIdx = rail.indexOf("3. DESIGN TYPE");
  const categoryCommentIdx = rail.indexOf("4. PRODUCT CATEGORY");
  
  const b = brandCommentIdx >= 0 ? brandCommentIdx : brandIdx;
  const a = audienceCommentIdx >= 0 ? audienceCommentIdx : audienceIdx;
  const d = designTypeCommentIdx >= 0 ? designTypeCommentIdx : designTypeIdx;
  const c = categoryCommentIdx >= 0 ? categoryCommentIdx : categoryIdx;
  
  assert("Filter rail has all section comments",
    b >= 0 && a >= 0 && d >= 0 && c >= 0
  );
  assert("Order: BRAND → AUDIENCE → DESIGN TYPE → PRODUCT CATEGORY",
    b < a && a < d && d < c
  );
}

// ── 6. Product Detail: Add to Cart Only (No Buy Now) ─────────────────────
console.log("\n📄 6. Product Detail — Add to Cart Only");
{
  const pdv = readSrcFile("app/products/[slug]/ProductDetailView.tsx");
  assert("Has 'Add to Cart'", pdv.includes("Add to Cart"));
  assert("No 'Buy Now' button", !pdv.includes("Buy Now"));
  assert("No 'Request for Quotation' in product detail", !pdv.includes("Request for Quotation"));
}

// ── 7. No Package Allocation in Cart ──────────────────────────────────────
console.log("\n📄 7. No Package Allocation in Cart");
{
  const miniCart = readSrcFile("components/cart/MiniCart.tsx");
  assert("No 'allocation' in MiniCart", !miniCart.toLowerCase().includes("allocation"));
  const checkout = readSrcFile("components/cart/CheckoutModal.tsx");
  assert("No HAWB in CheckoutModal", !checkout.includes("HAWB"));
  assert("No MAWB in CheckoutModal", !checkout.includes("MAWB"));
}

// ── 8. Promotion Badges: NEW and HOT Only ────────────────────────────────
console.log("\n📄 8. Promotion Badges (ProductPromotionBadges.tsx)");
{
  const badges = readSrcFile("components/common/ProductPromotionBadges.tsx");
  assert("Renders 'NEW' badge", badges.includes(">NEW<") || badges.includes('"NEW"') || badges.includes("NEW"));
  assert("Renders 'HOT' badge", badges.includes(">HOT<") || badges.includes('"HOT"') || badges.includes("HOT"));
  assert("No 'SALE' badge", !badges.includes("SALE"));
  assert("No 'FEATURED' badge", !badges.includes("FEATURED"));
}

// ── 9. No Native alert/confirm/prompt in Customer-Facing Files ───────────
console.log("\n📄 9. No Native Dialogs in Customer-Facing Files");
{
  const customerFiles = [
    "app/page.tsx",
    "components/layout/Header.tsx",
    "components/auth/AuthModal.tsx",
    "app/profile/orders/page.tsx",
    "app/profile/orders/[id]/page.tsx",
    "app/dashboard/quotes/page.tsx",
    "app/dashboard/quotes/[id]/page.tsx",
    "components/cart/MiniCart.tsx",
    "components/cart/CheckoutModal.tsx",
    "app/products/[slug]/ProductDetailView.tsx",
    "components/layout/SearchOverlay.tsx",
  ];
  for (const f of customerFiles) {
    const content = readSrcFile(f);
    const hasAlert = /\balert\s*\(/.test(content);
    const hasConfirm = /\bconfirm\s*\(/.test(content);
    const hasPrompt = /\bprompt\s*\(/.test(content);
    assert(`${f}: no alert()`, !hasAlert, hasAlert ? "found alert()" : "");
    assert(`${f}: no confirm()`, !hasConfirm, hasConfirm ? "found confirm()" : "");
    assert(`${f}: no prompt()`, !hasPrompt, hasPrompt ? "found prompt()" : "");
  }
}

// ── 10. Official WhatsApp Number ─────────────────────────────────────────
console.log("\n📄 10. Official WhatsApp Number (8801826304930)");
{
  const bp = readSrcFile("config/business-profile.ts");
  assert("business-profile.ts uses 8801826304930", bp.includes("8801826304930"));
  assert("business-profile.ts does NOT use 8801982183886", !bp.includes("8801982183886"));
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60) + "\n");

if (failed > 0) {
  process.exit(1);
}
