import { Category } from "@/types";
import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { getCategoryImageUrl } from "@/lib/category-images";

export interface CategoryModel extends Category {
  parent_id?: number | string | null;
  accent_color?: string;
  sort_order?: number;
  is_active?: boolean;
  is_featured_on_landing?: boolean;
  landing_sort_order?: number;
  image_url?: string;
  parent?: CategoryModel | null;
  children?: CategoryModel[];
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryQueryParams {
  all?: boolean;
  isAdmin?: boolean;
  landing?: boolean;
  search?: string;
  is_active?: boolean;
}

export class CategoryService {
  /**
   * Fetch categories
   */
  async getCategories(options?: CategoryQueryParams): Promise<CategoryModel[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/categories", { params: options as any });
      const items = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(items)) {
        return items.map((c) => {
          const resolvedImg = getCategoryImageUrl(c.slug || c.name, c.image_url || c.image);
          return {
            ...c,
            image: resolvedImg,
            image_url: resolvedImg,
          };
        });
      }
      return [];
    }

    let list = mockStore.getCategories();

    // Dynamically calculate accurate product count from live product dataset
    const products = mockStore.getProducts();
    const countMap = new Map<string, number>();
    for (const p of products) {
      if (p.categoryId) {
        const idKey = String(p.categoryId).toLowerCase().trim();
        countMap.set(idKey, (countMap.get(idKey) || 0) + 1);
      }
      if (p.categoryName) {
        const nameKey = p.categoryName.toLowerCase().trim();
        countMap.set(nameKey, (countMap.get(nameKey) || 0) + 1);
      }
    }

    list = list.map((c) => {
      const idKey = String(c.id).toLowerCase().trim();
      const nameKey = (c.name || "").toLowerCase().trim();
      const slugKey = (c.slug || "").toLowerCase().trim();
      const strippedId = idKey.replace(/^c_/, "");

      let count = countMap.get(idKey) || 0;
      if (count === 0 && nameKey) {
        count = countMap.get(nameKey) || 0;
      }
      if (count === 0 && slugKey) {
        count = countMap.get(slugKey) || 0;
      }
      if (count === 0 && strippedId) {
        count = countMap.get(strippedId) || 0;
      }

      const resolvedImg = getCategoryImageUrl(c.slug || c.name, (c as any).image_url || c.image);
      return {
        ...c,
        image: resolvedImg,
        image_url: resolvedImg,
        products_count: count,
      };
    });

    if (!options?.isAdmin && !options?.all) {
      list = list.filter((c) => c.is_active !== false);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }
    return list;
  }

  /**
   * Fetch landing page categories
   */
  async getLandingCategories(): Promise<CategoryModel[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/categories/landing");
      const items = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(items)) {
        return items.map((c) => {
          const resolvedImg = getCategoryImageUrl(c.slug || c.name, c.image_url || c.image);
          return {
            ...c,
            image: resolvedImg,
            image_url: resolvedImg,
          };
        });
      }
      return [];
    }
    return mockStore.getCategories().filter((c) => c.is_featured_on_landing && c.is_active !== false);
  }

  /**
   * Fetch single category by slug or id
   */
  async getCategoryBySlug(slugOrId: string): Promise<CategoryModel | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/categories/${slugOrId}`);
        const item = res?.data || res;
        if (item && item.id) {
          const resolvedImg = getCategoryImageUrl(item.slug || item.name, item.image_url || item.image);
          return {
            ...item,
            image: resolvedImg,
            image_url: resolvedImg,
          };
        }
        return null;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null;
        throw err;
      }
    }
    const mockItem = mockStore.getCategoryBySlug(slugOrId);
    if (mockItem) {
      const resolvedImg = getCategoryImageUrl(mockItem.slug || mockItem.name, (mockItem as any).image_url || mockItem.image);
      return {
        ...mockItem,
        image: resolvedImg,
        image_url: resolvedImg,
      };
    }
    return null;
  }

  /**
   * Create category
   */
  async createCategory(data: Partial<CategoryModel>): Promise<CategoryModel> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/categories", data);
      const item = res?.data || res;
      return item;
    }
    return mockStore.saveCategory(data);
  }

  /**
   * Update category
   */
  async updateCategory(id: number | string, data: Partial<CategoryModel>): Promise<CategoryModel> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/categories/${id}`, data);
      const item = res?.data || res;
      return item;
    }
    return mockStore.saveCategory({ ...data, id: String(id) });
  }

  /**
   * Get actual product count associated with a category
   */
  async getProductCount(category: CategoryModel): Promise<number> {
    if (category.products_count !== undefined) {
      return Number(category.products_count);
    }
    const products = mockStore.getProducts();
    const idKey = String(category.id).toLowerCase().trim();
    const nameKey = (category.name || "").toLowerCase().trim();
    const slugKey = (category.slug || "").toLowerCase().trim();
    const strippedId = idKey.replace(/^c_/, "");

    return products.filter((p) => {
      const pCatId = (p.categoryId ? String(p.categoryId) : "").toLowerCase().trim();
      const pCatName = (p.categoryName || "").toLowerCase().trim();
      if (pCatId && (pCatId === idKey || pCatId === strippedId)) return true;
      if (pCatName && (pCatName === nameKey || pCatName === slugKey)) return true;
      if (pCatName && slugKey && pCatName.toLowerCase() === slugKey.toLowerCase()) return true;
      return false;
    }).length;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number | string): Promise<boolean> {
    if (!isFrontendOnly()) {
      await apiClient.delete(`/categories/${id}`);
      return true;
    }
    return mockStore.deleteCategory(id);
  }
}

export const categoryService = new CategoryService();
