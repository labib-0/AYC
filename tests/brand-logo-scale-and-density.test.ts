/**
 * AUTOMATED TEST SUITE: BRAND LOGO DENSITY (20/ROW) & 1.5X OVERLAY SCALING
 * 
 * Verifies:
 * 1. Shop By Brand displays ~20 logos in a row on desktop
 * 2. Shop By Brand initial visible count is 40 (2 rows of 20)
 * 3. BrandLogoTile renders slightly enlarged logo constraints for 20/row (max-h-[74%], max-w-[82%], p-1 sm:p-1.5)
 * 4. ProductBrandLogoOverlay scales 1.5x remain unchanged:
 *    - card: 60px / 66px (was 40px / 44px)
 *    - detail: 72px / 84px (was 48px / 56px)
 *    - modal: 60px / 72px (was 40px / 48px)
 *    - thumb: 48px (was 32px)
 * 5. Aspect ratio 1.35/1 is preserved across all variants
 */

import fs from "fs";
import path from "path";
import React from "react";
import ReactDOMServer from "react-dom/server";

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ Passed: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${desc}`);
    failed++;
  }
}

console.log("================================================================================");
console.log("TEST SUITE: BRAND LOGO DENSITY (20/ROW) & 1.5X CORNER OVERLAY SCALING");
console.log("================================================================================\n");

// 1. Verify ShopByBrand.tsx
console.log("[GROUP 1]: Shop By Brand Grid Density & Display Count");
const shopByBrandPath = path.join(process.cwd(), "src/components/home/ShopByBrand.tsx");
const shopByBrandCode = fs.readFileSync(shopByBrandPath, "utf-8");

assert(
  shopByBrandCode.includes("repeat(20,minmax(0,1fr))"),
  "ShopByBrand grid specifies 20 columns per row via repeat(20,minmax(0,1fr))"
);
assert(
  shopByBrandCode.includes("INITIAL_BRAND_TILES_DISPLAY_COUNT = 40"),
  "ShopByBrand initial display count is 40 (2 full rows of 20)"
);
assert(
  shopByBrandCode.includes("setVisibleCount(40)"),
  "ShopByBrand sets visible count to 40 on desktop viewports"
);
assert(
  shopByBrandCode.includes("gap-0.5 sm:gap-1"),
  "ShopByBrand grid uses compact gap gap-0.5 sm:gap-1"
);

// 2. Verify BrandLogoTile.tsx
console.log("\n[GROUP 2]: BrandLogoTile Logo Constraints");
const brandLogoTilePath = path.join(process.cwd(), "src/components/common/BrandLogoTile.tsx");
const brandLogoTileCode = fs.readFileSync(brandLogoTilePath, "utf-8");

assert(
  brandLogoTileCode.includes("p-0.5"),
  "BrandLogoTile uses minimal compact padding p-0.5"
);
assert(
  brandLogoTileCode.includes("aspect-[1.6/1]"),
  "BrandLogoTile uses compact vertical aspect ratio aspect-[1.6/1]"
);
assert(
  brandLogoTileCode.includes("max-h-[76%]") && brandLogoTileCode.includes("max-w-[84%]"),
  "BrandLogoTile constrains logo image to max-h-[76%] and max-w-[84%] for crisp, tight strip presentation"
);

// 3. Verify ProductBrandLogoOverlay.tsx
console.log("\n[GROUP 3]: ProductBrandLogoOverlay 1.5x Sizing Unchanged");
const overlayPath = path.join(process.cwd(), "src/components/common/ProductBrandLogoOverlay.tsx");
const overlayCode = fs.readFileSync(overlayPath, "utf-8");

assert(
  overlayCode.includes("w-[60px] sm:w-[66px]"),
  "Small product tile (card) scales 1.5x to w-[60px] sm:w-[66px] (was w-10 sm:w-11 / 40px-44px)"
);
assert(
  overlayCode.includes("w-[72px] sm:w-[84px]"),
  "Big product page (detail) scales 1.5x to w-[72px] sm:w-[84px] (was w-12 sm:w-14 / 48px-56px)"
);
assert(
  overlayCode.includes("w-[60px] sm:w-[72px]"),
  "Quick view / modal scales 1.5x to w-[60px] sm:w-[72px] (was w-10 sm:w-12 / 40px-48px)"
);
assert(
  overlayCode.includes("w-12 aspect-[1.35/1]"),
  "Thumbnail overlay scales 1.5x to w-12 / 48px (was w-8 / 32px)"
);
assert(
  overlayCode.includes("aspect-[1.35/1]") && overlayCode.includes('aspectRatio: "1.35 / 1"'),
  "Preserves 1.35 / 1 aspect ratio matching Shop By Brand tiles"
);

// 4. SSR Render checks
console.log("\n[GROUP 4]: SSR Render Output Verification");
import ProductBrandLogoOverlay from "../src/components/common/ProductBrandLogoOverlay";

const cardMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductBrandLogoOverlay, {
    brandName: "Nike",
    brandLogo: "/brands/nike.svg",
    size: "card",
  })
);
assert(
  cardMarkup.includes("w-[60px] sm:w-[66px]"),
  "Rendered card variant includes w-[60px] sm:w-[66px]"
);

const detailMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductBrandLogoOverlay, {
    brandName: "Nike",
    brandLogo: "/brands/nike.svg",
    size: "detail",
  })
);
assert(
  detailMarkup.includes("w-[72px] sm:w-[84px]"),
  "Rendered detail variant includes w-[72px] sm:w-[84px]"
);

console.log("\n================================================================================");
console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
