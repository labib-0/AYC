import { Product } from "@/types";

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

export class WishlistService {
  private localKey = "ayaan_wishlist";

  /**
   * Get user's wishlist
   */
  async getWishlist(): Promise<WishlistItemData[]> {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(this.localKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Ignore
      }
    }

    return [];
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(product: Product): Promise<WishlistItemData[]> {
    const current = await this.getWishlist();
    if (!current.some((i) => i.product_id === String(product.id))) {
      const newItem: WishlistItemData = {
        id: `w_${Date.now()}`,
        wishlist_id: "local",
        product_id: String(product.id),
        product,
        created_at: new Date().toISOString(),
      };
      const updated = [newItem, ...current];
      this.saveLocal(updated);
      return updated;
    }

    return current;
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: string): Promise<WishlistItemData[]> {
    const current = await this.getWishlist();
    const updated = current.filter((i) => i.product_id !== String(productId));
    this.saveLocal(updated);
    return updated;
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
