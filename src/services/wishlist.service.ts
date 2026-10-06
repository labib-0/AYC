import { Product } from "@/types";
import { apiClient } from "./api-client";

export interface WishlistItemData {
  id: string;
  wishlist_id: string;
  product_id: string;
  product: Product;
  created_at?: string;
}

export interface WishlistData {
  id: string;
  user_id: string;
  items_count: number;
  items: WishlistItemData[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export class WishlistService {
  private localKey = "ayaan_wishlist";

  private hasCustomerAuth(): boolean {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("ayaan_auth_token");
    return Boolean(token && token.trim() !== "");
  }

  private normalizeProduct(raw: any): Product {
    if (!raw) {
      return {} as Product;
    }
    return {
      ...raw,
      id: String(raw.id),
      name: raw.name || "Product",
      slug: raw.slug || "",
      price: raw.price !== undefined && raw.price !== null ? Number(raw.price) : undefined,
      wholesalePrice: raw.wholesalePrice !== undefined && raw.wholesalePrice !== null ? Number(raw.wholesalePrice) : undefined,
      wholesale_price: raw.wholesale_price !== undefined && raw.wholesale_price !== null ? Number(raw.wholesale_price) : undefined,
      images: Array.isArray(raw.images) ? raw.images : [],
      isSoldOut: Boolean(raw.isSoldOut ?? raw.is_sold_out),
      is_sold_out: Boolean(raw.isSoldOut ?? raw.is_sold_out),
      isPreorder: Boolean(raw.isPreorder ?? raw.is_preorder),
      is_preorder: Boolean(raw.isPreorder ?? raw.is_preorder),
      stock: raw.stock !== undefined ? Number(raw.stock) : 0,
      availableStock: raw.availableStock !== undefined ? Number(raw.availableStock) : (raw.stock !== undefined ? Number(raw.stock) : 0),
      moq: raw.moq !== undefined ? Number(raw.moq) : 10,
      in_stock: Boolean(raw.in_stock),
    };
  }

  private normalizeItems(items: any[]): WishlistItemData[] {
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      id: String(item.id || `w_${item.product_id}`),
      wishlist_id: String(item.wishlist_id || "default"),
      product_id: String(item.product_id || item.product?.id),
      product: this.normalizeProduct(item.product),
      created_at: item.created_at,
    }));
  }

  /**
   * Get user's wishlist from backend (if authenticated) or local cache
   */
  async getWishlist(): Promise<WishlistItemData[]> {
    if (this.hasCustomerAuth()) {
      try {
        const res = await apiClient.get<ApiResponse<WishlistData>>("/wishlist");
        if (res?.data?.items) {
          const items = this.normalizeItems(res.data.items);
          this.saveLocal(items);
          return items;
        }
      } catch (err: any) {
        // Fall back to local cache if network error
        if (err?.status !== 401 && err?.status !== 403) {
          return this.getLocal();
        }
      }
    }

    return this.getLocal();
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(product: Product): Promise<WishlistItemData[]> {
    if (this.hasCustomerAuth()) {
      try {
        const res = await apiClient.post<ApiResponse<WishlistData>>("/wishlist", {
          product_id: product.id,
        });
        if (res?.data?.items) {
          const items = this.normalizeItems(res.data.items);
          this.saveLocal(items);
          return items;
        }
      } catch (_err) {
        // Fall back to local
      }
    }

    const current = this.getLocal();
    const pid = String(product.id);
    if (!current.some((i) => i.product_id === pid)) {
      const newItem: WishlistItemData = {
        id: `w_${Date.now()}`,
        wishlist_id: "local",
        product_id: pid,
        product: this.normalizeProduct(product),
        created_at: new Date().toISOString(),
      };
      const updated = [newItem, ...current];
      this.saveLocal(updated);
      return updated;
    }

    return current;
  }

  /**
   * Toggle product in wishlist
   */
  async toggleWishlist(product: Product): Promise<WishlistItemData[]> {
    if (this.hasCustomerAuth()) {
      try {
        const res = await apiClient.post<ApiResponse<WishlistData>>("/wishlist/toggle", {
          product_id: product.id,
        });
        if (res?.data?.items) {
          const items = this.normalizeItems(res.data.items);
          this.saveLocal(items);
          return items;
        }
      } catch {
        // Fall through to local toggle
      }
    }

    const pid = String(product.id);
    const current = this.getLocal();
    const exists = current.some((i) => i.product_id === pid);
    if (exists) {
      return this.removeFromWishlist(pid);
    } else {
      return this.addToWishlist(product);
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: string | number): Promise<WishlistItemData[]> {
    const pid = String(productId);

    if (this.hasCustomerAuth()) {
      try {
        const res = await apiClient.delete<ApiResponse<WishlistData>>(`/wishlist/${pid}`);
        if (res?.data?.items) {
          const items = this.normalizeItems(res.data.items);
          this.saveLocal(items);
          return items;
        }
      } catch {
        // Fall back to local
      }
    }

    const current = this.getLocal();
    const updated = current.filter((i) => i.product_id !== pid);
    this.saveLocal(updated);
    return updated;
  }

  /**
   * Sync local items to backend after customer login
   */
  async syncLocalWishlist(): Promise<WishlistItemData[]> {
    if (!this.hasCustomerAuth()) return this.getLocal();

    const localItems = this.getLocal();
    if (localItems.length > 0) {
      for (const item of localItems) {
        try {
          await apiClient.post("/wishlist", { product_id: item.product_id });
        } catch {
          // Ignore individual failures
        }
      }
      this.clearLocal();
    }

    return this.getWishlist();
  }

  /**
   * Clear local wishlist storage
   */
  clearLocal(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.localKey);
      } catch {
        // Ignore
      }
    }
  }

  private getLocal(): WishlistItemData[] {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(this.localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return this.normalizeItems(parsed);
        }
      } catch {
        // Ignore
      }
    }
    return [];
  }

  private saveLocal(items: WishlistItemData[]) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.localKey, JSON.stringify(items));
      } catch {
        // Ignore
      }
    }
  }
}

export const wishlistService = new WishlistService();
