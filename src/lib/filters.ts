import { Product } from "@/types";

export interface AudienceCategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

export const AUDIENCE_CATEGORIES: AudienceCategory[] = [
  { id: "MEN", name: "MEN", slug: "men", categoryId: "c_men" },
  { id: "WOMEN", name: "WOMEN", slug: "women", categoryId: "c_women" },
  { id: "BOYS", name: "BOYS", slug: "boys", categoryId: "c_boys" },
  { id: "GIRLS", name: "GIRLS", slug: "girls", categoryId: "c_girls" },
  { id: "UNISEX", name: "UNISEX", slug: "unisex", categoryId: "c_unisex" },
];

export const PRODUCT_CATEGORIES = ["ALL"] as const;
export type ProductCategory = string;

/**
 * Extracts all detailed product categories matching a given product from backend entities.
 */
export function getProductCategories(product: Product): string[] {
  const cats: string[] = [];

  if (product.categoryName && !cats.includes(product.categoryName)) {
    cats.push(product.categoryName);
  }

  const rawCats = (product as any).categories;
  if (Array.isArray(rawCats)) {
    for (const c of rawCats) {
      const name = typeof c === "string" ? c : c?.name || c?.slug;
      if (name && !cats.includes(name)) {
        cats.push(name);
      }
    }
  }

  return cats;
}

/**
 * Extracts normalized product color from color property, SKU, or product title.
 */
export function getProductColor(product: Product): string {
  if (product.color) return product.color;
  const sku = (product.sku || "").toUpperCase();
  const name = (product.name || "").toLowerCase();

  if (sku.includes("-WHT-") || name.includes("white")) return "White";
  if (sku.includes("-BLK-") || name.includes("black") || name.includes("noir")) return "Black";
  if (sku.includes("-GRY-") || name.includes("grey") || name.includes("gray") || name.includes("charcoal")) return "Grey";
  if (sku.includes("-BEG-") || name.includes("beige") || name.includes("sand") || name.includes("cream")) return "Beige";
  if (sku.includes("-BLU-") || sku.includes("-NVY-") || name.includes("blue") || name.includes("navy")) return "Blue";
  if (sku.includes("-PNK-") || name.includes("pink")) return "Pink";
  if (sku.includes("-RED-") || name.includes("red")) return "Red";
  if (sku.includes("-GRN-") || sku.includes("-OLI-") || name.includes("green") || name.includes("olive")) return "Green";

  return "";
}

/**
 * Search products matching a text query across all relevant fields.
 */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    const name = (product.name || "").toLowerCase();
    const brand = (product.brand || "").toLowerCase();
    const sku = (product.sku || "").toLowerCase();
    const categoryId = (product.categoryId || "").toLowerCase();
    const desc = (product.description || "").toLowerCase();
    const color = (product.color || getProductColor(product) || "").toLowerCase();
    const productCategories = getProductCategories(product).map((c) => c.toLowerCase());

    return terms.every(
      (term) =>
        name.includes(term) ||
        brand.includes(term) ||
        sku.includes(term) ||
        categoryId.includes(term) ||
        desc.includes(term) ||
        color.includes(term) ||
        productCategories.some((c) => c.includes(term) || term.includes(c))
    );
  });
}

/**
 * Filter products across brand, audience, product categories, and colors:
 * (Brand 1 OR Brand 2) AND (Audience 1 OR Audience 2) AND (Category 1 OR Category 2) AND (Color 1 OR Color 2)
 */
export function filterProducts({
  products,
  brandIds = [],
  audienceIds = [],
  categoryNames = ["ALL"],
  colors = ["ALL"],
}: {
  products: Product[];
  brandIds?: string[];
  audienceIds?: string[];
  categoryNames?: string[];
  colors?: string[];
}): Product[] {
  return products.filter((product) => {
    // 1. Brand match (OR inside group)
    const brandOk =
      brandIds.length === 0 ||
      brandIds.some((bId) => {
        if (!product.brand) return false;
        const pBrand = product.brand.toLowerCase().trim();
        const b = bId.toLowerCase().trim();
        return (
          pBrand === b ||
          pBrand.replace(/['’.\s-]/g, "") === b.replace(/['’.\s-]/g, "") ||
          pBrand.includes(b) ||
          b.includes(pBrand)
        );
      });

    // 2. Audience match (OR inside group)
    const audienceOk =
      audienceIds.length === 0 ||
      audienceIds.some((audId) => {
        const aUpper = audId.toUpperCase();
        const pAud = ((product as any).audience || "").toUpperCase();
        const pCat = String(product.categoryId || "").toLowerCase();
        const match = AUDIENCE_CATEGORIES.find(
          (a) => a.id === audId || a.slug === audId || a.categoryId === audId
        );
        return (
          pAud === aUpper ||
          pCat.includes(audId.toLowerCase()) ||
          (match ? product.categoryId === match.categoryId : false)
        );
      });

    // 3. Category match (OR inside group, ALL = true)
    const isAllCategories = categoryNames.length === 0 || categoryNames.includes("ALL");
    const productCats = getProductCategories(product);
    if (product.categoryName) productCats.push(product.categoryName);
    if (product.categoryId) productCats.push(String(product.categoryId));
    if (Array.isArray((product as any).categories)) {
      (product as any).categories.forEach((c: any) => {
        if (typeof c === "string") productCats.push(c);
        else if (c && typeof c === "object") {
          if (c.name) productCats.push(c.name);
          if (c.slug) productCats.push(c.slug);
          if (c.id) productCats.push(String(c.id));
        }
      });
    }
    const categoryOk =
      isAllCategories ||
      categoryNames.some((cat) => {
        if (!cat) return false;
        const normalizedCat = cat.toLowerCase().trim();
        return productCats.some((pc) => pc.toLowerCase().trim() === normalizedCat);
      });

    // 4. Color match (OR inside group, ALL = true)
    const isAllColors = colors.length === 0 || colors.includes("ALL");
    const productColor = getProductColor(product);
    const colorOk =
      isAllColors || (productColor && colors.some((c) => c.toLowerCase() === productColor.toLowerCase()));

    return brandOk && audienceOk && categoryOk && colorOk;
  });
}
