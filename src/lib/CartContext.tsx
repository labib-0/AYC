"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product } from "@/types";
import { cartService, CartItemData, CartStockViolation } from "@/services/cart.service";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id?: string;
  product: Product;
  size: string;
  color?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  packageBreakdown?: import("@/types").PackageBreakdown[];
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: string, quantity?: number, variantId?: string, packageBreakdown?: import("@/types").PackageBreakdown[]) => Promise<void>;
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

  const applyCartData = (data: { items: CartItemData[]; total_items: number; subtotal: number }) => {
    const formatted: CartItem[] = data.items.map((i) => ({
      id: i.id,
      product: i.product,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
      packageBreakdown: i.package_breakdown,
    }));
    setItems(formatted);
    setTotalItems(data.total_items);
    setSubtotal(data.subtotal);
  };

  const revalidateCart = useCallback(async (): Promise<CartStockViolation[]> => {
    try {
      const res = await cartService.revalidateCart();
      setStockViolations(res.violations);
      return res.violations;
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
      revalidateCart();
    } catch (err: any) {
      setError(err?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [revalidateCart]);

  // Initial load
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Revalidate whenever cart drawer is opened
  useEffect(() => {
    if (isCartOpen) {
      revalidateCart();
    }
  }, [isCartOpen, revalidateCart]);

  // When user logs in, merge guest cart
  useEffect(() => {
    if (user) {
      cartService.mergeGuestCart().then((merged) => {
        if (merged) {
          applyCartData(merged);
        } else {
          refreshCart();
        }
      });
    }
  }, [user, refreshCart]);

  const addToCart = async (
    product: Product,
    size: string,
    quantity: number = 1,
    variantId?: string,
    packageBreakdown?: import("@/types").PackageBreakdown[]
  ) => {
    try {
      setError(null);
      const data = await cartService.addToCart(product, size, quantity, variantId, packageBreakdown);
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
