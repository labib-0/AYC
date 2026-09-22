import { Category } from "@/types";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface CategoryModel extends Category {
  parent_id?: number | string | null;
  accent_color?: string;
  sort_order?: number;
  is_active?: boolean;
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
  search?: string;
}

export class CategoryService {
  /**
   * Fetch categories
   */
  async getCategories(options?: CategoryQueryParams): Promise<CategoryModel[]> {
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

      return {
        ...c,
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
   * Fetch single category by slug or id
   */
  async getCategoryBySlug(slugOrId: string): Promise<CategoryModel | null> {
    return mockStore.getCategoryBySlug(slugOrId);
  }

  /**
   * Create category
   */
  async createCategory(data: Partial<CategoryModel>): Promise<CategoryModel> {
    return mockStore.saveCategory(data);
  }

  /**
   * Update category
   */
  async updateCategory(id: number | string, data: Partial<CategoryModel>): Promise<CategoryModel> {
    return mockStore.saveCategory({ ...data, id: String(id) });
  }

  /**
   * Get actual product count associated with a category
   */
  async getProductCount(category: CategoryModel): Promise<number> {
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
    return mockStore.deleteCategory(id);
  }
}

export const categoryService = new CategoryService();
