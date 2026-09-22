import { Product } from "@/types";

export interface CartItemData {
  id: string;
  cart_id?: string;
  product_id: string;
  product_variant_id?: string;
  product: Product;
  size: string;
  color?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  package_breakdown?: import("@/types").PackageBreakdown[];
}

export interface CartData {
  id?: string;
  user_id?: number | string | null;
  session_id?: string;
  items: CartItemData[];
  total_items: number;
  subtotal: number;
  currency: string;
}

export class CartService {
  private localKey = "ayaan_cart";

  /**
   * Determine exact unit price based on three-tier wholesale pricing model
   */
  public calculateTierUnitPrice(product: Product, quantity: number): number {
    const basePrice = product.wholesalePrice || product.price || 15;
    const bulkThreshold = product.bulkThreshold || 200;
    const bulkPrice = product.bulkPrice || Math.round(basePrice * 0.8 * 100) / 100;
    const fullStockPrice = product.fullStockPrice || Math.round(basePrice * 0.7 * 100) / 100;
    const availableStock = product.availableStock || 1000;

    if (quantity >= availableStock && availableStock > 0) {
      return fullStockPrice;
    }
    if (quantity >= bulkThreshold) {
      return bulkPrice;
    }
    return basePrice;
  }

  /**
   * Get user's active cart
   */
  async getCart(): Promise<CartData> {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(this.localKey);
        if (saved) {
          const rawItems = JSON.parse(saved);
          if (Array.isArray(rawItems)) {
            const items = rawItems.map((i: any) => this.normalizeCartItem(i));
            const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
            const subtotal = items.reduce((sum, item) => sum + ((item.unit_price || item.product.price) * item.quantity), 0);
            return { items, total_items, subtotal, currency: "USD" };
          }
        }
      } catch {
        // Ignore
      }
    }

    return { items: [], total_items: 0, subtotal: 0, currency: "USD" };
  }

  /**
   * Add item to cart
   */
  async addToCart(
    product: Product,
    size: string,
    quantity: number = 1,
    variantId?: string,
    packageBreakdown?: import("@/types").PackageBreakdown[]
  ): Promise<CartData> {
    const currentCart = await this.getCart();
    const items = [...currentCart.items];
    const existingIndex = items.findIndex(
      (item) => String(item.product.id) === String(product.id) && item.size === (size || "Standard Assorted")
    );

    const unitPrice = this.calculateTierUnitPrice(product, quantity);

    if (existingIndex > -1) {
      const newQty = items[existingIndex].quantity + quantity;
      const newUnitPrice = this.calculateTierUnitPrice(product, newQty);
      items[existingIndex].quantity = newQty;
      items[existingIndex].unit_price = newUnitPrice;
      items[existingIndex].line_total = newUnitPrice * newQty;
      if (packageBreakdown) items[existingIndex].package_breakdown = packageBreakdown;
    } else {
      items.push({
        id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: String(product.id),
        product_variant_id: variantId,
        product,
        size: size || "Standard Assorted",
        quantity,
        unit_price: unitPrice,
        line_total: unitPrice * quantity,
        package_breakdown: packageBreakdown,
      });
    }

    this.saveLocal(items);
    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + ((item.unit_price || item.product.price) * item.quantity), 0);
    return { items, total_items, subtotal, currency: "USD" };
  }

  /**
   * Update item quantity in cart
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<CartData> {
    const currentCart = await this.getCart();
    let items = [...currentCart.items];

    if (quantity <= 0) {
      items = items.filter((item) => item.id !== itemId && String(item.product.id) !== itemId);
    } else {
      const idx = items.findIndex((item) => item.id === itemId || String(item.product.id) === itemId);
      if (idx > -1) {
        const product = items[idx].product;
        const newUnitPrice = this.calculateTierUnitPrice(product, quantity);
        items[idx].quantity = quantity;
        items[idx].unit_price = newUnitPrice;
        items[idx].line_total = newUnitPrice * quantity;
      }
    }

    this.saveLocal(items);
    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + ((item.unit_price || item.product.price) * item.quantity), 0);
    return { items, total_items, subtotal, currency: "USD" };
  }

  /**
   * Remove item from cart by ID or Product ID + Size
   */
  async removeFromCart(productId: string, _size?: string, itemId?: string): Promise<CartData> {
    const targetId = itemId || productId;
    return this.updateItemQuantity(targetId, 0);
  }

  /**
   * Update quantity alias for CartContext
   */
  async updateQuantity(productId: string, _size: string, quantity: number, itemId?: string): Promise<CartData> {
    const targetId = itemId || productId;
    return this.updateItemQuantity(targetId, quantity);
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string): Promise<CartData> {
    return this.updateItemQuantity(itemId, 0);
  }

  /**
   * Merge guest cart upon user login
   */
  async mergeGuestCart(): Promise<CartData | null> {
    return this.getCart();
  }

  /**
   * Clear all items from cart
   */
  async clearCart(): Promise<CartData> {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.localKey);
        window.dispatchEvent(new CustomEvent("ayaan:cart-updated", { detail: [] }));
      } catch {
        // Ignore
      }
    }

    return { items: [], total_items: 0, subtotal: 0, currency: "USD" };
  }

  private normalizeCartItem(raw: any): CartItemData {
    const rawProd = raw.product || {};
    const images = Array.isArray(rawProd.images) && rawProd.images.length > 0
      ? rawProd.images
      : [rawProd.image_url || rawProd.image || "/placeholder.jpg"];

    const price = rawProd.price !== undefined
      ? Number(rawProd.price)
      : Number(rawProd.wholesale_price) || 15;

    const product: Product = {
      id: String(rawProd.id || raw.product_id || ""),
      name: rawProd.name || "Product",
      slug: rawProd.slug || "product",
      price: price,
      oldPrice: rawProd.oldPrice ?? rawProd.msrp_price ?? null,
      wholesalePrice: rawProd.wholesalePrice ?? rawProd.wholesale_price ?? price,
      standardPrice: rawProd.standardPrice ?? rawProd.wholesale_price ?? price,
      bulkThreshold: rawProd.bulkThreshold ?? rawProd.bulk_threshold ?? 200,
      bulkPrice: rawProd.bulkPrice ?? rawProd.bulk_price ?? Math.round(price * 0.8 * 100) / 100,
      fullStockPrice: rawProd.fullStockPrice ?? rawProd.full_stock_price ?? Math.round(price * 0.7 * 100) / 100,
      categoryId: rawProd.categoryId || "c_sweaters",
      images: images,
      brand: rawProd.brand || "Ayaan",
      color: rawProd.color || rawProd.color_name,
      sku: rawProd.sku || "",
      sizes: rawProd.sizes || ["One Size"],
      moq: rawProd.moq ? Number(rawProd.moq) : 10,
      availableStock: rawProd.stock || rawProd.availableStock || 1000,
    };

    const quantity = Number(raw.quantity) || 1;
    const unitPrice = raw.unit_price !== undefined
      ? Number(raw.unit_price)
      : this.calculateTierUnitPrice(product, quantity);

    return {
      id: String(raw.id || `ci_${Date.now()}`),
      cart_id: raw.cart_id,
      product_id: String(raw.product_id || product.id),
      product_variant_id: raw.product_variant_id,
      product,
      size: raw.size || "Standard Assorted",
      color: raw.color,
      quantity,
      unit_price: unitPrice,
      line_total: raw.line_total !== undefined ? Number(raw.line_total) : unitPrice * quantity,
      package_breakdown: raw.package_breakdown,
    };
  }

  private saveLocal(items: CartItemData[]) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.localKey, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent("ayaan:cart-updated", { detail: items }));
      } catch {
        // Ignore
      }
    }
  }
}

export const cartService = new CartService();
