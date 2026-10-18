import { absoluteUrl } from "./config";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

export interface ProductBreadcrumbTrailItem {
  label: string;
  href?: string;
  canonicalUrl: string;
  level: "catalog" | "audience" | "category" | "brand" | "product";
}

/**
 * Humanizes any raw string or slug into a clean title-cased label.
 */
export function formatBreadcrumbLabel(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (lower === "t-shirts" || lower === "t_shirts") return "T-Shirts";
  if (lower === "t-shirt" || lower === "t_shirt") return "T-Shirt";
  if (lower === "v-neck" || lower === "v_neck") return "V-Neck";
  if (lower === "mc") return "Master Copy";
  if (lower === "rfq") return "RFQ";
  if (lower === "b2b") return "B2B";

  // Replace underscores with spaces
  const cleaned = trimmed.replace(/_+/g, " ");

  // If raw lowercase kebab slug, e.g. "polo-shirts", convert to "Polo Shirts"
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(cleaned)) {
    return cleaned
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // Title-case words while preserving intentional hyphens (e.g. "T-Shirts", "Pre-Order")
  return cleaned
    .split(/\s+/)
    .map((word) => {
      const wLower = word.toLowerCase();
      if (wLower === "mc") return "Master Copy";
      if (wLower === "rfq") return "RFQ";
      if (wLower === "b2b") return "B2B";
      if (wLower === "t-shirts") return "T-Shirts";
      if (wLower === "t-shirt") return "T-Shirt";
      if (word.includes("-")) {
        return word
          .split("-")
          .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase())
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Builds standard hierarchical breadcrumbs trail for a product:
 * Catalog → Audience → Category → Brand → Product Title
 *
 * Rules:
 * 1. Order is strictly Catalog → Audience → Category → Brand → Product Title.
 * 2. Fetches taxonomy from authoritative saved data / API response.
 * 3. Never infers audience or category from product name, brand, or SKU when unavailable.
 * 4. Omits unavailable taxonomy levels without inventing placeholders or empty segments.
 * 5. Prevents duplicate segments across adjacent or ancestor levels.
 * 6. Product Title reflects current product name and is marked as current page (not clickable).
 */
export function buildProductBreadcrumbTrail(
  product: Partial<Product | B2BProductInput> | null | undefined
): ProductBreadcrumbTrailItem[] {
  if (!product) return [];

  const trail: ProductBreadcrumbTrailItem[] = [
    {
      label: "Catalog",
      href: "/search",
      canonicalUrl: absoluteUrl("/search"),
      level: "catalog",
    },
  ];

  const isDuplicate = (candidate: string) => {
    const norm = candidate.trim().toLowerCase();
    return trail.some((item) => item.label.trim().toLowerCase() === norm);
  };

  // 1. Audience (e.g. MEN, WOMEN, BOYS, GIRLS, UNISEX)
  const rawAudience = product.audience ? String(product.audience).trim() : "";
  if (rawAudience) {
    const audienceLabel = formatBreadcrumbLabel(rawAudience);
    if (audienceLabel && !isDuplicate(audienceLabel)) {
      const audParam = rawAudience.toLowerCase();
      trail.push({
        label: audienceLabel,
        href: `/search?audience=${encodeURIComponent(audParam)}`,
        canonicalUrl: absoluteUrl(`/search?audience=${encodeURIComponent(audParam)}`),
        level: "audience",
      });
    }
  }

  // 2. Category
  // Fetch from canonical category relationships or authoritative API response.
  // Rule: Do NOT infer from product name, brand, or SKU when actual value is unavailable.
  const pAny = product as any;
  const rawCategory =
    (product.categoryName && typeof product.categoryName === "string" ? product.categoryName : "") ||
    (pAny.category_name && typeof pAny.category_name === "string" ? pAny.category_name : "") ||
    (Array.isArray(pAny.categories) && pAny.categories.length > 0 && pAny.categories[0]?.name ? pAny.categories[0].name : "") ||
    (pAny.category && typeof pAny.category === "object" && pAny.category.name ? pAny.category.name : (typeof pAny.category === "string" ? pAny.category : ""));

  const trimmedCategory = rawCategory.trim();
  if (trimmedCategory) {
    const categoryLabel = formatBreadcrumbLabel(trimmedCategory);
    if (categoryLabel && !isDuplicate(categoryLabel)) {
      trail.push({
        label: categoryLabel,
        href: `/search?category=${encodeURIComponent(trimmedCategory)}`,
        canonicalUrl: absoluteUrl(`/search?category=${encodeURIComponent(trimmedCategory)}`),
        level: "category",
      });
    }
  }

  // 3. Brand
  const rawBrand =
    (product.brand && typeof product.brand === "string" ? product.brand : "") ||
    (pAny.brand_name && typeof pAny.brand_name === "string" ? pAny.brand_name : "") ||
    (product.brand && typeof product.brand === "object" && pAny.brand?.name ? pAny.brand.name : "");

  const trimmedBrand = rawBrand.trim();
  if (trimmedBrand) {
    const brandLabel = formatBreadcrumbLabel(trimmedBrand);
    if (brandLabel && !isDuplicate(brandLabel)) {
      trail.push({
        label: brandLabel,
        href: `/search?brand=${encodeURIComponent(trimmedBrand)}`,
        canonicalUrl: absoluteUrl(`/search?brand=${encodeURIComponent(trimmedBrand)}`),
        level: "brand",
      });
    }
  }

  // 4. Product Title
  const rawName = product.name ? String(product.name).trim() : "";
  if (rawName) {
    const productSlug = product.slug ? String(product.slug).trim() : "";
    const canonicalProductUrl = productSlug
      ? absoluteUrl(`/products/${productSlug}`)
      : trail[trail.length - 1].canonicalUrl;

    trail.push({
      label: rawName,
      // href is omitted because the product title represents the current page
      canonicalUrl: canonicalProductUrl,
      level: "product",
    });
  }

  return trail;
}

/**
 * Builds standard hierarchical BreadcrumbItem list for Schema.org JSON-LD
 */
export function buildProductBreadcrumbs(
  product: Partial<Product | B2BProductInput>
): BreadcrumbItem[] {
  const trail = buildProductBreadcrumbTrail(product);
  return trail.map((item, index) => ({
    name: item.label,
    url: item.canonicalUrl,
    position: index + 1,
  }));
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
