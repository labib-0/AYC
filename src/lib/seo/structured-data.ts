import { SITE_CONFIG, absoluteUrl, canonicalUrl } from "./config";
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
 * Uses authoritative product data without fabricating reviews, ratings, or GTINs.
 * Correctly computes AggregateOffer when wholesale volume pricing tiers exist.
 */
export function generateProductJsonLd(product: B2BProductInput | Product) {
  const url = canonicalUrl(`/products/${product.slug}`);
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map((img) => (img.startsWith("http") ? img : absoluteUrl(img)))
    : [SITE_CONFIG.ogImage];

  const prodObj = product as unknown as Record<string, unknown>;

  // Collect authoritative customer-visible commercial prices (NEVER internal cost/purchase price)
  const commercialPrices: number[] = [];
  const addPriceIfValid = (val: unknown) => {
    if (typeof val === "number" && !isNaN(val) && val > 0) {
      commercialPrices.push(val);
    } else if (typeof val === "string") {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        commercialPrices.push(parsed);
      }
    }
  };

  addPriceIfValid(product.standardPrice);
  addPriceIfValid(product.wholesalePrice);
  addPriceIfValid(prodObj.price);
  addPriceIfValid(product.bulkPrice);
  addPriceIfValid(product.fullStockPrice);

  if (Array.isArray(prodObj.pricingTiers)) {
    for (const tier of prodObj.pricingTiers as Array<{ unit_price?: number }>) {
      addPriceIfValid(tier?.unit_price);
    }
  }

  const uniquePrices = Array.from(new Set(commercialPrices)).sort((a, b) => a - b);

  // Authoritative availability calculation (InStock, OutOfStock, PreOrder)
  const stockCount = typeof prodObj.availableStock === "number"
    ? (prodObj.availableStock as number)
    : typeof prodObj.stock === "number"
    ? (prodObj.stock as number)
    : 0;

  const isPreOrder = Boolean(
    prodObj.isPreorder ||
    prodObj.isPreOrder ||
    prodObj.is_preorder ||
    prodObj.allow_preorder ||
    product.status === ("preorder" as any)
  );

  const isOutOfStock = stockCount <= 0 || product.status === ("out_of_stock" as any);

  let availability = "https://schema.org/InStock";
  if (isPreOrder) {
    availability = "https://schema.org/PreOrder";
  } else if (isOutOfStock) {
    availability = "https://schema.org/OutOfStock";
  }

  const description =
    product.description ||
    product.shortDescription ||
    `${product.name} wholesale apparel by ${product.brand || "Ayaan Clothing"}. Direct export from Bangladesh.`;

  // Build Offer or AggregateOffer
  let offers: Record<string, unknown> | undefined = undefined;
  if (uniquePrices.length > 1) {
    offers = {
      "@type": "AggregateOffer",
      url,
      priceCurrency: SITE_CONFIG.currency,
      lowPrice: uniquePrices[0].toFixed(2),
      highPrice: uniquePrices[uniquePrices.length - 1].toFixed(2),
      offerCount: uniquePrices.length,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability,
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
      },
    };
  } else if (uniquePrices.length === 1) {
    offers = {
      "@type": "Offer",
      url,
      priceCurrency: SITE_CONFIG.currency,
      price: uniquePrices[0].toFixed(2),
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability,
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
      },
    };
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: description.slice(0, 5000),
    url,
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_CONFIG.name,
    },
    category: product.categoryName || "Apparel",
  };

  if (offers) {
    schema.offers = offers;
  }

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
