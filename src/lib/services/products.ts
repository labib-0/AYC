import { apiClient } from "@/services/api-client";
import { 
  productService, 
  normalizeToB2BProduct, 
  toStorefrontProduct, 
  generateProductSku, 
  ProductQueryParams,
  SearchSuggestionsResult,
  PaginatedProductsResult,
  toggleProductStorefrontVisibility,
  reorderProducts,
  moveProductToPosition,
} from "@/services/product.service";
import { B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";
import { homepageService } from "@/services/homepage.service";

export { normalizeToB2BProduct, toStorefrontProduct, generateProductSku, toggleProductStorefrontVisibility, reorderProducts, moveProductToPosition };
export type { ProductQueryParams, SearchSuggestionsResult, PaginatedProductsResult };

export async function getProducts(options?: ProductQueryParams, signal?: AbortSignal): Promise<B2BProductInput[]> {
  return productService.getProducts(options, signal);
}

export async function getProductStatistics(): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
  lowStock: number;
  purchasePricePending: number;
  featured: number;
}> {
  return productService.getProductStatistics();
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

export async function checkIdentifierUniqueness(params: {
  slug?: string;
  sku?: string;
  excludeId?: string | number;
  productId?: string;
}) {
  return productService.checkIdentifierUniqueness(params);
}

export async function updateProduct(id: string, updates: Partial<B2BProductInput>): Promise<B2BProductInput | null> {
  return productService.updateProduct(id, updates);
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

export async function markProductSoldOut(
  id: string,
  reason?: string
): Promise<B2BProductInput | null> {
  return productService.markProductSoldOut(id, reason);
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
  mode?: "default" | "best_deals" | "new_arrivals" | null;
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
  const resolvedMode =
    options.mode ||
    (options.tab === "new-arrivals"
      ? "new_arrivals"
      : options.tab === "best-deals"
      ? "best_deals"
      : "default");
  const isNew = resolvedMode === "new_arrivals";
  const isBestDeals = resolvedMode === "best_deals";
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 24;

  const hasSpecificFilters = Boolean(
    (options.brands && options.brands.length > 0) ||
    (options.designTypes && options.designTypes.length > 0) ||
    (options.audiences && options.audiences.length > 0) ||
    (options.categories && options.categories.length > 0)
  );

  // ORDERING RULE: Admin-selected (pinned) products always appear FIRST in their sort_order.
  // Remaining eligible products follow in created_at DESC (newest upload first).
  // No product appears twice. This is enforced by the backend; we trust the order returned.

  // Primary path: fetch directly from dedicated, paginated backend featured endpoint.
  // AUTHORITATIVE: If the API call succeeds (no exception), the response is final — even if
  // zero products are returned. Do NOT fall through to mock/dummy data in that case.
  let primaryApiSucceeded = false;
  try {
    const params: Record<string, any> = {
      offset,
      limit,
      mode: resolvedMode,
      tab: options.tab || (resolvedMode === "best_deals" ? "best-deals" : resolvedMode === "new_arrivals" ? "new-arrivals" : "all"),
    };
    if (options.brands && options.brands.length > 0) params.brand = options.brands.join(",");
    if (options.designTypes && options.designTypes.length > 0) params.design_type = options.designTypes.join(",");
    if (options.audiences && options.audiences.length > 0) params.audience = options.audiences.join(",");
    if (options.categories && options.categories.length > 0) params.category = options.categories.join(",");

    const res = await apiClient.get<any>("/products/featured", { params });
    const payload = res?.data !== undefined && res?.success !== undefined ? res : res?.data || res;
    const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const meta = payload?.meta || {};

    // Mark the API call as successful regardless of item count
    primaryApiSucceeded = true;

    const products = items.map(toStorefrontProduct);
    const total = typeof meta.total === "number" ? meta.total : products.length;
    const hasMore = meta.has_more !== undefined ? Boolean(meta.has_more) : offset + products.length < total;
    // Return the authoritative result — including empty sets
    return { products, total, hasMore };
  } catch {
    // API call failed — fall through to homepage fallback then direct product query
  }

  // Fallback path: use backend homepage data which also enforces the correct ordering
  try {
    const homepageData = await homepageService.getStorefrontHomepageData();
    if (homepageData?.featured_products && homepageData.featured_products.length > 0) {
      // Convert all featured products (curated + remaining) to storefront format, preserving server order
      let list: Product[] = homepageData.featured_products
        .filter((fp) => fp.product && (fp.product.status === "published" || !fp.product.status))
        .map((fp) => toStorefrontProduct(fp.product));

      // Apply mode / tab filter:
      // For default Featured Products, DO NOT filter or rank by pricing or best deals (Sections 9, 10, 11, 24).
      // Priority is strictly: Admin-pinned products -> Latest uploaded product -> Remaining eligible products.
      if (isBestDeals) {
        // Authoritative rule: BEST DEALS = products carrying the active HOT tag
        list = list.filter((p) => p.isHot);
      } else if (isNew) {
        // When 'new-arrivals' is selected, order by newest upload (created_at DESC)
        list = [...list].sort((a, b) => {
          const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
          const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
          return timeB - timeA;
        });
      }

      // Apply client-side filters if any are active, preserving server ordering
      if (hasSpecificFilters) {
        if (options.brands && options.brands.length > 0) {
          const brandSet = new Set(options.brands.map((b) => b.toLowerCase().trim()));
          list = list.filter((p) => {
            const rawBrand = typeof p.brand === "string" ? p.brand : (p.brand as any)?.name || (p as any)?.brandName || "";
            const pBrand = rawBrand.toLowerCase().trim();
            if (brandSet.has(pBrand)) return true;
            const pBrandClean = pBrand.replace(/['’.\s-]/g, "");
            return Array.from(brandSet).some((b) => {
              const bClean = b.replace(/^br_/, "").replace(/['’.\s-]/g, "");
              return pBrand === b || pBrandClean === bClean || pBrand.includes(b) || b.includes(pBrand);
            });
          });
        }
        if (options.designTypes && options.designTypes.length > 0) {
          const dtSet = new Set(options.designTypes.map((d) => d.toLowerCase()));
          list = list.filter(
            (p) => (p as any).designType && dtSet.has(((p as any).designType as string).toLowerCase())
          );
        }
        if (options.audiences && options.audiences.length > 0) {
          const audSet = new Set(options.audiences.map((a) => a.toLowerCase()));
          list = list.filter(
            (p) => (p as any).audience && audSet.has(((p as any).audience as string).toLowerCase())
          );
        }
        if (options.categories && options.categories.length > 0) {
          const catSet = new Set(options.categories.map((c) => c.toLowerCase()));
          list = list.filter((p) => {
            const catName = (p as any).categoryName || (p as any).category || "";
            return catName && catSet.has(catName.toLowerCase());
          });
        }
      }

      if (!hasSpecificFilters || list.length > 0) {
        const total = list.length;
        const sliced = list.slice(offset, offset + limit);
        const hasMore = offset + sliced.length < total;

        return { products: sliced, total, hasMore };
      }
    }
  } catch {
    // Homepage endpoint failed — fall through to direct product API query
  }

  // If the primary /products/featured endpoint already succeeded but returned 0 items,
  // we must NOT reach this point (it would return mock/dummy data). Guard here for safety.
  if (primaryApiSucceeded) {
    return { products: [], total: 0, hasMore: false };
  }

  // Last-resort fallback: direct product query via backend API only.
  // IMPORTANT: productService.getProducts() may fall back to mockStore when the backend is
  // unreachable. To prevent dummy data leaking to the storefront, we explicitly call the
  const queryParams: ProductQueryParams = {
    is_hot: isBestDeals ? true : undefined,
    brand: options.brands && options.brands.length > 0 ? options.brands.join(",") : undefined,
    design_type: options.designTypes && options.designTypes.length > 0 ? options.designTypes.join(",") : undefined,
    audience: options.audiences && options.audiences.length > 0 ? options.audiences.join(",") : undefined,
    category: options.categories && options.categories.length > 0 ? options.categories.join(",") : undefined,
    sort_by: "newest", // created_at DESC — consistent with the required upload-order rule
  };

  try {
    const rawItems = await apiClient.get<any>("/products", {
      params: queryParams as Record<string, string | number | boolean | undefined>,
    });
    const backendItems = Array.isArray(rawItems) ? rawItems : (Array.isArray(rawItems?.data) ? rawItems.data : []);
    const allFiltered: B2BProductInput[] = backendItems.map(normalizeToB2BProduct);
    let orderedProducts = allFiltered;

    if (!isBestDeals && !isNew) {
      const now = Date.now();
      const isProductFeatured = (p: B2BProductInput) => {
        const featUntil = p.featuredUntil || p.featured_until;
        const isExpired = featUntil ? new Date(featUntil).getTime() <= now : false;
        return (
          Boolean(
            p.isPinned ??
            (p as any).is_pinned ??
            p.isFeatured ??
            p.is_featured ??
            (p as any).featured
          ) && !isExpired
        );
      };

      const pinned = allFiltered
        .filter(isProductFeatured)
        .sort((a, b) => {
          const sa = a.pinnedOrder ?? (a as any).pinned_order ?? a.featuredSortOrder ?? (a as any).featured_sort_order ?? a.sort_order ?? 9999;
          const sb = b.pinnedOrder ?? (b as any).pinned_order ?? b.featuredSortOrder ?? (b as any).featured_sort_order ?? b.sort_order ?? 9999;
          if (sa !== sb) return sa - sb;
          return Number(a.id) - Number(b.id);
        });

      const pinnedIds = new Set(pinned.map((p) => String(p.id)));
      const remaining = allFiltered.filter((p) => !pinnedIds.has(String(p.id)));
      orderedProducts = [...pinned, ...remaining];
    }

    const total = orderedProducts.length;
    const sliced = orderedProducts.slice(offset, offset + limit).map(toStorefrontProduct);
    const hasMore = offset + sliced.length < total;
    return { products: sliced, total, hasMore };
  } catch (err) {
    try {
      const fallbackProducts = await productService.getProducts(queryParams);
      let orderedProducts = fallbackProducts;
      if (isNew) {
        orderedProducts = [...fallbackProducts].sort((a, b) => {
          const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
          const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
          return timeB - timeA;
        });
      }
      const total = orderedProducts.length;
      const sliced = orderedProducts.slice(offset, offset + limit).map(toStorefrontProduct);
      return { products: sliced, total, hasMore: offset + sliced.length < total };
    } catch {
      return { products: [], total: 0, hasMore: false };
    }
  }
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
 * @deprecated No longer serves static mock data. Always returns an empty array.
 * Use getFeaturedProducts() which fetches from the authoritative backend API.
 */
export function getInitialBrandProducts(
  _brands: string[],
  _limit: number = 21,
  _audiences?: string[],
  _categories?: string[],
  _designTypes?: string[]
): Product[] {
  // Returns empty — never serves static dummy/mock data on the live storefront.
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

/**
 * Retrieves legitimate, customer-visible products from the same brand, excluding the current product.
 * Respects all storefront visibility rules (published, not hidden, non-archived).
 * Returns up to `limit` products (defaults to 4).
 */
export async function getBrandProducts(
  product: B2BProductInput,
  limit: number = 4
): Promise<B2BProductInput[]> {
  if (!product || !product.brand) return [];

  try {
    const items = await productService.getProducts({
      brand: product.brand,
      status: "published",
      per_page: limit + 5,
      exclude: product.id ? String(product.id) : undefined,
    });

    const valid = (items || []).filter(
      (p: B2BProductInput) =>
        String(p.id) !== String(product.id) &&
        p.slug !== product.slug &&
        (p.status === "published" || !p.status) &&
        !p.isHiddenFromStorefront &&
        !(p as any).is_hidden_from_storefront
    );

    return valid.slice(0, limit);
  } catch (err) {
    console.warn("Failed to load products from brand:", err);
    return [];
  }
}
