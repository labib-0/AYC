import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export interface BrandModel {
  id: string | number;
  name: string;
  slug: string;
  logo?: string;
  logo_url?: string;
  website?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_featured_on_landing?: boolean;
  landing_sort_order?: number;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BrandQueryParams {
  all?: boolean;
  isAdmin?: boolean;
  landing?: boolean;
  search?: string;
  is_active?: boolean;
}

export class BrandService {
  /**
   * Fetch brands
   */
  async getBrands(options?: BrandQueryParams): Promise<BrandModel[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/brands", { params: options as any });
      const items = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    }

    let list = mockStore.getBrands();

    // Dynamically calculate accurate product count from live product dataset
    const products = mockStore.getProducts();
    const countMap = new Map<string, number>();
    for (const p of products) {
      if (p.brand_id) {
        const idKey = String(p.brand_id).toLowerCase().trim();
        countMap.set(idKey, (countMap.get(idKey) || 0) + 1);
      }
      if (p.brand) {
        const nameKey = p.brand.toLowerCase().trim();
        countMap.set(nameKey, (countMap.get(nameKey) || 0) + 1);
      }
    }

    list = list.map((b) => {
      const idKey = String(b.id).toLowerCase().trim();
      const nameKey = (b.name || "").toLowerCase().trim();
      const slugKey = (b.slug || "").toLowerCase().trim();

      let count = countMap.get(idKey) || 0;
      if (count === 0 && nameKey) {
        count = countMap.get(nameKey) || 0;
      }
      if (count === 0 && slugKey) {
        count = countMap.get(slugKey) || 0;
      }
      if (count === 0 && (nameKey.includes("north face") || slugKey.includes("north-face"))) {
        count = (countMap.get("the north face") || 0) + (countMap.get("north face") || 0);
      }

      return {
        ...b,
        products_count: count,
      };
    });

    if (!options?.isAdmin && !options?.all) {
      list = list.filter((b) => b.is_active !== false);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
    }
    return list;
  }

  /**
   * Fetch landing page brands
   */
  async getLandingBrands(): Promise<BrandModel[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/brands/landing");
      const items = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    }
    return mockStore.getBrands().filter((b) => b.is_featured_on_landing && b.is_active !== false);
  }

  /**
   * Fetch single brand by slug or id
   */
  async getBrandBySlug(slugOrId: string): Promise<BrandModel | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/brands/${slugOrId}`);
        const item = res?.data || res;
        if (item && item.id) return item;
        return null;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null;
        throw err;
      }
    }
    return mockStore.getBrandBySlug(slugOrId);
  }

  /**
   * Create brand
   */
  async createBrand(data: {
    name: string;
    slug?: string;
    logo?: string;
    logo_url?: string;
    website?: string | null;
    sort_order?: number;
    is_active?: boolean;
    is_featured_on_landing?: boolean;
    landing_sort_order?: number;
  }): Promise<BrandModel> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/brands", data);
      const item = res?.data || res;
      return item;
    }
    return mockStore.saveBrand(data);
  }

  /**
   * Update brand
   */
  async updateBrand(id: string | number, updates: Partial<BrandModel>): Promise<BrandModel> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/brands/${id}`, updates);
      const item = res?.data || res;
      return item;
    }
    return mockStore.saveBrand({ ...updates, id: String(id) });
  }

  /**
   * Get actual product count associated with a brand
   */
  async getProductCount(brand: BrandModel): Promise<number> {
    if (brand.products_count !== undefined) {
      return Number(brand.products_count);
    }
    const products = mockStore.getProducts();
    const idKey = String(brand.id).toLowerCase().trim();
    const nameKey = (brand.name || "").toLowerCase().trim();
    const slugKey = (brand.slug || "").toLowerCase().trim();

    return products.filter((p) => {
      const pBrand = (p.brand || "").toLowerCase().trim();
      const pBrandId = p.brand_id ? String(p.brand_id).toLowerCase().trim() : "";
      if (pBrandId && pBrandId === idKey) return true;
      if (pBrand && pBrand === nameKey) return true;
      if (pBrand && pBrand === slugKey) return true;
      if (
        (nameKey.includes("north face") || slugKey.includes("north-face")) &&
        (pBrand === "north face" || pBrand === "the north face")
      ) {
        return true;
      }
      return false;
    }).length;
  }

  /**
   * Delete brand
   */
  async deleteBrand(id: string | number): Promise<boolean> {
    if (!isFrontendOnly()) {
      await apiClient.delete(`/brands/${id}`);
      return true;
    }
    return mockStore.deleteBrand(id);
  }
}

export const brandService = new BrandService();
