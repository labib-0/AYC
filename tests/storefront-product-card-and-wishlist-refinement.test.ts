/**
 * AYAAN CLOTHING — STOREFRONT PRODUCT CARD REFINEMENT (PHASE 3)
 * Comprehensive Automated Verification Suite
 * 
 * Verifies Product Cards, Wishlist independence, Sold Out states,
 * Quick Add hit-target separation, and Responsive Accessibility.
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import React from "react";
import ReactDOMServer from "react-dom/server";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failed++;
  }
}

console.log("================================================================================");
console.log("TEST SUITE: STOREFRONT PRODUCT CARD & WISHLIST REFINEMENT (PHASE 3)");
console.log("================================================================================");

const repoRoot = path.resolve(__dirname, "..");
const productCardPath = path.join(repoRoot, "src/components/product/ProductCard.tsx");
const wishlistContextPath = path.join(repoRoot, "src/lib/WishlistContext.tsx");
const wishlistServicePath = path.join(repoRoot, "src/services/wishlist.service.ts");
const brandOverlayPath = path.join(repoRoot, "src/components/common/ProductBrandLogoOverlay.tsx");
const productBadgePath = path.join(repoRoot, "src/components/common/ProductBadge.tsx");
const productPricingHelperPath = path.join(repoRoot, "src/lib/product-pricing.ts");

const productCardSrc = fs.readFileSync(productCardPath, "utf-8");
const wishlistContextSrc = fs.readFileSync(wishlistContextPath, "utf-8");
const wishlistServiceSrc = fs.readFileSync(wishlistServicePath, "utf-8");
const brandOverlaySrc = fs.readFileSync(brandOverlayPath, "utf-8");
const productBadgeSrc = fs.readFileSync(productBadgePath, "utf-8");
const productPricingHelperSrc = fs.readFileSync(productPricingHelperPath, "utf-8");

// Import components for SSR render testing
import ProductBrandLogoOverlay from "../src/components/common/ProductBrandLogoOverlay";
import ProductPromotionBadges from "../src/components/common/ProductPromotionBadges";
import { ProductBadge } from "../src/components/common/ProductBadge";
import { getLowestValidCustomerUnitPrice } from "../src/lib/product-pricing";
import { formatPrice } from "../src/lib/formatters";

// ▶ GROUP 1: Product Card Architecture & Hierarchy
console.log("\n▶ [GROUP 1]: Product Card Structural Hierarchy & Visual Balance");

test("1. Product card renders correct visual hierarchy and 3:4 image container", () => {
  assert(productCardSrc.includes("aspect-[3/4]"), "Must preserve canonical 3:4 aspect ratio container");
  assert(productCardSrc.includes("<ProductImageFrame"), "Must render ProductImageFrame for lazy loaded images");
  assert(productCardSrc.includes("<ProductPromotionBadges"), "Must render top-left promotional badges");
  assert(productCardSrc.includes("<ProductBrandLogoOverlay"), "Must render top-right authoritative brand logo");
  assert(productCardSrc.includes("<ProductBadge"), "Must render design type badge (Original / Master Copy)");
});

// ▶ GROUP 2: Wishlist Functionality & Independence
console.log("\n▶ [GROUP 2]: Wishlist Button Functionality & Visual States");

test("2. Wishlist button works via toggleWishlist handler", () => {
  assert(productCardSrc.includes("const { isInWishlist, toggleWishlist } = useWishlist()"), "Must consume useWishlist context");
  assert(productCardSrc.includes("handleWishlistToggle"), "Must implement independent handleWishlistToggle");
  assert(productCardSrc.includes("toggleWishlist(product)"), "Must invoke toggleWishlist with current product");
  assert(productCardSrc.includes("e.stopPropagation()"), "Must stop propagation to prevent card link navigation");
});

test("3. Wishlist active state distinguishes between saved and unsaved", () => {
  assert(productCardSrc.includes("isWishlisted"), "Must track isWishlisted boolean");
  assert(productCardSrc.includes("bg-rose-500 text-white"), "Saved state must render clear active rose/white background");
  assert(productCardSrc.includes("fill-current text-white"), "Saved state must render filled heart icon");
  assert(productCardSrc.includes("bg-background/90"), "Unsaved state must render neutral surface");
});

test("4. Guest wishlist interaction preserves login redirect with return destination", () => {
  assert(wishlistContextSrc.includes("redirectToLogin"), "WishlistContext must support guest login redirect");
  assert(wishlistContextSrc.includes("ayaan_intended_destination"), "Must record intended destination for post-login return");
  assert(wishlistServiceSrc.includes("/auth/me") || wishlistServiceSrc.includes("isAuthenticated") || wishlistContextSrc.includes("user"), "Must distinguish authenticated vs guest customer");
});

test("5. SOLD OUT products remain 100% wishlistable without inventory dependency", () => {
  // Ensure the Wishlist button does NOT check isSoldOut or isOutOfStock for disabled state
  assert(!productCardSrc.match(/<button[^>]*disabled=\{[^}]*isSoldOut[^}]*handleWishlistToggle/), "Wishlist button must NEVER be disabled when product is Sold Out");
  assert(productCardSrc.includes("isSoldOut ? \"opacity-80 grayscale-[0.35]\" : \"\""), "Sold out product dims card but leaves wishlist button active");
});

// ▶ GROUP 3: Quick Add & Commerce Integrity
console.log("\n▶ [GROUP 3]: Quick Add Enforcement & Pricing Invariants");

test("6. SOLD OUT product Quick Add is disabled with subdued appearance", () => {
  assert(productCardSrc.includes("disabled={isSoldOut || isOutOfStock}"), "Quick Add button must be disabled for sold out or out of stock items");
  assert(productCardSrc.includes('aria-disabled={isSoldOut || isOutOfStock ? "true" : undefined}'), "Must declare accessible aria-disabled state");
  assert(productCardSrc.includes("bg-secondary/80 text-muted-foreground/70"), "Must render subdued non-competing gray surface for unavailable items");
  assert(productCardSrc.includes("cursor-not-allowed"), "Must display not-allowed cursor for disabled button");
});

test("7. Available product Quick Add is interactive and opens modal", () => {
  assert(productCardSrc.includes("openProductModal(product)"), "Quick Add must open authoritative ProductModal");
  assert(productCardSrc.includes("cursor-pointer"), "Available button must use cursor-pointer");
  assert(productCardSrc.includes("hover:bg-foreground hover:text-background"), "Available button must have clear interactive hover state");
});

test("8. MOQ remains enforced and clearly presented", () => {
  assert(productCardSrc.includes("const effectiveMoq = Math.max(1, product.moq || 10)"), "Must safely compute effective MOQ with minimum 1");
  assert(productCardSrc.includes("MOQ {effectiveMoq} pcs"), "Must clearly display MOQ in pcs");
});

test("9. Full Stock and Bulk pricing calculations respect exact inventory", () => {
  assert(productCardSrc.includes("getLowestValidCustomerUnitPrice(product)"), "Must use getLowestValidCustomerUnitPrice for customer-facing price");
  assert(productPricingHelperSrc.includes("getLowestValidCustomerUnitPrice"), "Product pricing helper must define lowest unit price calculator");
  assert(productCardSrc.includes("/ pc"), "Must display '/ pc' unit indicator");
  assert(!productCardSrc.includes("product.price || 0"), "Must not use unsafe zero fallback pricing");
});

test("10. PRE-ORDER products remain purchasable with delivery timeframe", () => {
  assert(productCardSrc.includes("isPreorder"), "Must determine preorder status");
  assert(productCardSrc.includes("!isPreorder && (availableMoqs <= 0 || availableStock <= 0)"), "Preorder products are NOT marked as out of stock");
  assert(productCardSrc.includes("Delivery:"), "Displays estimated delivery date for preorder items");
  assert(productCardSrc.includes("Pre-Order"), "Displays Pre-Order indicator");
});

// ▶ GROUP 4: Spacing, Overlay Separation & Mobile Layout
console.log("\n▶ [GROUP 4]: Spatial Separation, Responsiveness & Hit Targets");

test("11. Quick Add and Wishlist hit targets do not overlap", () => {
  // Quick Add must have right inset to leave clear space for Wishlist button at bottom-2.5 right-2.5
  assert(
    productCardSrc.includes("right-[46px]") || productCardSrc.includes("right-[50px]"),
    "Quick Add container must have right inset leaving dedicated space for Wishlist"
  );
  assert(productCardSrc.includes("bottom-2.5 right-2.5 z-20"), "Wishlist button positioned at bottom-2.5 right-2.5 with z-20");
  assert(productCardSrc.includes("pointer-events-none") && productCardSrc.includes("pointer-events-auto"), "Parent overlay uses pointer-events-none with pointer-events-auto on buttons to prevent collision");
});

test("12. Product title preserves admin casing with line-clamp-2", () => {
  assert(productCardSrc.includes("line-clamp-2"), "Product title must clamp at 2 lines");
  assert(productCardSrc.includes("min-h-[2.4rem]"), "Product title must maintain consistent min-height for grid alignment");
  assert(!productCardSrc.includes("uppercase font-body") && !productCardSrc.includes("capitalize font-body"), "Product title must NOT alter admin-entered casing");
});

test("13. Product metadata groups MOQ and stock status cohesively", () => {
  assert(!productCardSrc.includes("justify-between gap-1 mt-0.5"), "Replaces wide justify-between gap with cohesive grouping");
  assert(productCardSrc.includes("flex items-center flex-wrap gap-x-2"), "MOQ and stock status grouped with flex-wrap gap-x-2");
  assert(productCardSrc.includes("isSoldOut ? null : isPreorder ?"), "Omits redundant bottom Sold Out indicator to prefer single top-left badge");
});

test("14. Mobile card layout maintains touch targets and clean density", () => {
  assert(productCardSrc.includes("w-8 h-8"), "Wishlist button uses 32x32px comfortable touch target");
  assert(productCardSrc.includes("sm:opacity-0 sm:group-hover:opacity-100"), "Controls show on mobile without requiring mouse hover");
  assert(productCardSrc.includes("overflow-hidden"), "Card container prevents horizontal overflow");
});

// ▶ GROUP 5: Accessibility & Security
console.log("\n▶ [GROUP 5]: Accessibility Compliance & Data Privacy");

test("15. Controls provide descriptive accessibility labels", () => {
  assert(productCardSrc.includes('aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}'), "Wishlist provides dynamic accessible name");
  assert(productCardSrc.includes('aria-label='), "Quick Add provides accessible name");
  assert(productCardSrc.includes("Sold out - unavailable for purchase"), "Sold out state provides explicit unavailable accessibility label");
  assert(productCardSrc.includes("focus-visible:ring-2"), "Buttons provide visible focus indicator for keyboard navigation");
});

test("16. Product card strictly never leaks internal cost or purchase prices", () => {
  assert(!productCardSrc.includes("purchase_price"), "ProductCard must not reference purchase_price");
  assert(!productCardSrc.includes("cost_price"), "ProductCard must not reference cost_price");
  assert(!productCardSrc.includes("supplier_cost"), "ProductCard must not reference supplier_cost");
  assert(!productCardSrc.includes("margin"), "ProductCard must not display margins");
});

// ▶ GROUP 6: SSR Render Output Verification
console.log("\n▶ [GROUP 6]: SSR Render Output Verification");

test("SSR Render: ProductPromotionBadges renders Sold Out correctly", () => {
  const soldOutHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProductPromotionBadges, {
      isSoldOut: true,
      variant: "card",
    })
  );
  assert(soldOutHtml.includes("SOLD OUT"), "Must render SOLD OUT text");
  assert(soldOutHtml.includes("role=\"status\""), "Must have role status for screen readers");
});

test("SSR Render: ProductPromotionBadges renders Pre-Order correctly", () => {
  const preorderHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProductPromotionBadges, {
      isPreorder: true,
      variant: "card",
    })
  );
  assert(preorderHtml.includes("PRE-ORDER"), "Must render PRE-ORDER badge");
});

test("SSR Render: ProductBrandLogoOverlay renders without distortion", () => {
  const logoHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProductBrandLogoOverlay, {
      brandName: "Nike",
      brandLogo: "/brands/nike.svg",
      size: "card",
    })
  );
  assert(logoHtml.includes("object-contain"), "Logo must use object-contain to prevent distortion");
  assert(logoHtml.includes("aspect-[1.35/1]"), "Must preserve 1.35:1 aspect container");
});

test("SSR Render: ProductBadge supports neutral, preorder, and soldout variants", () => {
  const neutral = ReactDOMServer.renderToStaticMarkup(React.createElement(ProductBadge, { variant: "neutral" }, "ORIGINAL"));
  assert(neutral.includes("ORIGINAL"), "Renders neutral badge");
  const soldout = ReactDOMServer.renderToStaticMarkup(React.createElement(ProductBadge, { variant: "soldout" }, "SOLD OUT"));
  assert(soldout.includes("SOLD OUT"), "Renders soldout badge");
});

console.log("\n================================================================================");
console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
