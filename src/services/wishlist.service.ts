import { Product } from "@/types";
import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { cartService } from "./cart.service";
import { mockStore } from "@/lib/mock-data/mock-store";

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

export interface BulkAddToCartResult {
  success: boolean;
  message: string;
  data: {
    added: Array<{
      wishlist_item_id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number | null;
    }>;
    unavailable: Array<{
      wishlist_item_id: string;
      product_id: string;
      product_name: string;
      reason: string;
    }>;
    failed: Array<{
      id: string;
      reason: string;
    }>;
    cart?: any;
    cart_count: number;
    added_count: number;
    unavailable_count: number;
  };
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
    const pid = String(raw.id || raw.product_id || "");
    const canonical = typeof window !== "undefined" && pid ? mockStore.getProductByIdOrSlug(pid) : null;
    const resolvedName = canonical?.name || raw.name || "Product";
    const resolvedSlug = canonical?.slug || raw.slug || "";

    const resolvedStock = canonical?.stock !== undefined
      ? Number(canonical.stock)
      : (raw.stock !== undefined ? Number(raw.stock) : 0);
    const resolvedAvailableStock = canonical?.availableStock !== undefined
      ? Number(canonical.availableStock)
      : (canonical?.stock !== undefined
        ? Number(canonical.stock)
        : (raw.availableStock !== undefined
          ? Number(raw.availableStock)
          : (raw.stock !== undefined ? Number(raw.stock) : 0)));
    const resolvedIsSoldOut = Boolean(
      canonical?.isSoldOut ?? (canonical as any)?.is_sold_out ?? raw.isSoldOut ?? raw.is_sold_out
    );
    const resolvedIsPreorder = Boolean(
      canonical?.isPreorder ?? (canonical as any)?.is_preorder ?? raw.isPreorder ?? raw.is_preorder
    );
    const resolvedPrice = canonical?.price !== undefined && canonical.price !== null
      ? Number(canonical.price)
      : (raw.price !== undefined && raw.price !== null ? Number(raw.price) : undefined);
    const resolvedWholesalePrice = canonical?.wholesalePrice !== undefined && canonical.wholesalePrice !== null
      ? Number(canonical.wholesalePrice)
      : (canonical?.wholesale_price !== undefined && (canonical as any).wholesale_price !== null
        ? Number((canonical as any).wholesale_price)
        : (raw.wholesalePrice !== undefined && raw.wholesalePrice !== null
          ? Number(raw.wholesalePrice)
          : (raw.wholesale_price !== undefined ? Number(raw.wholesale_price) : undefined)));
    const resolvedInStock = (canonical as any)?.in_stock !== undefined
      ? Boolean((canonical as any).in_stock)
      : (resolvedIsPreorder || resolvedAvailableStock > 0 || (raw.in_stock !== undefined ? Boolean(raw.in_stock) : false));
    const resolvedMoq = canonical?.moq !== undefined ? Number(canonical.moq) : (raw.moq !== undefined ? Number(raw.moq) : 10);
    const resolvedImages = Array.isArray(canonical?.images) && canonical.images.length > 0
      ? canonical.images
      : (Array.isArray(raw.images) ? raw.images : []);

    return {
      ...raw,
      id: pid,
      name: resolvedName,
      slug: resolvedSlug,
      price: resolvedPrice,
      wholesalePrice: resolvedWholesalePrice,
      wholesale_price: resolvedWholesalePrice,
      images: resolvedImages,
      isSoldOut: resolvedIsSoldOut,
      is_sold_out: resolvedIsSoldOut,
      isPreorder: resolvedIsPreorder,
      is_preorder: resolvedIsPreorder,
      stock: resolvedStock,
      availableStock: resolvedAvailableStock,
      moq: resolvedMoq,
      in_stock: !resolvedIsSoldOut && resolvedInStock,
      has_valid_price: Boolean(resolvedPrice || resolvedWholesalePrice || (canonical as any)?.has_valid_price || (raw as any)?.has_valid_price),
      hasValidPrice: Boolean(resolvedPrice || resolvedWholesalePrice || (canonical as any)?.hasValidPrice || (raw as any)?.hasValidPrice),
    };
  }

  private normalizeItems(items: any[]): WishlistItemData[] {
    if (!Array.isArray(items)) return [];
    const seenPids = new Set<string>();
    const result: WishlistItemData[] = [];
    for (const item of items) {
      const pid = String(item.product_id || item.product?.id || "");
      if (!pid || seenPids.has(pid)) continue;
      seenPids.add(pid);
      result.push({
        id: String(item.id || `w_${pid}`),
        wishlist_id: String(item.wishlist_id || "default"),
        product_id: pid,
        product: this.normalizeProduct(item.product || item),
        created_at: item.created_at,
      });
    }
    return result;
  }

  /**
   * Get user's wishlist from backend (if authenticated and not frontend-only) or local cache
   */
  async getWishlist(options?: { forceFresh?: boolean }): Promise<WishlistItemData[]> {
    if (!isFrontendOnly() && this.hasCustomerAuth()) {
      try {
        const res = await apiClient.get<ApiResponse<WishlistData>>("/wishlist");
        if (res?.data?.items) {
          const items = this.normalizeItems(res.data.items);
          this.saveLocal(items);
          return items;
        }
      } catch (err: any) {
        if (options?.forceFresh) {
          throw err;
        }
        // Fall back to local cache if network error on initial load
        if (err?.status !== 401 && err?.status !== 403) {
          return this.getLocal();
        }
      }
    }

    const localItems = this.getLocal();
    if (options?.forceFresh && localItems.length > 0) {
      this.saveLocal(localItems);
    }
    return localItems;
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(product: Product): Promise<WishlistItemData[]> {
    if (!isFrontendOnly() && this.hasCustomerAuth()) {
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
    if (!isFrontendOnly() && this.hasCustomerAuth()) {
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

    if (!isFrontendOnly() && this.hasCustomerAuth()) {
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
   * Bulk add selected wishlist items to cart
   */
  async addSelectedToCart(
    itemIds: (string | number)[],
    itemsList?: Array<{ wishlist_item_id?: string | number; product_id?: string | number; quantity?: number }>
  ): Promise<BulkAddToCartResult> {
    if (!isFrontendOnly() && this.hasCustomerAuth()) {
      try {
        const res = await apiClient.post<any>("/wishlist/add-selected-to-cart", {
          wishlist_item_ids: itemIds,
          items: itemsList,
        });

        const data = res?.data || {
          added: [],
          unavailable: [],
          failed: [],
          cart_count: 0,
          added_count: 0,
          unavailable_count: 0,
        };

        return {
          success: Boolean(res?.success),
          message: res?.message || (data.added_count > 0 ? `${data.added_count} products added to cart.` : "No items added."),
          data,
        };
      } catch (err: any) {
        if (err?.data?.data) {
          return {
            success: Boolean(err.data.success),
            message: err.data.message || err.message,
            data: err.data.data,
          };
        }
        // If server call fails, fallback to local cart processing below
      }
    }

    if (!this.hasCustomerAuth()) {
      throw new Error("Customer authentication is required to add wishlist items to cart.");
    }

    // Local / Frontend-only bulk add logic
    const localItems = this.getLocal();
    const idSet = new Set(itemIds.map(String));
    const selectedItems = localItems.filter((i) => idSet.has(String(i.id)) || idSet.has(String(i.product_id)));

    const added: Array<{
      wishlist_item_id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number | null;
    }> = [];

    const unavailable: Array<{
      wishlist_item_id: string;
      product_id: string;
      product_name: string;
      reason: string;
    }> = [];

    for (const item of selectedItems) {
      const prod = item.product;
      const isSoldOut = Boolean(prod?.isSoldOut ?? (prod as any)?.is_sold_out);
      const stock = Number(prod?.availableStock !== undefined ? prod.availableStock : (prod?.stock ?? 0));
      const isPreorder = Boolean(prod?.isPreorder ?? (prod as any)?.is_preorder);
      const isOutOfStock = !isPreorder && (stock <= 0 || prod?.in_stock === false);
      const hasPrice = Boolean(
        (prod?.price !== undefined && prod.price !== null && Number(prod.price) > 0) ||
        (prod?.wholesalePrice !== undefined && prod.wholesalePrice !== null && Number(prod.wholesalePrice) > 0) ||
        ((prod as any)?.wholesale_price !== undefined && Number((prod as any)?.wholesale_price) > 0) ||
        ((prod as any)?.has_valid_price)
      );

      if (isSoldOut) {
        unavailable.push({
          wishlist_item_id: String(item.id),
          product_id: String(item.product_id),
          product_name: prod?.name || "Product",
          reason: "Product is sold out",
        });
      } else if (isOutOfStock) {
        unavailable.push({
          wishlist_item_id: String(item.id),
          product_id: String(item.product_id),
          product_name: prod?.name || "Product",
          reason: "Product is out of stock",
        });
      } else if (!hasPrice) {
        unavailable.push({
          wishlist_item_id: String(item.id),
          product_id: String(item.product_id),
          product_name: prod?.name || "Product",
          reason: "Pricing unavailable for ordering",
        });
      } else {
        const moq = Math.max(1, prod?.moq || 10);
        try {
          await cartService.addToCart(prod, "Universal Package", moq);
          added.push({
            wishlist_item_id: String(item.id),
            product_id: String(item.product_id),
            product_name: prod.name,
            quantity: moq,
            unit_price: Number(prod.price || prod.wholesalePrice || 0),
          });
        } catch (e: any) {
          unavailable.push({
            wishlist_item_id: String(item.id),
            product_id: String(item.product_id),
            product_name: prod.name,
            reason: e.message || "Unable to add to cart",
          });
        }
      }
    }

    return {
      success: added.length > 0,
      message: added.length > 0 ? `${added.length} ${added.length === 1 ? "product" : "products"} added to cart.` : "No items added.",
      data: {
        added,
        unavailable,
        failed: [],
        cart_count: added.length,
        added_count: added.length,
        unavailable_count: unavailable.length,
      },
    };
  }

  /**
   * Sync local items to backend after customer login
   */
  async syncLocalWishlist(): Promise<WishlistItemData[]> {
    if (isFrontendOnly() || !this.hasCustomerAuth()) return this.getLocal();

    const localItems = this.getLocal();
    if (localItems.length > 0) {
      let anySucceeded = false;
      for (const item of localItems) {
        try {
          await apiClient.post("/wishlist", { product_id: item.product_id });
          anySucceeded = true;
        } catch {
          // Ignore individual failures
        }
      }
      if (anySucceeded) {
        this.clearLocal();
      }
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
