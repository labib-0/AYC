/**
 * Deterministic B2B Product SEO Generation Utility
 * Generates initial default SEO Title, Meta Description, and SEO Keywords
 * from basic product attributes without external AI dependencies.
 */

export interface ProductSeoGenerationInput {
  name?: string;
  brand?: string;
  brandName?: string;
  category?: string;
  categoryName?: string;
  audience?: string;
  designType?: string;
  material?: string;
  colourDescription?: string;
  sizeDescription?: string;
}

export interface GeneratedProductSeo {
  seoTitle: string;
  seo_title: string;
  seoDescription: string;
  seo_description: string;
  metaDescription: string;
  meta_description: string;
  keywords: string[];
  seoKeywords: string[];
  seo_keywords: string[];
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "is", "it", "this", "that", "item", "product", "quality", "ready", "made", "etc"
]);

/**
 * Clean and truncate string cleanly at a word boundary
 */
function truncateAtWordBoundary(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const sub = str.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.7) {
    return sub.slice(0, lastSpace).trim();
  }
  return sub.trim();
}

/**
 * Clean raw fabric/material attribute to extract genuine composition
 * Strips technical prefix labels, unsupported GSM claims, and generic quality fluff.
 */
export function extractCleanFabricComposition(rawMaterial?: string | null): string {
  if (!rawMaterial || typeof rawMaterial !== "string") return "";
  let text = rawMaterial.trim();

  // Strip prefixes like "Fabric / Composition:", "Fabric:", "Material:", "Shell:", etc.
  text = text.replace(/^(?:fabric\s*(?:\/|\&)\s*composition|fabric|composition|material|shell|lining)\s*:\s*/i, "").trim();

  // Strip GSM claims e.g. "200+ GSM", "160-180 GSM", "280 gsm", "GSM: 280", etc.
  text = text.replace(/,?\s*(?:gsm\s*:?\s*)?\b\d+(?:-\d+)?\+?\s*gsm\b/gi, "").trim();
  text = text.replace(/\b\d+(?:-\d+)?\+?\s*gsm\b/gi, "").trim();

  // Strip dangling punctuation
  text = text.replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "").trim();

  // If the result is just a generic quality fluff word, discard
  if (/^(?:export-grade|premium|high-quality|n\/a|none|standard)$/i.test(text)) {
    return "";
  }

  return text;
}

/**
 * Generates deterministic SEO attributes from entered basic product information.
 * Used exclusively as an initial default in product creation.
 */
export function generateDeterministicProductSeo(
  input: ProductSeoGenerationInput
): GeneratedProductSeo {
  const name = (input.name || "").trim();
  if (!name) {
    return {
      seoTitle: "",
      seo_title: "",
      seoDescription: "",
      seo_description: "",
      metaDescription: "",
      meta_description: "",
      keywords: [],
      seoKeywords: [],
      seo_keywords: [],
    };
  }

  const brand = (input.brand || input.brandName || "").trim();
  const category = (input.categoryName || input.category || "").trim();
  const audience = (input.audience || "").trim();
  const material = (input.material || "").trim();
  const designType = (input.designType || "").trim();

  // 1. SEO Page Title (targeted <= 60 characters for SERP display)
  let baseTitle = "";
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    baseTitle = `${name} | ${brand}`;
  } else {
    baseTitle = name;
  }

  let seoTitle = `${baseTitle} | B2B Wholesale`;
  if (seoTitle.length > 60) {
    seoTitle = baseTitle;
  }
  if (seoTitle.length > 60) {
    seoTitle = truncateAtWordBoundary(seoTitle, 60);
  }

  // 2. Meta Description (strictly supported specifications, no GSM invention, <= 160 characters)
  const brandSuffix = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? ` by ${brand}` : "";
  const audienceText = audience && audience !== "UNISEX" ? ` for ${audience.toLowerCase()}` : "";
  const cleanMat = extractCleanFabricComposition(material);

  let seoDesc = cleanMat
    ? `Wholesale ${name}${brandSuffix}${audienceText}. Available in ${cleanMat} for bulk B2B orders direct from Bangladesh.`
    : `Wholesale ${name}${brandSuffix}${audienceText}. Manufactured for bulk B2B orders direct from Bangladesh.`;

  if (seoDesc.length > 160) {
    seoDesc = truncateAtWordBoundary(seoDesc, 157) + "...";
  }

  // 3. Meaningful SEO Keywords List (5-8 unique relevant terms)
  const keywordSet = new Set<string>();

  // Full clean name as primary phrase
  const cleanNameLower = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (cleanNameLower.length >= 3) {
    keywordSet.add(cleanNameLower);
  }

  // Brand keyword
  if (brand && brand.toLowerCase() !== "ayaan") {
    keywordSet.add(brand.toLowerCase());
  }

  // Category keyword & wholesale category
  if (category) {
    const cleanCat = category.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
    if (cleanCat && cleanCat !== "garments" && cleanCat !== "apparel") {
      keywordSet.add(cleanCat);
      keywordSet.add(`wholesale ${cleanCat}`);
    }
  }

  // Audience context
  if (audience && audience !== "UNISEX") {
    keywordSet.add(`${audience.toLowerCase()} apparel`);
  }

  // Material context (strictly genuine fabric, never GSM or quality claims)
  if (cleanMat && cleanMat.toLowerCase() !== "100% cotton") {
    const cleanMatLower = cleanMat.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
    if (cleanMatLower.length >= 3 && !cleanMatLower.includes("gsm")) {
      keywordSet.add(cleanMatLower);
    }
  }

  // Design Type context if relevant
  if (designType === "MASTER COPY") {
    keywordSet.add("master copy apparel");
  }

  // General B2B wholesale phrases
  keywordSet.add("wholesale apparel");
  keywordSet.add("bangladesh garments");

  // Extract key 2-word combinations from product name
  const nameWords = cleanNameLower.split(" ").filter(w => w.length > 2 && !STOP_WORDS.has(w));
  if (nameWords.length >= 2) {
    const twoWordPhrase = nameWords.slice(0, 2).join(" ");
    keywordSet.add(twoWordPhrase);
    keywordSet.add(`wholesale ${twoWordPhrase}`);
  }

  const keywords = Array.from(keywordSet).filter(k => Boolean(k && k.trim())).slice(0, 8);

  return {
    seoTitle,
    seo_title: seoTitle,
    seoDescription: seoDesc,
    seo_description: seoDesc,
    metaDescription: seoDesc,
    meta_description: seoDesc,
    keywords,
    seoKeywords: keywords,
    seo_keywords: keywords,
  };
}
