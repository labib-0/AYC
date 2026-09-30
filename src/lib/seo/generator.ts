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

  // 2. Meta Description (targeted <= 160 characters for SERP snippet)
  const brandSuffix = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? ` by ${brand}` : "";
  const audienceText = audience && audience !== "UNISEX" ? ` for ${audience.toLowerCase()}` : "";
  const matText = material ? ` ${material}` : " export-grade";

  let seoDesc = `Wholesale ${name}${brandSuffix}${audienceText}. Premium${matText} garments manufactured for bulk B2B orders direct from Bangladesh.`;
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

  // Material context
  if (material && material.toLowerCase() !== "100% cotton") {
    const cleanMat = material.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
    if (cleanMat.length >= 3) {
      keywordSet.add(cleanMat);
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
