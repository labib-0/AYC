import { absoluteUrl } from "./config";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

/**
 * Builds standard hierarchical breadcrumbs for a product:
 * Home → Catalog → [Audience] → [Category] → [Brand] → Product
 */
export function buildProductBreadcrumbs(
  product: Partial<Product | B2BProductInput>
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    {
      name: "Home",
      url: absoluteUrl("/"),
      position: 1,
    },
    {
      name: "Catalog",
      url: absoluteUrl("/search"),
      position: 2,
    },
  ];

  let currentPos = 3;

  if (product.audience) {
    const audUpper = String(product.audience).toUpperCase();
    items.push({
      name: audUpper.charAt(0) + audUpper.slice(1).toLowerCase(),
      url: absoluteUrl(`/search?audience=${encodeURIComponent(audUpper)}`),
      position: currentPos++,
    });
  }

  if (product.categoryName && product.categoryName !== "Apparel") {
    items.push({
      name: product.categoryName,
      url: absoluteUrl(`/search?category=${encodeURIComponent(product.categoryName)}`),
      position: currentPos++,
    });
  }

  if (product.brand && product.brand !== "Ayaan") {
    items.push({
      name: product.brand,
      url: absoluteUrl(`/search?brand=${encodeURIComponent(product.brand)}`),
      position: currentPos++,
    });
  }

  if (product.name && product.slug) {
    items.push({
      name: product.name,
      url: absoluteUrl(`/products/${product.slug}`),
      position: currentPos,
    });
  }

  return items;
}

/**
 * Builds breadcrumbs for a category search page
 */
export function buildCategoryBreadcrumbs(categoryName: string): BreadcrumbItem[] {
  return [
    {
      name: "Home",
      url: absoluteUrl("/"),
      position: 1,
    },
    {
      name: "Catalog",
      url: absoluteUrl("/search"),
      position: 2,
    },
    {
      name: `${categoryName} Wholesale`,
      url: absoluteUrl(`/search?category=${encodeURIComponent(categoryName)}`),
      position: 3,
    },
  ];
}

/**
 * Builds breadcrumbs for a brand search page
 */
export function buildBrandBreadcrumbs(brandName: string): BreadcrumbItem[] {
  return [
    {
      name: "Home",
      url: absoluteUrl("/"),
      position: 1,
    },
    {
      name: "Catalog",
      url: absoluteUrl("/search"),
      position: 2,
    },
    {
      name: `${brandName} Collection`,
      url: absoluteUrl(`/search?brand=${encodeURIComponent(brandName)}`),
      position: 3,
    },
  ];
}
