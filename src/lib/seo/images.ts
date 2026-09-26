import { Product } from "@/types";
import { B2BProductInput } from "@/types/b2b";

/**
 * Generates natural, descriptive image alt text for eCommerce products
 * Avoids keyword stuffing while providing rich context for search engine crawlers and screen readers.
 */
export function generateProductImageAlt(
  product: Partial<Product | B2BProductInput> & { brand?: any; category?: any },
  imageIndex: number = 0
): string {
  const name = typeof product.name === "string" ? product.name.trim() : "Apparel Item";
  
  const rawBrand = product.brand;
  const brand = typeof rawBrand === "string"
    ? rawBrand.trim()
    : rawBrand && typeof rawBrand === "object" && "name" in rawBrand && typeof rawBrand.name === "string"
    ? rawBrand.name.trim()
    : "Ayaan Clothing";

  const rawCat = product.categoryName || (product as any).category;
  const category = typeof rawCat === "string"
    ? rawCat.trim()
    : rawCat && typeof rawCat === "object" && "name" in rawCat && typeof rawCat.name === "string"
    ? rawCat.name.trim()
    : "Apparel";

  const audience = typeof product.audience === "string" && product.audience
    ? `${product.audience.toLowerCase()}'s`
    : "";

  const viewSuffix =
    imageIndex === 0
      ? "— Main View"
      : imageIndex === 1
      ? "— Detail View"
      : `— Angle ${imageIndex + 1}`;

  const baseText = audience
    ? `${brand} ${audience} ${name} (${category}) ${viewSuffix}`
    : `${brand} ${name} (${category}) ${viewSuffix}`;

  return baseText.replace(/\s+/g, " ").trim();
}

/**
 * Generates descriptive alt text for brand logos
 */
export function generateBrandLogoAlt(brandName: string): string {
  return `${brandName} official brand logo — Ayaan Clothing Wholesale Partner`;
}

/**
 * Generates descriptive alt text for category tiles
 */
export function generateCategoryAlt(categoryName: string): string {
  return `Wholesale ${categoryName} catalog collection from Bangladesh manufacturer`;
}
