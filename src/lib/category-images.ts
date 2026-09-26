/**
 * Canonical Category Images & Resolution Standard
 *
 * Single Source of Truth for Product Category Imagery throughout Ayaan Clothing.
 * Ensures consistent, high-resolution, responsive imagery across:
 * - Shop By Brand -> All Categories -> Product Categories
 * - Featured Products -> All Categories -> Product Categories
 * - Audience -> Product Categories
 * - Category filter rails, search, and navigation
 */

export const CANONICAL_CATEGORY_IMAGES: Record<string, string> = {
  sweaters: "https://images.pexels.com/photos/15694151/pexels-photo-15694151.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "t-shirts": "https://images.pexels.com/photos/7658459/pexels-photo-7658459.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  hoodies: "https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  trousers: "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  pants: "https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  shorts: "https://images.pexels.com/photos/16022099/pexels-photo-16022099.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  jackets: "https://images.pexels.com/photos/19490409/pexels-photo-19490409.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "polo-shirts": "https://images.pexels.com/photos/8217415/pexels-photo-8217415.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  activewear: "https://images.pexels.com/photos/37451174/pexels-photo-37451174.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  knitwear: "https://images.pexels.com/photos/35145462/pexels-photo-35145462.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  shirts: "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  beachwear: "https://images.pexels.com/photos/2215609/pexels-photo-2215609.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  socks: "https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=800",
  blouse: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&q=80&w=800",
  "tank-top": "https://images.pexels.com/photos/6311652/pexels-photo-6311652.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  tops: "https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  sports: "https://images.pexels.com/photos/4662343/pexels-photo-4662343.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  towels: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=800",
};

/** High-availability default category fallback image */
export const DEFAULT_CATEGORY_FALLBACK =
  "https://images.pexels.com/photos/15694151/pexels-photo-15694151.jpeg?auto=compress&cs=tinysrgb&h=650&w=940";

/**
 * Normalizes a category key (name or slug) to match canonical category lookup
 */
export function normalizeCategorySlug(key: string): string {
  if (!key) return "";
  const cleaned = key
    .toLowerCase()
    .trim()
    .replace(/^c_/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Common aliases
  if (cleaned === "tshirt" || cleaned === "tshirts" || cleaned === "t-shirt") return "t-shirts";
  if (cleaned === "sweater") return "sweaters";
  if (cleaned === "hoodie") return "hoodies";
  if (cleaned === "trouser") return "trousers";
  if (cleaned === "pant" || cleaned === "jeans" || cleaned === "denim") return "pants";
  if (cleaned === "short") return "shorts";
  if (cleaned === "jacket") return "jackets";
  if (cleaned === "polo" || cleaned === "polos" || cleaned === "polo-shirt") return "polo-shirts";
  if (cleaned === "shirt") return "shirts";
  if (cleaned === "sock") return "socks";
  if (cleaned === "blouses") return "blouse";
  if (cleaned === "tanktop" || cleaned === "tank-tops") return "tank-top";
  if (cleaned === "top") return "tops";
  if (cleaned === "sport") return "sports";
  if (cleaned === "towel") return "towels";

  return cleaned;
}

/**
 * Resolves the authoritative category image URL.
 * Prioritizes an existing valid remote HTTP URL; otherwise falls back
 * deterministically to the canonical image catalog, preventing broken images.
 * Accepts either (categoryKey, existingUrl) or (existingUrl, categoryKey).
 */
export function getCategoryImageUrl(
  categoryKeyOrUrl?: string | null,
  secondaryKeyOrUrl?: string | null
): string {
  let url = "";
  let key = "";

  const isUrl = (val?: string | null) =>
    Boolean(
      val &&
        typeof val === "string" &&
        val.trim().length > 0 &&
        !val.includes("default.jpg") &&
        !val.includes("placeholder") &&
        (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"))
    );

  if (isUrl(categoryKeyOrUrl)) {
    url = categoryKeyOrUrl!;
    key = secondaryKeyOrUrl || "";
  } else if (isUrl(secondaryKeyOrUrl)) {
    url = secondaryKeyOrUrl!;
    key = categoryKeyOrUrl || "";
  } else {
    key = categoryKeyOrUrl || secondaryKeyOrUrl || "";
  }

  if (url) {
    return url.trim();
  }

  const normalized = normalizeCategorySlug(key);
  if (CANONICAL_CATEGORY_IMAGES[normalized]) {
    return CANONICAL_CATEGORY_IMAGES[normalized];
  }

  for (const [canonicalKey, canonicalUrl] of Object.entries(CANONICAL_CATEGORY_IMAGES)) {
    if (normalized.includes(canonicalKey) || canonicalKey.includes(normalized)) {
      return canonicalUrl;
    }
  }

  return DEFAULT_CATEGORY_FALLBACK;
}
