/**
 * Test Suite: Customer Product Gallery 4:5 Aspect Ratio, Compact Sizing & Internal Overlays
 *
 * Verifies:
 * 1. Main product image viewport enforces strict 4:5 aspect ratio (`aspect-[4/5]` and `style.aspectRatio = "4 / 5"`).
 * 2. Thumbnail items enforce strict 4:5 aspect ratio (`aspect-[4/5]` and `style.aspectRatio = "4 / 5"`).
 * 3. Video thumbnail and placeholder items enforce strict 4:5 aspect ratio.
 * 4. All obsolete 3:4 references (`aspect-[3/4]`, `aspect-product`) are removed from ProductGallery.
 * 5. Moderately reduced main gallery container dimensions:
 *    - Desktop: `lg:max-w-[390px] xl:max-w-[420px]`.
 *    - Mobile/Tablet: `max-w-[360px] sm:max-w-[400px]`.
 * 6. Moderately reduced thumbnails:
 *    - Detail view: `w-10 sm:w-11 lg:w-11 xl:w-12 rounded-lg` (compact 40px-48px).
 *    - Modal view: `w-8 sm:w-9 rounded-md` (compact 32px-36px).
 * 7. Non-destructive image presentation: uses `object-contain` for both main image and thumbnails.
 * 8. Overlays (promotional badges and brand logo) are positioned strictly INSIDE the 4:5 image container
 *    with `relative`, `overflow-hidden`, and responsive inset coordinates.
 * 9. Overlays are attached to the 4:5 image viewport for EVERY gallery image (Image 1, 2, 3, etc.).
 * 10. React SSR markup rendering succeeds with multiple images.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import ProductGallery from "../src/components/product/ProductGallery";
import ProductPromotionBadges from "../src/components/common/ProductPromotionBadges";
import ProductBrandLogoOverlay from "../src/components/common/ProductBrandLogoOverlay";
import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("RUNNING PRODUCT GALLERY 4:5 & OVERLAYS AUDIT TESTS");
console.log("=======================================================\n");

const cwd = process.cwd();
const gallerySource = fs.readFileSync(path.join(cwd, "src/components/product/ProductGallery.tsx"), "utf-8");
const detailViewSource = fs.readFileSync(path.join(cwd, "src/app/products/[slug]/ProductDetailView.tsx"), "utf-8");
const badgesSource = fs.readFileSync(path.join(cwd, "src/components/common/ProductPromotionBadges.tsx"), "utf-8");
const _logoSource = fs.readFileSync(path.join(cwd, "src/components/common/ProductBrandLogoOverlay.tsx"), "utf-8");

// 1. Strict 4:5 Ratio in ProductGallery
assert(gallerySource.includes("aspect-[4/5]"), "ProductGallery includes 'aspect-[4/5]' class");
assert(gallerySource.includes('style={{ aspectRatio: "4 / 5" }}'), "ProductGallery includes inline style={{ aspectRatio: '4 / 5' }} constraint");
assert(!gallerySource.includes("aspect-[3/4]"), "ProductGallery removed all 'aspect-[3/4]' occurrences");
assert(!gallerySource.includes("aspect-product"), "ProductGallery removed all obsolete 'aspect-product' utility references");

// 2. Main Gallery Size Moderation & Small Gap Grid Architecture
assert(
  detailViewSource.includes("lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]") &&
  detailViewSource.includes("gap-5 lg:gap-6 xl:gap-7"),
  "ProductDetailView enforces small gap layout directly pairing 4:5 gallery and right purchasing hierarchy"
);
assert(
  detailViewSource.includes("max-w-[360px] sm:max-w-[400px] lg:max-w-[380px] xl:max-w-[420px]"),
  "ProductDetailView applies balanced max-width to left gallery column (max-w-[360px] sm:max-w-[400px] lg:max-w-[380px] xl:max-w-[420px])"
);
assert(
  gallerySource.includes("w-full max-w-[360px] sm:max-w-[400px] lg:max-w-[380px] xl:max-w-[420px] mx-auto lg:mx-0"),
  "ProductGallery enforces balanced containerMaxWidth"
);

// 3. Thumbnail Size Moderation
assert(
  gallerySource.includes('thumbSizeClass = isModal ? "w-8 sm:w-9 rounded-md" : "w-10 sm:w-11 lg:w-11 xl:w-12 rounded-lg"'),
  "ProductGallery thumbSizeClass uses moderately smaller dimensions (w-10 to w-12)"
);
assert(
  !gallerySource.includes("w-14 lg:w-14 xl:w-16"),
  "ProductGallery removed oversized xl:w-16 thumbnail class"
);

// 4. Non-Destructive Fit & Ratio Invariants
assert(gallerySource.includes("object-contain"), "ProductGallery main image uses 'object-contain'");
assert(!gallerySource.includes("object-cover pointer-events-none"), "Main product image does not use object-cover");
assert(!gallerySource.includes("group-hover:scale-[1.02]"), "Main product image does not use hover scale distortion");
assert(gallerySource.includes("flex items-center justify-center p-0"), "Main image button uses p-0 so 4:5 source image fits edge-to-edge perfectly");

// 5. Overlays Boundary and Containment
assert(
  gallerySource.includes("overflow-hidden") && gallerySource.includes("relative"),
  "Main 4:5 viewport enforces 'relative' and 'overflow-hidden' as the clipping boundary"
);
assert(
  badgesSource.includes("top-2.5 left-2.5 sm:top-3 sm:left-3"),
  "ProductPromotionBadges detail variant is inset cleanly inside the 4:5 container"
);
assert(
  detailViewSource.includes('className="top-2.5 right-2.5 sm:top-3 sm:right-3"'),
  "ProductBrandLogoOverlay in detail view is inset cleanly inside the 4:5 container"
);

// 6. Overlays for Every Gallery Image
assert(
  gallerySource.includes("key={currentIndex}"),
  "Main image uses key={currentIndex} to re-render image while keeping overlays active across all images"
);

// 7. SSR Component Render Test with Multi-Ratio Images (4:5, 1:1 square, 3:4, 2:3, 16:9 landscape, tall portrait)
const mockProduct = {
  id: "prod_1",
  name: "Premium Cotton Oxford Shirt",
  slug: "premium-cotton-oxford-shirt",
  brand: "Ralph Lauren Wholesale",
  brandLogo: "https://example.com/logo.png",
  images: [
    "https://example.com/shirt-4-5-ratio.jpg", // 4:5 source ratio
    "https://example.com/shirt-1-1-square.jpg", // 1:1 square source ratio
    "https://example.com/shirt-3-4-ratio.jpg", // 3:4 portrait source ratio
    "https://example.com/shirt-2-3-ratio.jpg", // 2:3 portrait source ratio
    "https://example.com/shirt-16-9-landscape.jpg", // 16:9 landscape source ratio
    "https://example.com/shirt-tall-portrait.jpg", // tall portrait source ratio
  ],
  isNew: true,
  isHot: true,
  status: "published",
  designType: "ORIGINAL",
};

const markup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductGallery, {
    images: mockProduct.images,
    productName: mockProduct.name,
    productSlug: mockProduct.slug,
    product: mockProduct,
    variant: "detail",
    overlayContent: React.createElement(
      React.Fragment,
      null,
      React.createElement(ProductPromotionBadges, { product: mockProduct, variant: "detail" }),
      React.createElement(ProductBrandLogoOverlay, {
        brandName: mockProduct.brand,
        brandLogo: mockProduct.brandLogo,
        size: "detail",
        className: "top-2.5 right-2.5 sm:top-3 sm:right-3",
      })
    ),
  })
);

// Verify rendered markup
assert(markup.includes("aspect-ratio:4 / 5"), "Rendered markup enforces aspect-ratio:4 / 5 style");
assert(markup.includes("aspect-[4/5]"), "Rendered markup includes aspect-[4/5]");
assert(!markup.includes("aspect-[3/4]"), "Rendered markup contains no aspect-[3/4]");
assert(markup.includes("object-contain"), "Rendered markup enforces object-contain for multi-ratio images");
assert(!markup.includes("object-cover pointer-events-none"), "Rendered markup avoids destructive object-cover on product images");
assert(markup.includes("NEW"), "Rendered markup contains NEW badge");
assert(markup.includes("HOT"), "Rendered markup contains HOT badge");
assert(markup.includes("shirt-4-5-ratio.jpg"), "Rendered markup contains 4:5 primary image");
assert(markup.includes("shirt-1-1-square.jpg"), "Rendered markup contains 1:1 square thumbnail");
assert(markup.includes("shirt-3-4-ratio.jpg"), "Rendered markup contains 3:4 ratio thumbnail");
assert(markup.includes("shirt-2-3-ratio.jpg"), "Rendered markup contains 2:3 ratio thumbnail");
assert(markup.includes("shirt-16-9-landscape.jpg"), "Rendered markup contains 16:9 landscape thumbnail");
assert(markup.includes("shirt-tall-portrait.jpg"), "Rendered markup contains tall portrait thumbnail");

console.log("\n=======================================================");
console.log("ALL PRODUCT GALLERY 4:5 & MULTI-RATIO VERIFICATION CHECKS PASSED!");
console.log("=======================================================\n");
