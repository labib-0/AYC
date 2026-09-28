import { 
  productService, 
  normalizeToB2BProduct, 
  toStorefrontProduct, 
  generateProductSku, 
  ProductQueryParams,
  SearchSuggestionsResult,
  PaginatedProductsResult,
  toggleProductStorefrontVisibility,
} from "@/services/product.service";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";
import { homepageService } from "@/services/homepage.service";

export { normalizeToB2BProduct, toStorefrontProduct, generateProductSku, toggleProductStorefrontVisibility };
export type { ProductQueryParams, SearchSuggestionsResult, PaginatedProductsResult };

export async function getProducts(options?: ProductQueryParams): Promise<B2BProductInput[]> {
  return productService.getProducts(options);
}

export async function getProductsPaginated(
  options: ProductQueryParams,
  signal?: AbortSignal
): Promise<PaginatedProductsResult> {
  return productService.getProductsPaginated(options, signal);
}

export async function getProductBySlugOrId(slugOrId: string): Promise<B2BProductInput | null> {
  return productService.getProductBySlugOrId(slugOrId);
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestionsResult> {
  return productService.getSearchSuggestions(query);
}

export async function createProduct(input: B2BProductInput): Promise<B2BProductInput> {
  return productService.createProduct(input);
}

export async function updateProduct(id: string, updates: Partial<B2BProductInput>): Promise<B2BProductInput | null> {
  return productService.updateProduct(id, updates);
}

export async function duplicateProduct(id: string): Promise<B2BProductInput | null> {
  const source = await getProductBySlugOrId(id);
  if (!source) return null;

  const clone: B2BProductInput = {
    ...source,
    id: `prod_${Date.now()}_copy`,
    name: `${source.name} (Copy)`,
    slug: `${source.slug}-copy-${Math.random().toString(36).substring(2, 6)}`,
    sku: generateProductSku(source.brand, source.categoryName || "APP", `${source.name} Copy`),
    status: "draft",
  };

  return createProduct(clone);
}

export async function deleteProduct(id: string): Promise<boolean> {
  return productService.deleteProduct(id);
}

export async function togglePublishStatus(
  id: string, 
  newStatus: "published" | "draft" | "unpublished"
): Promise<B2BProductInput | null> {
  return updateProduct(id, { status: newStatus });
}

export async function getProductShippingSpecs(
  slugOrId: string,
  quantity: number,
  isFullStock: boolean = false
): Promise<any> {
  return productService.getProductShippingSpecs(slugOrId, quantity, isFullStock);
}

/**
 * Options for querying featured products with pagination and filters
 */
export interface FeaturedProductsOptions {
  tab?: "best-deals" | "new-arrivals" | "all";
  offset?: number;
  limit?: number;
  brands?: string[];
  designTypes?: string[];
  audiences?: string[];
  categories?: string[];
}

/**
 * Fetch a batch of Featured Products for the landing page with offset/limit pagination and filters
 */
export async function getFeaturedProducts(
  options: FeaturedProductsOptions
): Promise<{ products: Product[]; total: number; hasMore: boolean }> {
  const isDeals = options.tab === "best-deals";
  const isNew = options.tab === "new-arrivals";
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 21;

  const hasSpecificFilters = Boolean(
    (options.brands && options.brands.length > 0) ||
    (options.designTypes && options.designTypes.length > 0) ||
    (options.audiences && options.audiences.length > 0) ||
    (options.categories && options.categories.length > 0)
  );

  // When loading without active filters, use backend curated featured products in exact sort_order
  if (!hasSpecificFilters) {
    try {
      const homepageData = await homepageService.getStorefrontHomepageData();
      if (homepageData?.featured_products) {
        const curated = homepageData.featured_products
          .filter((fp) => fp.product && (fp.product.status === "published" || !fp.product.status))
          .map((fp) => toStorefrontProduct(fp.product));

        let list = curated;
        if (isNew) {
          const newOnly = list.filter((p) => p.isNew);
          if (newOnly.length > 0) list = newOnly;
        }

        const total = list.length;
        const sliced = list.slice(offset, offset + limit);
        const hasMore = offset + sliced.length < total;

        return {
          products: sliced,
          total,
          hasMore,
        };
      }
    } catch {
      // Fall through to database query
    }
  }

  const queryParams: ProductQueryParams = {
    is_best_deal: isDeals ? true : undefined,
    is_new: isNew ? true : undefined,
    brand: options.brands && options.brands.length > 0 ? options.brands.join(",") : undefined,
    design_type: options.designTypes && options.designTypes.length > 0 ? options.designTypes.join(",") : undefined,
    audience: options.audiences && options.audiences.length > 0 ? options.audiences.join(",") : undefined,
    category: options.categories && options.categories.length > 0 ? options.categories.join(",") : undefined,
  };

  const allFiltered = await productService.getProducts(queryParams);
  const total = allFiltered.length;
  const sliced = allFiltered.slice(offset, offset + limit).map(toStorefrontProduct);
  const hasMore = offset + sliced.length < total;

  return {
    products: sliced,
    total,
    hasMore,
  };
}

export function getInitialFeaturedProducts(
  _tab: "best-deals" | "new-arrivals",
  _limit: number = 21,
  _brands?: string[],
  _audiences?: string[],
  _categories?: string[],
  _designTypes?: string[]
): Product[] {
  return [];
}

/**
 * Synchronous initial fallback for Shop By Brand inline expansion (default 21 items)
 */
export function getInitialBrandProducts(
  _brands: string[],
  _limit: number = 21,
  _audiences?: string[],
  _categories?: string[],
  _designTypes?: string[]
): Product[] {
  return [];
}

/**
 * Calculates contextually relevant related products based on category, brand, audience, design type, and keyword similarity
 */
export async function getRelatedProducts(
  product: B2BProductInput,
  limit: number = 6
): Promise<B2BProductInput[]> {
  const allProducts = await getProducts();
  const others = allProducts.filter((p) => p.id !== product.id && p.slug !== product.slug);

  const scored = others.map((item) => {
    let score = 0;
    // Category match: weight 4
    if (item.categoryId && product.categoryId && item.categoryId === product.categoryId) {
      score += 4;
    } else if (
      item.categoryName &&
      product.categoryName &&
      item.categoryName.toLowerCase() === product.categoryName.toLowerCase()
    ) {
      score += 4;
    }
    // Brand match: weight 3
    if (item.brand && product.brand && item.brand.toLowerCase() === product.brand.toLowerCase()) {
      score += 3;
    }
    // Audience match: weight 2
    if (item.audience && product.audience && item.audience === product.audience) {
      score += 2;
    }
    // Design type match: weight 2
    if (item.designType && product.designType && item.designType === product.designType) {
      score += 2;
    }
    // Keywords overlap: weight 3
    if (item.keywords && product.keywords && Array.isArray(item.keywords) && Array.isArray(product.keywords)) {
      const itemKws = new Set(item.keywords.map((k) => k.toLowerCase()));
      const overlap = product.keywords.filter((k) => itemKws.has(k.toLowerCase())).length;
      score += overlap * 3;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}



