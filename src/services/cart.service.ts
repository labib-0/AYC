import { Product } from "@/types";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { apiClient } from "./api-client";

export class InsufficientStockError extends Error {
  errorCode: string = "INSUFFICIENT_STOCK";
  productId?: string | number;
  productName?: string;
  variantId?: string | number;
  size?: string;
  requestedQuantity: number;
  availableQuantity: number;

  constructor(
    message: string,
    details: {
      productId?: string | number;
      productName?: string;
      variantId?: string | number;
      size?: string;
      requestedQuantity: number;
      availableQuantity: number;
    }
  ) {
    super(message);
    this.name = "InsufficientStockError";
    this.productId = details.productId;
    this.productName = details.productName;
    this.variantId = details.variantId;
    this.size = details.size;
    this.requestedQuantity = details.requestedQuantity;
    this.availableQuantity = details.availableQuantity;
  }
}

export class InvalidMoqMultipleError extends Error {
  errorCode: string = "INVALID_MOQ_MULTIPLE";
  productId?: string | number;
  productName?: string;
  moq: number;
  requestedQuantity: number;

  constructor(
    message: string,
    details: {
      productId?: string | number;
      productName?: string;
      moq: number;
      requestedQuantity: number;
      errorCode?: string;
    }
  ) {
    super(message);
    this.name = "InvalidMoqMultipleError";
    this.errorCode = details.errorCode || "INVALID_MOQ_MULTIPLE";
    this.productId = details.productId;
    this.productName = details.productName;
    this.moq = details.moq;
    this.requestedQuantity = details.requestedQuantity;
  }
}

export interface CartStockViolation {
  item_id?: string;
  product_id: string | number;
  product_name: string;
  variant_id?: string | number;
  size?: string;
  color?: string;
  sku?: string;
  requested_quantity: number;
  available_quantity: number;
  moq?: number;
  error_code?: string;
  message: string;
}

export interface CartRevalidationResult {
  isValid: boolean;
  violations: CartStockViolation[];
  items: CartItemData[];
}

export interface CartItemData {
  id: string;
  cart_id?: string;
  product_id: string;
  product_variant_id?: string;
  product: Product;
  size: string;
  color?: string;
  quantity: number;
  pricing_mode?: string;
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
   * Determine exact unit price based on three-tier wholesale pricing model:
   * FULL STOCK OPTION:
   *   Available Inventory > Minimum Bulk Order Quantity
   *     ├── YES -> full_stock_price
   *     └── NO  -> normal MOQ / standard applicable price
   */
  public calculateTierUnitPrice(product: Product, quantity: number, pricingMode?: string): number {
    const basePrice = product.wholesalePrice || product.price || 15;
    const bulkThreshold = product.bulkThreshold || 200;
    const bulkPrice = product.bulkPrice || Math.round(basePrice * 0.8 * 100) / 100;
    const configuredFullStockPrice = product.configuredFullStockPrice ?? product.fullStockPrice;
    const availableStock = product.availableStock ?? 0;
    const moqVal = product.moq || 1;
    const maxCompletePackages = product.maxCompletePackages ?? Math.floor(availableStock / moqVal);
    const completeStock = product.completePackageStock ?? (maxCompletePackages * moqVal);

    if (pricingMode === "full_stock" || (availableStock > 0 && (quantity === availableStock || (completeStock > 0 && quantity === completeStock)))) {
      if (availableStock > bulkThreshold && configuredFullStockPrice !== undefined && configuredFullStockPrice !== null && configuredFullStockPrice > 0) {
        return Math.min(configuredFullStockPrice, basePrice);
      }
      return basePrice;
    }

    if (quantity >= bulkThreshold || pricingMode === "bulk") {
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
            let items = rawItems.map((i: any) => this.normalizeCartItem(i));

            // In full-stack mode, sanitize legacy mock items (e.g., "prd0010")
            if (!isFrontendOnly()) {
              const sanitized = items.filter((item) => {
                const pid = String(item.product_id || item.product?.id || "");
                return pid && !pid.startsWith("prd") && (/^\d+$/.test(pid) || Boolean(item.product?.slug));
              });
              if (sanitized.length !== items.length) {
                this.saveLocal(sanitized);
                items = sanitized;
              }
            }

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
   * Add item to cart with authoritative backend validation
   */
  async addToCart(
    product: Product,
    size: string,
    quantity: number = 1,
    variantId?: string,
    packageBreakdown?: import("@/types").PackageBreakdown[],
    pricingMode?: string
  ): Promise<CartData> {
    const currentCart = await this.getCart();
    const items = [...currentCart.items];
    const existingIndex = items.findIndex(
      (item) => String(item.product.id) === String(product.id) && item.size === (size || "Standard Assorted")
    );

    const newQty = existingIndex > -1 ? items[existingIndex].quantity + quantity : quantity;

    // Authoritative backend validation
    if (!isFrontendOnly()) {
      try {
        await apiClient.post("/cart/items", {
          product_id: product.id,
          product_variant_id: variantId,
          variant_id: variantId,
          size: size || "Standard Assorted",
          quantity: quantity,
          pricing_mode: pricingMode,
        });
      } catch (err: any) {
        const errorData = err?.data?.data || err?.data;
        if (err?.data?.error_code === "INSUFFICIENT_STOCK" || errorData?.available_quantity !== undefined) {
          const avail = errorData?.available_quantity ?? 0;
          const req = errorData?.requested_quantity ?? newQty;
          const sizeName = size && size !== "Standard Assorted" && size !== "Assorted" ? ` size ${size}` : "";
          throw new InsufficientStockError(
            err.message || `Insufficient stock for '${product.name}'${sizeName}. Requested: ${req}, Available: ${avail}.`,
            {
              productId: product.id,
              productName: product.name,
              variantId: variantId,
              size: size || "Standard Assorted",
              requestedQuantity: req,
              availableQuantity: avail,
            }
          );
        }
        if (
          err?.data?.error_code === "INVALID_MOQ_MULTIPLE" ||
          err?.data?.error_code === "BELOW_MOQ" ||
          errorData?.code === "INVALID_MOQ_MULTIPLE" ||
          errorData?.code === "BELOW_MOQ"
        ) {
          const effectiveMoq = Number(errorData?.moq || product.moq || 1);
          throw new InvalidMoqMultipleError(
            err?.message || `Order quantity must be an exact multiple of the MOQ (${effectiveMoq} pcs).`,
            {
              productId: product.id,
              productName: product.name,
              moq: effectiveMoq,
              requestedQuantity: errorData?.requested_quantity ?? newQty,
              errorCode: err?.data?.error_code || errorData?.code,
            }
          );
        }
        throw err;
      }
    }

    const unitPrice = this.calculateTierUnitPrice(product, quantity, pricingMode);

    if (existingIndex > -1) {
      const effectiveMode = pricingMode ?? items[existingIndex].pricing_mode;
      const newUnitPrice = this.calculateTierUnitPrice(product, newQty, effectiveMode);
      items[existingIndex].quantity = newQty;
      if (pricingMode) items[existingIndex].pricing_mode = pricingMode;
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
        pricing_mode: pricingMode,
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
   * Update item quantity in cart with authoritative backend validation
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<CartData> {
    const currentCart = await this.getCart();
    let items = [...currentCart.items];
    const targetItem = items.find((item) => item.id === itemId || String(item.product.id) === itemId);

    if (quantity > 0 && targetItem && !isFrontendOnly()) {
      try {
        await apiClient.put("/cart/items", {
          item_id: targetItem.id,
          product_id: targetItem.product_id,
          product_variant_id: targetItem.product_variant_id,
          size: targetItem.size,
          quantity: quantity,
        });
      } catch (err: any) {
        const errorData = err?.data?.data || err?.data;
        if (err?.data?.error_code === "INSUFFICIENT_STOCK" || errorData?.available_quantity !== undefined) {
          const avail = errorData?.available_quantity ?? 0;
          const req = errorData?.requested_quantity ?? quantity;
          const sizeName = targetItem.size && targetItem.size !== "Standard Assorted" && targetItem.size !== "Assorted" ? ` size ${targetItem.size}` : "";
          throw new InsufficientStockError(
            err.message || `Insufficient stock for '${targetItem.product.name}'${sizeName}. Requested: ${req}, Available: ${avail}.`,
            {
              productId: targetItem.product.id,
              productName: targetItem.product.name,
              variantId: targetItem.product_variant_id,
              size: targetItem.size,
              requestedQuantity: req,
              availableQuantity: avail,
            }
          );
        }
        if (
          err?.data?.error_code === "INVALID_MOQ_MULTIPLE" ||
          err?.data?.error_code === "BELOW_MOQ" ||
          errorData?.code === "INVALID_MOQ_MULTIPLE" ||
          errorData?.code === "BELOW_MOQ"
        ) {
          const effectiveMoq = Number(errorData?.moq || targetItem.product.moq || 1);
          throw new InvalidMoqMultipleError(
            err?.message || `Order quantity must be an exact multiple of the MOQ (${effectiveMoq} pcs).`,
            {
              productId: targetItem.product.id,
              productName: targetItem.product.name,
              moq: effectiveMoq,
              requestedQuantity: errorData?.requested_quantity ?? quantity,
              errorCode: err?.data?.error_code || errorData?.code,
            }
          );
        }
        throw err;
      }
    }

    if (quantity <= 0) {
      items = items.filter((item) => item.id !== itemId && String(item.product.id) !== itemId);
      if (!isFrontendOnly() && targetItem) {
        apiClient.delete("/cart/items", {
          params: { product_id: targetItem.product_id, size: targetItem.size },
        }).catch(() => {});
      }
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
   * Revalidate all items in cart against live backend inventory
   */
  async revalidateCart(): Promise<CartRevalidationResult> {
    const cart = await this.getCart();
    if (cart.items.length === 0) {
      return { isValid: true, violations: [], items: [] };
    }

    if (!isFrontendOnly()) {
      try {
        const payload = cart.items.map((it) => ({
          id: it.id,
          product_id: it.product_id,
          variant_id: it.product_variant_id,
          size: it.size,
          quantity: it.quantity,
        }));

        const res = await apiClient.post<any>("/cart/revalidate", { items: payload });
        const violations: CartStockViolation[] = res?.violations || [];
        const isValid = res?.is_valid ?? (violations.length === 0);

        return {
          isValid,
          violations,
          items: cart.items,
        };
      } catch (err) {
        console.warn("Cart revalidation failed:", err);
      }
    }

    return { isValid: true, violations: [], items: cart.items };
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
      oldPrice: rawProd.oldPrice ?? null,
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
    const pricingMode = raw.pricing_mode || raw.pricingMode || undefined;
    const unitPrice = raw.unit_price !== undefined
      ? Number(raw.unit_price)
      : this.calculateTierUnitPrice(product, quantity, pricingMode);

    return {
      id: String(raw.id || `ci_${Date.now()}`),
      cart_id: raw.cart_id,
      product_id: String(raw.product_id || product.id),
      product_variant_id: raw.product_variant_id,
      product,
      size: raw.size || "Standard Assorted",
      color: raw.color,
      quantity,
      pricing_mode: pricingMode,
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
