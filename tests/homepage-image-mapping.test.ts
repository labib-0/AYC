import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProductThumbnail, normalizeImageUrl } from "../src/lib/media";
import { resolveCategoryImageUrl, CANONICAL_CATEGORY_IMAGES, DEFAULT_CATEGORY_FALLBACK } from "../src/lib/category-images";
import { getBrandLogoUrl } from "../src/lib/brand-logos";

describe("Homepage Image Mapping & Canonical Resolver Verification", () => {
  describe("Product Thumbnail Resolution (resolveProductThumbnail)", () => {
    it("resolves primary_image_url when explicitly provided", () => {
      const product = {
        id: 101,
        name: "Ladies' Short Sleeve Midi Dress",
        primary_image_url: "https://images.unsplash.com/photo-dress-1?auto=format",
        images: [
          { id: 1, image_url: "https://images.unsplash.com/photo-dress-gallery" }
        ]
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, "https://images.unsplash.com/photo-dress-1?auto=format");
    });

    it("prioritizes marked is_primary image from images relationship when primary_image_url is missing", () => {
      const product = {
        id: 102,
        name: "Men's Joggers Trouser",
        images: [
          { id: 10, image_url: "https://images.unsplash.com/photo-joggers-back", is_primary: false, sort_order: 1 },
          { id: 11, image_url: "https://images.unsplash.com/photo-joggers-front", is_primary: true, sort_order: 2 }
        ]
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, "https://images.unsplash.com/photo-joggers-front");
    });

    it("falls back to first image in images array when is_primary is not flagged", () => {
      const product = {
        id: 103,
        name: "Men's Heavyweight Pullover Hoodie",
        images: [
          { id: 20, image_url: "https://images.unsplash.com/photo-hoodie-main", sort_order: 0 },
          { id: 21, image_url: "https://images.unsplash.com/photo-hoodie-detail", sort_order: 1 }
        ]
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, "https://images.unsplash.com/photo-hoodie-main");
    });

    it("resolves string array images correctly (e.g. from storefront or catalog search)", () => {
      const product = {
        id: 104,
        name: "Boys Short Sleeve Drop Shoulder T-Shirt",
        images: [
          "https://images.pexels.com/photos/tee-boy-1.jpg",
          "https://images.pexels.com/photos/tee-boy-2.jpg"
        ]
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, "https://images.pexels.com/photos/tee-boy-1.jpg");
    });

    it("resolves primaryImage relation object", () => {
      const product = {
        id: 105,
        name: "Boy's Micro Shorts",
        primaryImage: {
          id: 55,
          image_url: "https://images.unsplash.com/photo-shorts.jpg"
        }
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, "https://images.unsplash.com/photo-shorts.jpg");
    });

    it("normalizes raw storage paths for product thumbnails", () => {
      const product = {
        id: 106,
        name: "Custom Export Polo",
        primary_image_url: "products/polo-export.jpg"
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, "/storage/products/polo-export.jpg");
    });

    it("returns null instead of /placeholder.jpg when product has no image", () => {
      const product = {
        id: 107,
        name: "Unassigned Sample Garment",
        images: []
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, null, "Must return null so the UI can render the neutral Package icon");
    });

    it("filters out generic /placeholder.jpg if present in images and returns null if no valid image exists", () => {
      const product = {
        id: 108,
        name: "Product with placeholder only",
        primary_image_url: "/placeholder.jpg",
        images: ["/placeholder.jpg"]
      };
      const result = resolveProductThumbnail(product);
      assert.equal(result, null, "Must ignore placeholder.jpg and return null");
    });

    it("returns null safely for null or undefined input", () => {
      assert.equal(resolveProductThumbnail(null), null);
      assert.equal(resolveProductThumbnail(undefined), null);
    });
  });

  describe("Category Image Resolution (resolveCategoryImageUrl)", () => {
    it("returns configured category image_url when available", () => {
      const configuredUrl = "https://images.pexels.com/photos/custom-beachwear.jpg";
      const result = resolveCategoryImageUrl(configuredUrl, "beachwear");
      assert.equal(result, configuredUrl);
    });

    it("resolves approved canonical category image for standard categories without explicit image", () => {
      const poloResult = resolveCategoryImageUrl(null, "polo-shirts");
      assert.equal(poloResult, CANONICAL_CATEGORY_IMAGES["polo-shirts"]);

      const hoodieResult = resolveCategoryImageUrl(null, "hoodies");
      assert.equal(hoodieResult, CANONICAL_CATEGORY_IMAGES["hoodies"]);

      const jacketResult = resolveCategoryImageUrl(null, "jackets");
      assert.equal(jacketResult, CANONICAL_CATEGORY_IMAGES["jackets"]);
    });

    it("returns null (neutral no-image state) for unknown category rather than sweater fallback", () => {
      const unknownResult = resolveCategoryImageUrl(null, "industrial-uniforms-custom");
      assert.equal(
        unknownResult,
        null,
        "Unknown category must return null to allow neutral <Layers /> icon rather than sweater photograph"
      );
    });

    it("ignores erroneously stored DEFAULT_CATEGORY_FALLBACK and resolves canonical or null", () => {
      // If a category had the sweater photo erroneously saved as its image_url
      const tshirtsWithSweater = resolveCategoryImageUrl(DEFAULT_CATEGORY_FALLBACK, "t-shirts");
      assert.equal(
        tshirtsWithSweater,
        CANONICAL_CATEGORY_IMAGES["t-shirts"],
        "Should ignore erroneous sweater fallback and use canonical t-shirts image"
      );

      const unknownWithSweater = resolveCategoryImageUrl(DEFAULT_CATEGORY_FALLBACK, "completely-unknown-category");
      assert.equal(
        unknownWithSweater,
        null,
        "Should ignore erroneous sweater fallback and return null for unknown category"
      );
    });
  });

  describe("Brand Logo Resolution (getBrandLogoUrl)", () => {
    it("preserves authoritative admin-uploaded brand logo", () => {
      const uploaded = "https://cdn.ayaanclothing.com/logos/custom-brand.png";
      const result = getBrandLogoUrl("Custom Brand", uploaded);
      assert.equal(result, uploaded);
    });

    it("resolves canonical SVG brand logo for known brands without uploaded logo", () => {
      assert.equal(getBrandLogoUrl("Nike", null), "/brands/nike.svg");
      assert.equal(getBrandLogoUrl("Adidas", null), "/brands/adidas.svg");
      assert.equal(getBrandLogoUrl("Levi's", null), "/brands/levis.svg");
      assert.equal(getBrandLogoUrl("Zara", null), "/brands/zara.svg");
    });

    it("returns null for unknown brand with no logo (allows neutral Tags icon)", () => {
      const result = getBrandLogoUrl("Unregistered Generic Supplier", null);
      assert.equal(result, null, "Must return null so neutral Tags icon is rendered");
    });
  });
});
