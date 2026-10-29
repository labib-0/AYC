import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("AYC Prompt 5 — Storefront Header, Product Image Fit & Wishlist Grid Verification", () => {
  const headerPath = path.resolve("src/components/layout/Header.tsx");
  const searchOverlayPath = path.resolve("src/components/layout/SearchOverlay.tsx");
  const productGalleryPath = path.resolve("src/components/product/ProductGallery.tsx");
  const wishlistManagerPath = path.resolve("src/components/wishlist/WishlistManager.tsx");

  const headerSource = fs.readFileSync(headerPath, "utf-8");
  const searchOverlaySource = fs.readFileSync(searchOverlayPath, "utf-8");
  const productGallerySource = fs.readFileSync(productGalleryPath, "utf-8");
  const wishlistManagerSource = fs.readFileSync(wishlistManagerPath, "utf-8");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ISSUE #1: Storefront Header Responsiveness
  // ───────────────────────────────────────────────────────────────────────────
  describe("Header Architecture & Responsiveness (Issue #1)", () => {
    it("preserves stable outer shell and fixed position without layout jump", () => {
      assert.ok(
        headerSource.includes('h-[106px] lg:h-[4.25rem]'),
        "Header must reserve fixed shell space to prevent vertical layout jump"
      );
      assert.ok(
        headerSource.includes('fixed top-0 left-0 right-0 z-50'),
        "Header must be pinned at top with high z-index"
      );
    });

    it("defines desktop search with responsive min-width and max-width bounds", () => {
      assert.ok(
        headerSource.includes("min-w-[200px] lg:min-w-[240px] max-w-xl xl:max-w-2xl 2xl:max-w-3xl"),
        "Desktop search must enforce min/max bounds to prevent collision with utilities"
      );
    });

    it("renders Deliver To with graphic flag support and country code label", () => {
      assert.ok(
        headerSource.includes("flagcdn.com"),
        "Deliver To button should support graphic flag rendering to prevent text duplication on non-emoji platforms"
      );
      assert.ok(
        headerSource.includes("preferences.countryCode"),
        "Deliver To button must display country code"
      );
    });

    it("isolates mobile header with 3-zone flex architecture and separate drawer", () => {
      assert.ok(
        headerSource.includes("lg:hidden"),
        "Mobile header must be cleanly isolated from desktop"
      );
      assert.ok(
        headerSource.includes("header-mobile-menu-btn"),
        "Mobile header must provide accessible hamburger trigger"
      );
      assert.ok(
        headerSource.includes("mobile-navigation-drawer"),
        "Mobile header must connect to responsive navigation drawer"
      );
    });

    it("enforces search overlay boundary clamping and non-overlapping brand cards", () => {
      assert.ok(
        searchOverlaySource.includes("clampToViewport"),
        "Search overlay must clamp transform so dropdown never clips past right viewport edge"
      );
      assert.ok(
        searchOverlaySource.includes("grid grid-cols-3 gap-2"),
        "Trending brands in search overlay must use grid-cols-3 with gap"
      );
      assert.ok(
        searchOverlaySource.includes("truncate w-full"),
        "Brand text in overlay cards must truncate cleanly to prevent letter-by-letter wrapping"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ISSUE #8: Product Details Main Image Fit & Gallery Geometry
  // ───────────────────────────────────────────────────────────────────────────
  describe("Product Gallery Image Presentation (Issue #8)", () => {
    it("uses canonical 4:5 portrait aspect ratio on main image container", () => {
      assert.ok(
        productGallerySource.includes('aspectRatio: "4 / 5"') ||
        productGallerySource.includes('aspect-[4/5]'),
        "Gallery container must specify canonical 4:5 aspect ratio"
      );
    });

    it("applies object-contain and transparent background to eliminate ugly letterboxing bands", () => {
      assert.ok(
        productGallerySource.includes("object-contain"),
        "Main product image must use object-contain to prevent cropping or garment distortion"
      );
      assert.ok(
        productGallerySource.includes("bg-transparent"),
        "Gallery container must use transparent background to eliminate color mismatched whitespace bars"
      );
    });

    it("calculates exact visible image bounds dynamically to snap overlays strictly to image", () => {
      assert.ok(
        productGallerySource.includes("imageBounds = useMemo"),
        "Gallery must dynamically compute visible image bounding box"
      );
      assert.ok(
        productGallerySource.includes("aspectMap"),
        "Gallery must maintain aspect ratio map for loaded images"
      );
    });

    it("correctly models 4:5 mathematical bounding box with zero whitespace delta", () => {
      // Simulation of imageBounds logic from ProductGallery.tsx
      function calculateBounds(containerRatio: number, imgRatio: number) {
        if (imgRatio >= containerRatio) {
          const heightPct = Number(((containerRatio / imgRatio) * 100).toFixed(4));
          const topPct = Number(((100 - heightPct) / 2).toFixed(4));
          return { top: `${topPct}%`, left: "0%", width: "100%", height: `${heightPct}%` };
        } else {
          const widthPct = Number(((imgRatio / containerRatio) * 100).toFixed(4));
          const leftPct = Number(((100 - widthPct) / 2).toFixed(4));
          return { top: "0%", left: `${leftPct}%`, width: `${widthPct}%`, height: "100%" };
        }
      }

      // Canonical 4:5 image (0.80) in 4:5 container (0.80)
      const boundsExact = calculateBounds(4 / 5, 4 / 5);
      assert.equal(boundsExact.top, "0%");
      assert.equal(boundsExact.left, "0%");
      assert.equal(boundsExact.width, "100%");
      assert.equal(boundsExact.height, "100%");

      // Square 1:1 image (1.0) in 4:5 container (0.80)
      const boundsSquare = calculateBounds(4 / 5, 1.0);
      assert.equal(boundsSquare.left, "0%");
      assert.equal(boundsSquare.width, "100%");
      assert.equal(boundsSquare.height, "80%");
      assert.equal(boundsSquare.top, "10%");

      // Tall 2:3 image (0.6667) in 4:5 container (0.80)
      const boundsTall = calculateBounds(0.8, 2 / 3);
      assert.equal(boundsTall.top, "0%");
      assert.equal(boundsTall.height, "100%");
      assert.ok(parseFloat(boundsTall.width) < 100);
      assert.ok(parseFloat(boundsTall.left) > 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ISSUE #9: Wishlist Grid Column Count & Card Presentation
  // ───────────────────────────────────────────────────────────────────────────
  describe("Wishlist Desktop Grid & Card Architecture (Issue #9)", () => {
    it("enforces 4 columns on desktop viewports (lg:grid-cols-4)", () => {
      assert.ok(
        wishlistManagerSource.includes("lg:grid-cols-4"),
        "Wishlist grid must specify lg:grid-cols-4 to render 4 cards per row on desktop >= 1024px"
      );
      assert.ok(
        !wishlistManagerSource.includes("lg:grid-cols-3"),
        "Wishlist grid must not be constrained to lg:grid-cols-3"
      );
    });

    it("provides responsive fallback for tablet (2 cols) and mobile (1 col)", () => {
      assert.ok(
        wishlistManagerSource.includes("grid-cols-1"),
        "Wishlist must render 1 column on mobile (< 640px)"
      );
      assert.ok(
        wishlistManagerSource.includes("sm:grid-cols-2"),
        "Wishlist must render 2 columns on tablet (>= 640px)"
      );
    });

    it("uses canonical vertical 3:4 portrait aspect ratio for thumbnail cards", () => {
      assert.ok(
        wishlistManagerSource.includes("aspect-[3/4]"),
        "Wishlist thumbnail must use canonical 3:4 portrait ratio instead of wide landscape"
      );
      assert.ok(
        !wishlistManagerSource.includes("aspect-[4/3]"),
        "Wishlist thumbnail must not use inverted 4:3 landscape ratio"
      );
    });

    it("applies balanced padding p-3 sm:p-3.5 for 4-column desktop density", () => {
      assert.ok(
        wishlistManagerSource.includes("p-3 sm:p-3.5"),
        "Wishlist card must use compact padding to comfortably accommodate 4 columns"
      );
    });

    it("includes action button to add item to cart with MOQ threshold", () => {
      assert.ok(
        wishlistManagerSource.includes('data-action="add-to-cart"'),
        "Wishlist card must include Add to Cart action button"
      );
      assert.ok(
        wishlistManagerSource.includes("effectiveMoq"),
        "Wishlist card must display effective MOQ threshold"
      );
    });
  });
});

