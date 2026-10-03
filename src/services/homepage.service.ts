import { apiClient } from "@/services/api-client";
import { DEFAULT_TOP_BANNER, TopBannerConfig } from "@/config/banner";

export interface HomepageBannerModel {
  id: number;
  image_path?: string | null;
  image_url: string;
  headline: string;
  subtitle?: string | null;
  cta_text?: string | null;
  destination_type?: string | null;
  destination_value?: string | null;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HomepageBrandRecord {
  id: number | string;
  name: string;
  slug: string;
  logo?: string;
  logo_url?: string;
  website?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_featured_on_landing?: boolean;
  landing_sort_order?: number;
}

export interface HomepageFeaturedBrandModel {
  id?: number;
  brand_id: number | string;
  sort_order: number;
  is_active: boolean;
  brand?: HomepageBrandRecord;
}

export interface HomepageCategoryRecord {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  accent_color?: string | null;
  parent_id?: number | string | null;
  sort_order?: number;
  is_active?: boolean;
  is_featured_on_landing?: boolean;
  landing_sort_order?: number;
}

export interface HomepageHotSaleCategoryModel {
  id?: number;
  category_id: number;
  sort_order: number;
  is_active: boolean;
  category?: HomepageCategoryRecord;
}

export interface HomepageFeaturedProductModel {
  id?: number;
  product_id: number;
  sort_order: number;
  is_active: boolean;
  product?: any;
}

export interface HomepageTickerItem {
  id?: number;
  text: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StorefrontHomepageData {
  banner: HomepageBannerModel | null;
  ticker_items: HomepageTickerItem[];
  featured_brands: HomepageFeaturedBrandModel[];
  hot_sale_categories: HomepageHotSaleCategoryModel[];
  featured_products: HomepageFeaturedProductModel[];
  hot_sale_visible?: boolean;
}

export interface BangladeshStorefrontAccessState {
  enabled: boolean;
  status: "blocked" | "accessible";
  driver?: string;
  local_database_exists?: boolean;
  updated_at?: string;
  error?: string | null;
}

export interface AdminHomepageData {
  banner: HomepageBannerModel | null;
  all_banners?: HomepageBannerModel[];
  site_logo?: string | null;
  hot_sale_visible?: boolean;
  ticker_items: HomepageTickerItem[];
  featured_brands: HomepageFeaturedBrandModel[];
  all_brands?: HomepageBrandRecord[];
  hot_sale_categories: HomepageHotSaleCategoryModel[];
  all_categories?: HomepageCategoryRecord[];
  featured_products: HomepageFeaturedProductModel[];
  counts?: {
    total_brands?: number;
    landing_brands?: number;
    total_categories: number;
    landing_categories?: number;
    total_products: number;
    total_all_products?: number;
    featured_products?: number;
  };
}

export interface ProductSearchResultItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  wholesale_price?: string | number;
  price?: string | number;
  formatted_price?: string;
  moq?: number;
  status?: string;
  is_active?: boolean;
  primary_image_url?: string;
  brand_name?: string;
  category_name?: string;
  brand?: { id: number; name: string };
  categories?: { id: number; name: string }[];
  images?: { id: number; image_url: string; is_primary?: boolean }[];
  [key: string]: any;
}

export interface PaginatedProductSearchResults {
  items: ProductSearchResultItem[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PaginatedBrandSearchResults {
  items: HomepageBrandRecord[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PaginatedCategorySearchResults {
  items: HomepageCategoryRecord[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export class HomepageService {
  private storefrontDataPromise: Promise<StorefrontHomepageData> | null = null;
  private cachedStorefrontData: { data: StorefrontHomepageData; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 60000; // 60 seconds

  constructor() {
    if (typeof window !== "undefined") {
      const invalidate = () => this.invalidateStorefrontCache();
      window.addEventListener("ayaan:homepage-updated", invalidate);
      window.addEventListener("ayaan:data-updated", invalidate);
    }
  }

  /**
   * Clear in-memory storefront homepage cache on client.
   */
  invalidateStorefrontCache(): void {
    this.cachedStorefrontData = null;
    this.storefrontDataPromise = null;
  }

  /**
   * Fetch published landing page configuration for the customer storefront.
   * Single source of truth from Laravel API backend.
   * Deduplicates concurrent in-flight requests across mounting homepage sections.
   */
  async getStorefrontHomepageData(forceRefresh = false): Promise<StorefrontHomepageData> {
    const now = Date.now();
    if (!forceRefresh && this.cachedStorefrontData && (now - this.cachedStorefrontData.timestamp) < this.CACHE_TTL_MS) {
      return this.cachedStorefrontData.data;
    }

    if (!forceRefresh && this.storefrontDataPromise) {
      return this.storefrontDataPromise;
    }

    this.storefrontDataPromise = (async () => {
      try {
        const res = await apiClient.get<any>("/homepage");
        const data = res?.data || res;
        if (data && typeof data === "object") {
          const result: StorefrontHomepageData = {
            banner: data.banner || null,
            ticker_items: Array.isArray(data.ticker_items) ? data.ticker_items : [],
            featured_brands: Array.isArray(data.featured_brands) ? data.featured_brands : [],
            hot_sale_categories: Array.isArray(data.hot_sale_categories) ? data.hot_sale_categories : [],
            featured_products: Array.isArray(data.featured_products) ? data.featured_products : [],
            hot_sale_visible: data.hot_sale_visible !== undefined ? Boolean(data.hot_sale_visible) : true,
          };
          this.cachedStorefrontData = { data: result, timestamp: Date.now() };
          return result;
        }
      } catch (err) {
        console.warn("HomepageService.getStorefrontHomepageData failed:", err);
      } finally {
        this.storefrontDataPromise = null;
      }

      return {
        banner: null,
        ticker_items: [],
        featured_brands: [],
        hot_sale_categories: [],
        featured_products: [],
        hot_sale_visible: true,
      };
    })();

    return this.storefrontDataPromise;
  }

  /**
   * Fetch complete landing page management settings for Admin.
   */
  async getAdminHomepageData(): Promise<AdminHomepageData> {
    const res = await apiClient.get<any>("/admin/homepage");
    const data = res?.data || res;
    return {
      banner: data?.banner || null,
      all_banners: Array.isArray(data?.all_banners) ? data.all_banners : [],
      site_logo: data?.site_logo || null,
      hot_sale_visible: data?.hot_sale_visible !== undefined ? Boolean(data.hot_sale_visible) : true,
      ticker_items: Array.isArray(data?.ticker_items) ? data.ticker_items : [],
      featured_brands: Array.isArray(data?.featured_brands) ? data.featured_brands : [],
      all_brands: Array.isArray(data?.all_brands) ? data.all_brands : [],
      hot_sale_categories: Array.isArray(data?.hot_sale_categories) ? data.hot_sale_categories : [],
      all_categories: Array.isArray(data?.all_categories) ? data.all_categories : [],
      featured_products: Array.isArray(data?.featured_products) ? data.featured_products : [],
      counts: data?.counts || { total_categories: 0, total_products: 0 },
    };
  }

  /**
   * Save banner configuration (supports text fields or direct file upload).
   */
  async saveBanner(payload: FormData | {
    id?: number;
    headline: string;
    subtitle?: string;
    cta_text?: string;
    destination_type?: string;
    destination_value?: string;
    is_active?: boolean;
    image_url?: string;
  }): Promise<HomepageBannerModel> {
    const res = await apiClient.post<any>("/admin/homepage/banner", payload);
    const saved = (res?.data || res) as HomepageBannerModel;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "banner" } }));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { entity: "homepage" } }));
    }
    return saved;
  }

  /**
   * Synchronize Shop By Brand featured brands in exact order.
   */
  async syncFeaturedBrands(
    brands: { brand_id: number | string; sort_order: number; is_active?: boolean }[]
  ): Promise<HomepageFeaturedBrandModel[]> {
    const res = await apiClient.post<any>("/admin/homepage/brands", { brands });
    const list = (res?.data || res) as HomepageFeaturedBrandModel[];
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "brands" } }));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { entity: "brands" } }));
    }
    return Array.isArray(list) ? list : [];
  }

  /**
   * Synchronize Hot Sale categories in exact order.
   */
  async syncHotSaleCategories(
    categories: { category_id: number; sort_order: number; is_active?: boolean }[]
  ): Promise<HomepageHotSaleCategoryModel[]> {
    const res = await apiClient.post<any>("/admin/homepage/hot-sale-categories", { categories });
    const list = (res?.data || res) as HomepageHotSaleCategoryModel[];
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "hot_sale" } }));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { entity: "categories" } }));
    }
    return Array.isArray(list) ? list : [];
  }

  /**
   * Synchronize Featured Products in exact order.
   */
  async syncFeaturedProducts(
    products: { product_id: number; sort_order: number; is_active?: boolean }[]
  ): Promise<HomepageFeaturedProductModel[]> {
    const res = await apiClient.post<any>("/admin/homepage/featured-products", { products });
    const list = (res?.data || res) as HomepageFeaturedProductModel[];
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "featured" } }));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { entity: "products" } }));
    }
    return Array.isArray(list) ? list : [];
  }

  /**
   * Search available published products to add to Featured Products.
   */
  async searchProducts(
    paramsOrQuery?: string | {
      q?: string;
      search?: string;
      page?: number;
      category_id?: number;
      brand_id?: number;
      per_page?: number;
      exclude_ids?: (number | string)[] | string;
    },
    page?: number,
    perPage?: number,
    excludeIds?: (number | string)[]
  ): Promise<PaginatedProductSearchResults> {
    let params: Record<string, any>;
    if (typeof paramsOrQuery === "string") {
      params = {
        q: paramsOrQuery,
        page: page || 1,
        per_page: perPage || 5,
        exclude_ids: excludeIds ? (Array.isArray(excludeIds) ? excludeIds.join(",") : excludeIds) : undefined,
      };
    } else {
      params = { ...paramsOrQuery };
      if (Array.isArray(params.exclude_ids)) {
        params.exclude_ids = params.exclude_ids.join(",");
      }
    }
    const res = await apiClient.get<any>("/admin/homepage/search-products", {
      params,
    });
    const data = res?.data || res;
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      pagination: data?.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: perPage || 5,
        total: 0,
      },
    };
  }

  /**
   * Search and paginate brands for Shop By Brand landing page management.
   */
  async searchBrands(
    paramsOrQuery?: string | {
      q?: string;
      search?: string;
      page?: number;
      per_page?: number;
      exclude_ids?: (number | string)[] | string;
    },
    page?: number,
    perPage?: number,
    excludeIds?: (number | string)[]
  ): Promise<PaginatedBrandSearchResults> {
    let params: Record<string, any>;
    if (typeof paramsOrQuery === "string") {
      params = {
        q: paramsOrQuery,
        page: page || 1,
        per_page: perPage || 5,
        exclude_ids: excludeIds ? (Array.isArray(excludeIds) ? excludeIds.join(",") : excludeIds) : undefined,
      };
    } else {
      params = { ...paramsOrQuery };
      if (Array.isArray(params.exclude_ids)) {
        params.exclude_ids = params.exclude_ids.join(",");
      }
    }
    const res = await apiClient.get<any>("/admin/homepage/search-brands", {
      params,
    });
    const data = res?.data || res;
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      pagination: data?.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: perPage || 5,
        total: 0,
      },
    };
  }

  /**
   * Search and paginate categories for Hot Sale landing page management.
   */
  async searchCategories(
    paramsOrQuery?: string | {
      q?: string;
      search?: string;
      page?: number;
      per_page?: number;
      exclude_ids?: (number | string)[] | string;
    },
    page?: number,
    perPage?: number,
    excludeIds?: (number | string)[]
  ): Promise<PaginatedCategorySearchResults> {
    let params: Record<string, any>;
    if (typeof paramsOrQuery === "string") {
      params = {
        q: paramsOrQuery,
        page: page || 1,
        per_page: perPage || 5,
        exclude_ids: excludeIds ? (Array.isArray(excludeIds) ? excludeIds.join(",") : excludeIds) : undefined,
      };
    } else {
      params = { ...paramsOrQuery };
      if (Array.isArray(params.exclude_ids)) {
        params.exclude_ids = params.exclude_ids.join(",");
      }
    }
    const res = await apiClient.get<any>("/admin/homepage/search-categories", {
      params,
    });
    const data = res?.data || res;
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      pagination: data?.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: perPage || 5,
        total: 0,
      },
    };
  }

  /**
   * Synchronize Homepage ticker items (keywords).
   */
  async syncTickerItems(items: HomepageTickerItem[]): Promise<HomepageTickerItem[]> {
    const res = await apiClient.post<any>("/admin/homepage/ticker", { items });
    const list = (res?.data || res) as HomepageTickerItem[];
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "ticker" } }));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { entity: "homepage" } }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_homepage_ticker_updated" }));
    }
    return Array.isArray(list) ? list : [];
  }

  /**
   * Update Hot Sale section visibility on customer homepage.
   */
  async updateHotSaleVisibility(visible: boolean): Promise<boolean> {
    const res = await apiClient.post<any>("/admin/homepage/hot-sale-visibility", {
      hot_sale_visible: visible,
    });
    const result = res?.data?.hot_sale_visible ?? res?.hot_sale_visible ?? visible;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "hot_sale_visibility", visible: result } }));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { entity: "homepage" } }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_homepage_updated" }));
    }
    return Boolean(result);
  }

  /**
   * Fetch current Bangladesh customer storefront access status.
   */
  async getBangladeshStorefrontAccess(): Promise<BangladeshStorefrontAccessState> {
    const res = await apiClient.get<any>("/admin/homepage/bangladesh-storefront-access");
    const data = res?.data || res;
    return {
      enabled: Boolean(data?.enabled),
      status: data?.enabled ? "blocked" : "accessible",
      driver: data?.driver,
      local_database_exists: data?.local_database_exists,
      updated_at: data?.updated_at,
    };
  }

  /**
   * Update Bangladesh customer storefront access setting (ON = blocked, OFF = accessible).
   */
  async updateBangladeshStorefrontAccess(enabled: boolean): Promise<BangladeshStorefrontAccessState> {
    const res = await apiClient.patch<any>("/admin/homepage/bangladesh-storefront-access", { enabled });
    const data = res?.data || res;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ayaan:homepage-updated", {
          detail: { type: "bangladesh_access", enabled: data?.enabled },
        })
      );
    }
    return {
      enabled: Boolean(data?.enabled),
      status: data?.enabled ? "blocked" : "accessible",
      driver: data?.driver,
      local_database_exists: data?.local_database_exists,
      updated_at: data?.updated_at,
    };
  }

  /**
   * Convert HomepageBannerModel to TopBannerConfig for storefront component.
   */
  bannerModelToTopBannerConfig(model: HomepageBannerModel | null): TopBannerConfig {
    if (!model) {
      return {
        ...DEFAULT_TOP_BANNER,
        active: false,
      };
    }
    return {
      title: model.headline,
      subtitle: model.subtitle || undefined,
      imageUrl: model.image_url,
      altText: model.headline,
      buttonText: model.cta_text || undefined,
      target: model.destination_value || "#featured",
      active: Boolean(model.is_active),
    };
  }
}

export const homepageService = new HomepageService();
