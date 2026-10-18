import type { Metadata } from "next";
import { SITE_CONFIG, canonicalUrl, getCanonicalBaseUrl } from "./config";
import { generateProductImageAlt } from "./images";
import { resolveProductThumbnail } from "@/lib/media";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";

/**
 * Resolves an image URL to an absolute, public HTTPS URL accessible by external
 * social media crawlers (WhatsApp, Facebook, Twitter/X, LinkedIn, Telegram, etc.)
 * without login, browser cookies, expiring tokens, or localhost/private IP bleed.
 */
export function resolveAbsolutePublicImageUrl(url?: string | null): string {
  const defaultFallback = `${getCanonicalBaseUrl()}/og-image.jpg`;
  if (!url || typeof url !== "string") {
    return defaultFallback;
  }

  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "/placeholder.jpg" ||
    trimmed.includes("placeholder") ||
    trimmed === "/storage" ||
    trimmed === "/storage/" ||
    trimmed === "storage"
  ) {
    return defaultFallback;
  }

  // Reject local browser preview data/blobs for crawler previews
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return defaultFallback;
  }

  // Canonical base origin (https://ayaanclothing.com)
  const canonicalBase = getCanonicalBaseUrl();

  // If already an absolute HTTPS external URL (CDN, S3, Unsplash)
  if (/^https:\/\/(?!localhost|127\.0\.0\.1)/i.test(trimmed)) {
    // If it points to api.ayaanclothing.com/storage or ayaanclothing.com/storage, normalize to canonicalBase/storage
    const match = trimmed.match(/^https?:\/\/(?:www\.|api\.)?ayaanclothing\.com(?:\/ayc)?\/storage\/(.+)$/i);
    if (match) {
      return `${canonicalBase}/storage/${match[1]}`;
    }
    return trimmed;
  }

  // If localhost / 127.0.0.1 with storage path, strip local host and attach canonicalBase
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/(?:ayc\/)?storage\/(.+)$/i.test(trimmed)) {
    const match = trimmed.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/(?:ayc\/)?storage\/(.+)$/i);
    return `${canonicalBase}/storage/${match![3]}`;
  }

  // Upgrade external http:// to https://
  if (/^http:\/\/(?!localhost|127\.0\.0\.1)/i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  // Relative storage paths: /storage/... or storage/...
  if (trimmed.startsWith("/storage/")) {
    return `${canonicalBase}${trimmed}`;
  }
  if (trimmed.startsWith("storage/")) {
    return `${canonicalBase}/${trimmed}`;
  }
  if (trimmed.startsWith("/ayc/storage/")) {
    return `${canonicalBase}/storage/${trimmed.slice("/ayc/storage/".length)}`;
  }

  // Known storage upload subfolders: products/..., brands/..., categories/..., etc.
  if (/^(products|brands|categories|banners|documents|branding)\//i.test(trimmed)) {
    return `${canonicalBase}/storage/${trimmed}`;
  }

  // Absolute site paths like /og-image.jpg or /images/...
  if (trimmed.startsWith("/")) {
    return `${canonicalBase}${trimmed}`;
  }

  return `${canonicalBase}/${trimmed}`;
}

/**
 * Infers valid MIME type for social preview image metadata
 */
export function inferImageMimeType(url: string): string {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  if (clean.endsWith(".svg")) return "image/svg+xml";
  if (clean.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

/**
 * Derives a clean, consistent product page title:
 * <Product Name> | <Brand> | AYAAN CLOTHING
 */
export function deriveProductTitle(product: Partial<Product | B2BProductInput>): string {
  const customTitle = product.seoTitle?.trim() || (product as any)?.seo_title?.trim();
  if (customTitle) {
    return customTitle.includes(SITE_CONFIG.name)
      ? customTitle
      : `${customTitle} | ${SITE_CONFIG.name}`;
  }

  const name = typeof product.name === "string" && product.name.trim() ? product.name.trim() : "Apparel Item";
  const rawBrand = product.brand;
  const brand = typeof rawBrand === "string"
    ? rawBrand.trim()
    : rawBrand && typeof rawBrand === "object" && "name" in rawBrand && typeof (rawBrand as any).name === "string"
    ? (rawBrand as any).name.trim()
    : "";

  if (brand && brand.toLowerCase() !== SITE_CONFIG.name.toLowerCase() && brand.toLowerCase() !== "wholesale") {
    return `${name} | ${brand} | ${SITE_CONFIG.name}`;
  }

  return `${name} | ${SITE_CONFIG.name}`;
}

/**
 * Sanitizes product SEO/OG description text to eliminate unsupported GSM claims,
 * fabricated quality phrases ("Premium 200+ GSM", "Premium export-grade"),
 * and template boilerplate while preserving genuine administrative descriptions.
 */
export function sanitizeProductDescription(text?: string | null): string {
  if (!text || typeof text !== "string") return "";
  let clean = text.trim();

  // 1. Remove legacy auto-generated template claims:
  // e.g. "Wholesale Men's Original T-Shirt by US POLO for men. Premium 200+ GSM garments manufactured for bulk B2B orders direct from Bangladesh."
  // or "Premium Fabric: Premium Cotton Single Jersey, 160-180 GSM garments manufactured for bulk B2B orders direct from Bangladesh."
  // or "Premium export-grade garments manufactured for bulk B2B orders direct from Bangladesh."
  clean = clean.replace(
    /\s*Premium\s+(?:(?:Fabric|Material|Composition)\s*:\s*)?(?:[^\.\n]*?\b\d+(?:-\d+)?\+?\s*GSM\b[^\.\n]*?)\s+garments\s+manufactured\s+for\s+bulk\s+B2B\s+orders\s+direct\s+from\s+Bangladesh\.?/gi,
    " Manufactured for bulk B2B orders direct from Bangladesh."
  );

  clean = clean.replace(
    /\s*Premium\s+export-grade\s+garments\s+manufactured\s+for\s+bulk\s+B2B\s+orders\s+direct\s+from\s+Bangladesh\.?/gi,
    " Manufactured for bulk B2B orders direct from Bangladesh."
  );

  clean = clean.replace(
    /\s*Premium\s+(?:(?:Fabric|Material|Composition)\s*:\s*)?([^\.\n]+?)\s+garments\s+manufactured\s+for\s+bulk\s+B2B\s+orders\s+direct\s+from\s+Bangladesh\.?/gi,
    (_match, p1) => {
      const stripped = p1.replace(/\b\d+(?:-\d+)?\+?\s*GSM\b/gi, "").trim();
      return stripped ? ` Available in ${stripped} for bulk B2B orders direct from Bangladesh.` : " Manufactured for bulk B2B orders direct from Bangladesh.";
    }
  );

  // 2. Remove generic "Premium 200+ GSM" or "Premium ... GSM" phrases
  clean = clean.replace(/Premium\s+\d+(?:-\d+)?\+?\s*GSM\s+garments/gi, "Garments");

  // 3. Normalize multiple whitespace and clean punctuation
  clean = clean.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").replace(/\.{2,}/g, ".").trim();

  return clean;
}

/**
 * Synthesizes a natural, high-converting B2B wholesale product description
 * Incorporates brand, category, audience, design type, and MOQ without spam or made-up claims.
 */
export function deriveProductDescription(
  product: Partial<Product | B2BProductInput>
): string {
  const seoDesc = product.seoDescription?.trim() || (product as any)?.seo_description?.trim();
  if (seoDesc) {
    const sanitized = sanitizeProductDescription(seoDesc);
    if (sanitized) return sanitized;
  }
  const shortDesc = product.shortDescription?.trim() || (product as any)?.short_description?.trim();
  if (shortDesc) {
    const sanitized = sanitizeProductDescription(shortDesc);
    if (sanitized) return sanitized;
  }
  if (product.description?.trim()) {
    // Strip HTML tags if present (e.g. <p>, <br>) and normalize whitespace
    const clean = product.description
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (clean.length > 0) {
      const sanitized = sanitizeProductDescription(clean);
      if (sanitized.length <= 160) return sanitized;
      return `${sanitized.slice(0, 157)}...`;
    }
  }

  const name = typeof product.name === "string" && product.name.trim() ? product.name.trim() : "Wholesale Apparel";
  const rawBrand = product.brand;
  const brand = typeof rawBrand === "string"
    ? rawBrand.trim()
    : rawBrand && typeof rawBrand === "object" && "name" in rawBrand && typeof (rawBrand as any).name === "string"
    ? (rawBrand as any).name.trim()
    : "";
  const brandText = brand && brand.toLowerCase() !== SITE_CONFIG.name.toLowerCase() ? ` by ${brand}` : "";
  const category = (product.categoryName?.trim() || (product as any)?.category?.trim()) || "apparel";
  const audience = product.audience ? `${product.audience.toLowerCase()} ` : "";
  const designType = product.designType ? ` (${product.designType})` : "";
  const moqText = product.moq ? ` Wholesale MOQ ${product.moq} pcs.` : "";

  return `Direct export wholesale ${name}${brandText}${designType}. Bulk ${audience}${category} manufactured in Bangladesh direct for B2B buyers.${moqText}`.slice(
    0,
    160
  );
}

/**
 * Resolves the clean, absolute canonical product URL.
 * Strips tracking parameters, temporary tokens, and hashes.
 */
export function getCanonicalProductUrl(
  product?: { slug?: string | null } | null,
  fallbackSlug?: string
): string {
  const targetSlug = product?.slug || fallbackSlug || "";
  return canonicalUrl(`/products/${targetSlug}`);
}

/**
 * Generates comprehensive Next.js dynamic metadata for product pages
 */
export function generateProductMetadata(
  product: B2BProductInput | Product | null,
  slug: string
): Metadata {
  const canonical = getCanonicalProductUrl(product, slug);
  const fallbackImage = `${getCanonicalBaseUrl()}/og-image.jpg`;

  if (!product) {
    const notFoundTitle = `Product Not Found | ${SITE_CONFIG.name}`;
    return {
      title: {
        absolute: notFoundTitle,
      },
      description: "The requested apparel catalog item could not be found.",
      alternates: {
        canonical,
      },
      openGraph: {
        title: "Product Not Found",
        description: "The requested apparel catalog item could not be found.",
        url: canonical,
        siteName: SITE_CONFIG.name,
        locale: SITE_CONFIG.locale,
        type: "website",
        images: [
          {
            url: fallbackImage,
            width: 1200,
            height: 630,
            type: "image/jpeg",
            alt: `Product Not Found | ${SITE_CONFIG.name}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Product Not Found",
        description: "The requested apparel catalog item could not be found.",
        images: [fallbackImage],
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const seoTitle = deriveProductTitle(product);
  const ogTitle = typeof product.name === "string" && product.name.trim() ? product.name.trim() : seoTitle;
  const description = deriveProductDescription(product);

  // Authoritatively resolve primary product thumbnail using all available fields
  const resolvedThumb = resolveProductThumbnail(product);
  const primaryImage = resolveAbsolutePublicImageUrl(resolvedThumb);
  const imageAlt = generateProductImageAlt(product, 0);
  const isFallback = primaryImage.includes("og-image.jpg");
  const imageWidth = isFallback ? 1200 : 800;
  const imageHeight = isFallback ? 630 : 1000;
  const imageMime = inferImageMimeType(primaryImage);

  return {
    // title: { absolute: ... } ensures root layout's template "%s | Ayaan Clothing" does not duplicate the brand
    title: {
      absolute: seoTitle,
    },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: "website",
      images: [
        {
          url: primaryImage,
          width: imageWidth,
          height: imageHeight,
          type: imageMime,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
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
