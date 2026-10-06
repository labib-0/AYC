import type { Metadata } from "next";
import { SITE_CONFIG, absoluteUrl, canonicalUrl } from "./config";
import { generateProductImageAlt } from "./images";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";

/**
 * Derives a clean, consistent product page title:
 * <Product Name> | <Brand> | AYAAN CLOTHING
 */
export function deriveProductTitle(product: Partial<Product | B2BProductInput>): string {
  const customTitle = product.seoTitle?.trim();
  if (customTitle) {
    return customTitle.includes(SITE_CONFIG.name)
      ? customTitle
      : `${customTitle} | ${SITE_CONFIG.name}`;
  }

  const name = typeof product.name === "string" ? product.name.trim() : "Apparel Item";
  const rawBrand = product.brand;
  const brand = typeof rawBrand === "string"
    ? rawBrand.trim()
    : rawBrand && typeof rawBrand === "object" && "name" in rawBrand && typeof (rawBrand as any).name === "string"
    ? (rawBrand as any).name.trim()
    : "Wholesale";

  return `${name} | ${brand} | ${SITE_CONFIG.name}`;
}

/**
 * Synthesizes a natural, high-converting B2B wholesale product description
 * Incorporates brand, category, audience, design type, and keyword context without spam.
 */
export function deriveProductDescription(
  product: Partial<Product | B2BProductInput>
): string {
  if (product.seoDescription?.trim()) {
    return product.seoDescription.trim();
  }
  if (product.shortDescription?.trim()) {
    return product.shortDescription.trim();
  }
  if (product.description?.trim()) {
    const clean = product.description.replace(/\s+/g, " ").trim();
    if (clean.length <= 160) return clean;
    return `${clean.slice(0, 157)}...`;
  }

  const name = typeof product.name === "string" ? product.name.trim() : "Apparel Item";
  const rawBrand = product.brand;
  const brand = typeof rawBrand === "string"
    ? rawBrand.trim()
    : rawBrand && typeof rawBrand === "object" && "name" in rawBrand && typeof (rawBrand as any).name === "string"
    ? (rawBrand as any).name.trim()
    : "Ayaan Clothing";
  const category = product.categoryName?.trim() || "garments";
  const audience = product.audience ? `${product.audience.toLowerCase()} ` : "";
  const designType = product.designType ? ` (${product.designType})` : "";
  const moqText = product.moq ? ` MOQ ${product.moq} pcs.` : "";

  // Incorporate first primary keyword if naturally available
  const keywordHint =
    product.keywords && product.keywords.length > 0
      ? ` Ideal for ${product.keywords[0]}.`
      : "";

  return `Direct export wholesale ${name} by ${brand}${designType}. Premium ${audience}${category} sourcing manufactured in Bangladesh with global export standards.${moqText}${keywordHint}`.slice(
    0,
    160
  );
}

/**
 * Generates comprehensive Next.js dynamic metadata for product pages
 */
export function generateProductMetadata(
  product: B2BProductInput | Product | null,
  slug: string
): Metadata {
  if (!product) {
    return {
      title: `Product Not Found | ${SITE_CONFIG.name}`,
      description: "The requested apparel catalog item could not be found.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = deriveProductTitle(product);
  const description = deriveProductDescription(product);
  const canonical = canonicalUrl(`/products/${product.slug || slug}`);
  const primaryImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0].startsWith("http")
        ? product.images[0]
        : absoluteUrl(product.images[0])
      : SITE_CONFIG.ogImage;

  const imageAlt = generateProductImageAlt(product, 0);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: "website",
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 1000,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [primaryImage],
    },
    robots: {
      index: product.status !== "draft" && product.status !== "unpublished",
      follow: true,
      googleBot: {
        index: product.status !== "draft" && product.status !== "unpublished",
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
