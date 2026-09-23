import { SITE_CONFIG, absoluteUrl } from "./config";
import { BreadcrumbItem } from "./breadcrumbs";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";

/**
 * Generates Schema.org Organization structured data
 */
export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    alternateName: SITE_CONFIG.brandMark,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.png`,
    description: SITE_CONFIG.description,
    foundingDate: SITE_CONFIG.foundingDate,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.address.streetAddress,
      addressLocality: SITE_CONFIG.address.addressLocality,
      postalCode: SITE_CONFIG.address.postalCode,
      addressCountry: SITE_CONFIG.address.addressCountry,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_CONFIG.contact.phone,
      contactType: "sales",
      availableLanguage: ["English", "Bengali"],
    },
    sameAs: [
      SITE_CONFIG.social.facebook,
      SITE_CONFIG.social.linkedin,
      SITE_CONFIG.social.instagram,
    ].filter(Boolean),
  };
}

/**
 * Generates Schema.org WebSite structured data with SearchAction
 */
export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/search?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generates Schema.org BreadcrumbList structured data
 */
export function generateBreadcrumbJsonLd(breadcrumbs: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b) => ({
      "@type": "ListItem",
      position: b.position,
      name: b.name,
      item: b.url,
    })),
  };
}

/**
 * Generates Schema.org Product structured data (Merchant Listing & Product Snippet compliant)
 * Uses actual product data without fabricating reviews, ratings, or GTINs.
 */
export function generateProductJsonLd(product: B2BProductInput | Product) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map((img) => (img.startsWith("http") ? img : absoluteUrl(img)))
    : [SITE_CONFIG.ogImage];

  const prodObj = product as unknown as Record<string, unknown>;
  const rawPrice = product.wholesalePrice ?? (prodObj.price as number | undefined) ?? 15;
  const price = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice)) || 15;

  let inStock = true;
  if (typeof prodObj.stock === "number") {
    inStock = (prodObj.stock as number) > 0;
  } else if (typeof prodObj.availableStock === "number") {
    inStock = (prodObj.availableStock as number) > 0;
  }

  const description =
    product.description ||
    product.shortDescription ||
    `${product.name} wholesale apparel by ${product.brand || "Ayaan Clothing"}. Direct export from Bangladesh.`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: description.slice(0, 5000),
    url: url,
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_CONFIG.name,
    },
    category: product.categoryName || "Apparel",
    offers: {
      "@type": "Offer",
      url: url,
      priceCurrency: SITE_CONFIG.currency,
      price: price.toFixed(2),
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
      },
    },
  };

  if (product.sku) {
    schema.sku = product.sku;
  }

  if (product.material) {
    schema.material = product.material;
  }

  const colorVal = product.color || product.colorName;
  if (colorVal) {
    schema.color = colorVal;
  }

  // Keywords used as structured data input (Schema.org keywords property)
  if (product.keywords && Array.isArray(product.keywords) && product.keywords.length > 0) {
    schema.keywords = product.keywords.join(", ");
  }

  return schema;
}
