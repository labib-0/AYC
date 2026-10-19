"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Product } from "@/types";
import { cartService, CartItemData, CartStockViolation } from "@/services/cart.service";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id?: string;
  product: Product;
  size: string;
  color?: string;
  quantity: number;
  pricingMode?: string;
  pricing_mode?: string;
  unitPrice?: number;
  lineTotal?: number;
  packageBreakdown?: import("@/types").PackageBreakdown[];
}

export const CART_DESELECTED_STORAGE_KEY = "ayc_cart_deselected_keys";

/**
 * Canonical helper to reliably identify cart items across views.
 */
export function getCartItemKey(item: CartItem): string {
  return item.id || `${item.product.id}-${item.size || "default"}`;
}

function getStoredDeselectedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(CART_DESELECTED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

function persistDeselectedKeys(keys: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    if (keys.size === 0) {
      sessionStorage.removeItem(CART_DESELECTED_STORAGE_KEY);
    } else {
      sessionStorage.setItem(CART_DESELECTED_STORAGE_KEY, JSON.stringify(Array.from(keys)));
    }
  } catch {
    // ignore
  }
}

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Product,
    size: string,
    quantity?: number,
    variantId?: string,
    packageBreakdown?: import("@/types").PackageBreakdown[],
    pricingMode?: string
  ) => Promise<void>;
  removeFromCart: (productId: string, size: string, itemId?: string) => Promise<void>;
  updateQuantity: (productId: string, size: string, quantity: number, itemId?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  totalItems: number;
  subtotal: number;
  loading: boolean;
  error: string | null;
  stockViolations: CartStockViolation[];
  revalidateCart: () => Promise<CartStockViolation[]>;
  refreshCart: () => Promise<void>;
  // Selection state & helpers
  selectedKeys: string[];
  setSelectedKeys: React.Dispatch<React.SetStateAction<string[]>>;
  isItemSelected: (key: string) => boolean;
  toggleItemSelection: (key: string) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectedSubtotal: number;
  selectedItems: CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockViolations, setStockViolations] = useState<CartStockViolation[]>([]);
  const mergedUserIdRef = useRef<string | null>(null);

  // Deselected keys memory tracking (stores keys user manually deselected)
  const deselectedKeysRef = useRef<Set<string>>(new Set());
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const hasHydratedDeselectedRef = useRef(false);

  const applyCartData = useCallback((data: { items: CartItemData[]; total_items: number; subtotal: number }) => {
    const formatted: CartItem[] = data.items.map((i) => ({
      id: i.id,
      product: i.product,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      pricingMode: i.pricing_mode,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
      packageBreakdown: i.package_breakdown,
    }));
    setItems(formatted);
    setTotalItems(data.total_items);
    setSubtotal(data.subtotal);
  }, []);

  const revalidateCart = useCallback(async (): Promise<CartStockViolation[]> => {
    try {
      const res = await cartService.revalidateCart();
      const newViolations = res.violations || [];
      setStockViolations((prev) => {
        if (prev.length === 0 && newViolations.length === 0) return prev;
        return newViolations;
      });
      return newViolations;
    } catch {
      return [];
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cartService.getCart();
      applyCartData(data);
      await revalidateCart();
    } catch (err: any) {
      setError(err?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [applyCartData, revalidateCart]);

  // Initial load once on mount
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Revalidate whenever cart drawer is opened
  useEffect(() => {
    if (isCartOpen) {
      revalidateCart();
    }
  }, [isCartOpen, revalidateCart]);

  // When user logs in, merge guest cart once per user
  useEffect(() => {
    if (user?.id) {
      const currentId = String(user.id);
      if (mergedUserIdRef.current === currentId) return;
      mergedUserIdRef.current = currentId;

      cartService.mergeGuestCart().then((merged) => {
        if (merged) {
          applyCartData(merged);
        } else {
          refreshCart();
        }
      });
    } else {
      mergedUserIdRef.current = null;
    }
  }, [user?.id, refreshCart]);

  // Synchronize selection state whenever cart items change
  useEffect(() => {
    if (items.length === 0) {
      setSelectedKeys([]);
      deselectedKeysRef.current.clear();
      persistDeselectedKeys(deselectedKeysRef.current);
      return;
    }

    if (typeof window !== "undefined" && !hasHydratedDeselectedRef.current) {
      deselectedKeysRef.current = getStoredDeselectedKeys();
      hasHydratedDeselectedRef.current = true;
    }

    const currentKeys = items.map(getCartItemKey);
    const validKeySet = new Set(currentKeys);

    // Prune keys from deselected memory that no longer exist in the cart
    let pruned = false;
    for (const key of Array.from(deselectedKeysRef.current)) {
      if (!validKeySet.has(key)) {
        deselectedKeysRef.current.delete(key);
        pruned = true;
      }
    }
    if (pruned) {
      persistDeselectedKeys(deselectedKeysRef.current);
    }

    // Default: Every eligible cart line is selected unless deliberately deselected
    const newSelected = currentKeys.filter((k) => !deselectedKeysRef.current.has(k));
    setSelectedKeys(newSelected);
  }, [items]);

  const toggleItemSelection = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const isSelected = prev.includes(key);
      if (isSelected) {
        deselectedKeysRef.current.add(key);
        persistDeselectedKeys(deselectedKeysRef.current);
        return prev.filter((k) => k !== key);
      } else {
        deselectedKeysRef.current.delete(key);
        persistDeselectedKeys(deselectedKeysRef.current);
        return [...prev, key];
      }
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (items.length === 0) return;
    const allKeys = items.map(getCartItemKey);
    const isAll = selectedKeys.length === items.length;

    if (isAll) {
      allKeys.forEach((k) => deselectedKeysRef.current.add(k));
      persistDeselectedKeys(deselectedKeysRef.current);
      setSelectedKeys([]);
    } else {
      deselectedKeysRef.current.clear();
      persistDeselectedKeys(deselectedKeysRef.current);
      setSelectedKeys(allKeys);
    }
  }, [items, selectedKeys.length]);

  const isItemSelected = useCallback(
    (key: string) => selectedKeys.includes(key),
    [selectedKeys]
  );

  const isAllSelected = items.length > 0 && selectedKeys.length === items.length;
  const isIndeterminate = selectedKeys.length > 0 && selectedKeys.length < items.length;

  const selectedItems = useMemo(() => {
    const keySet = new Set(selectedKeys);
    return items.filter((item) => keySet.has(getCartItemKey(item)));
  }, [items, selectedKeys]);

  const selectedSubtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const lineTotal = item.lineTotal ?? ((item.unitPrice || item.product.price || 0) * item.quantity);
      return sum + lineTotal;
    }, 0);
  }, [selectedItems]);

  const addToCart = async (
    product: Product,
    size: string,
    quantity: number = 1,
    variantId?: string,
    packageBreakdown?: import("@/types").PackageBreakdown[],
    pricingMode?: string
  ) => {
    try {
      setError(null);
      // Remove product key from deselected memory so newly added or incremented lines are automatically selected
      const potentialKey = `${product.id}-${size || "default"}`;
      deselectedKeysRef.current.delete(potentialKey);
      persistDeselectedKeys(deselectedKeysRef.current);

      const data = await cartService.addToCart(product, size, quantity, variantId, packageBreakdown, pricingMode);

      if (data?.items) {
        data.items.forEach((it) => {
          if (String(it.product_id) === String(product.id) && (it.size === size || (!it.size && !size))) {
            if (it.id) deselectedKeysRef.current.delete(it.id);
          }
        });
        persistDeselectedKeys(deselectedKeysRef.current);
      }

      applyCartData(data);
      revalidateCart();
    } catch (err: any) {
      setError(err?.message || "Failed to add item to cart");
      throw err;
    }
  };

  const removeFromCart = async (productId: string, size: string, itemId?: string) => {
    try {
      setError(null);
      if (itemId) {
        deselectedKeysRef.current.delete(itemId);
      }
      deselectedKeysRef.current.delete(`${productId}-${size || "default"}`);
      persistDeselectedKeys(deselectedKeysRef.current);

      const data = await cartService.removeFromCart(productId, size, itemId);
      applyCartData(data);
      revalidateCart();
    } catch (err: any) {
      setError(err?.message || "Failed to remove item");
    }
  };

  const updateQuantity = async (
    productId: string,
    size: string,
    quantity: number,
    itemId?: string
  ) => {
    try {
      setError(null);
      const data = await cartService.updateQuantity(productId, size, quantity, itemId);
      applyCartData(data);
      revalidateCart();
    } catch (err: any) {
      setError(err?.message || "Failed to update quantity");
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      setError(null);
      await cartService.clearCart();
      deselectedKeysRef.current.clear();
      persistDeselectedKeys(deselectedKeysRef.current);
      setSelectedKeys([]);
      setItems([]);
      setTotalItems(0);
      setSubtotal(0);
      setStockViolations([]);
    } catch (err: any) {
      setError(err?.message || "Failed to clear cart");
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalItems,
        subtotal,
        loading,
        error,
        stockViolations,
        revalidateCart,
        refreshCart,
        selectedKeys,
        setSelectedKeys,
        isItemSelected,
        toggleItemSelection,
        toggleSelectAll,
        isAllSelected,
        isIndeterminate,
        selectedSubtotal,
        selectedItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

