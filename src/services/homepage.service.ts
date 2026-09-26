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
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  accent_color?: string | null;
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

export interface StorefrontHomepageData {
  banner: HomepageBannerModel | null;
  featured_brands: HomepageFeaturedBrandModel[];
  hot_sale_categories: HomepageHotSaleCategoryModel[];
  featured_products: HomepageFeaturedProductModel[];
}

export interface AdminHomepageData {
  banner: HomepageBannerModel | null;
  all_banners?: HomepageBannerModel[];
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
    featured_products?: number;
  };
}

export interface ProductSearchResultItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  wholesale_price: string | number;
  moq: number;
  status: string;
  brand?: { id: number; name: string };
  categories?: { id: number; name: string }[];
  images?: { id: number; image_url: string; is_primary?: boolean }[];
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

export class HomepageService {
  /**
   * Fetch published landing page configuration for the customer storefront.
   * Single source of truth from Laravel API backend.
   */
  async getStorefrontHomepageData(): Promise<StorefrontHomepageData> {
    try {
      const res = await apiClient.get<any>("/homepage");
      const data = res?.data || res;
      if (data && typeof data === "object") {
        return {
          banner: data.banner || null,
          featured_brands: Array.isArray(data.featured_brands) ? data.featured_brands : [],
          hot_sale_categories: Array.isArray(data.hot_sale_categories) ? data.hot_sale_categories : [],
          featured_products: Array.isArray(data.featured_products) ? data.featured_products : [],
        };
      }
    } catch (err) {
      console.warn("HomepageService.getStorefrontHomepageData failed:", err);
    }

    return {
      banner: null,
      featured_brands: [],
      hot_sale_categories: [],
      featured_products: [],
    };
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
      page?: number;
      category_id?: number;
      brand_id?: number;
      per_page?: number;
    },
    page?: number,
    perPage?: number
  ): Promise<PaginatedProductSearchResults> {
    const params = typeof paramsOrQuery === "string"
      ? { q: paramsOrQuery, page: page || 1, per_page: perPage || 15 }
      : paramsOrQuery;
    const res = await apiClient.get<any>("/admin/homepage/search-products", {
      params: params as any,
    });
    const data = res?.data || res;
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      pagination: data?.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
      },
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
