"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { RfqItem, B2BProductInput } from "@/types/b2b";
import { Product } from "@/types";

interface RfqContextType {
  rfqItems: RfqItem[];
  addToRfq: (
    product: Product | B2BProductInput,
    quantity: number,
    options?: {
      color?: string;
      size?: string;
      assortedSizesNotes?: string;
      assortedColorsNotes?: string;
      buyerNotes?: string;
      targetPrice?: number;
    }
  ) => void;
  removeFromRfq: (itemId: string) => void;
  updateRfqItemQuantity: (itemId: string, quantity: number) => void;
  updateRfqItemNotes: (itemId: string, notes: string) => void;
  clearRfq: () => void;
  totalRfqCount: number;
}

const RfqContext = createContext<RfqContextType | undefined>(undefined);

const RFQ_CART_STORAGE = "ayaan_b2b_rfq_cart";

export function RfqProvider({ children }: { children: React.ReactNode }) {
  const [rfqItems, setRfqItems] = useState<RfqItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RFQ_CART_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRfqItems(parsed);
        }
      }
    } catch {
      // Ignore
    }
    setIsInitialized(true);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(RFQ_CART_STORAGE, JSON.stringify(rfqItems));
    } catch {
      // Ignore
    }
  }, [rfqItems, isInitialized]);

  const addToRfq = (
    product: Product | B2BProductInput,
    quantity: number,
    options?: {
      color?: string;
      size?: string;
      assortedSizesNotes?: string;
      assortedColorsNotes?: string;
      buyerNotes?: string;
      targetPrice?: number;
    }
  ) => {
    const images = (product as any).images || [(product as any).image_url || "/placeholder.jpg"];
    const moq = (product as any).moq || 50;
    const initialQty = Math.max(quantity, moq);

    const newItem: RfqItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id || `prod_${Date.now()}`,
      productName: product.name,
      productSlug: product.slug,
      brand: product.brand || "Ayaan",
      sku: product.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
      image: images[0] || "/placeholder.jpg",
      category: (product as any).categoryName || (product as any).categoryId,
      audience: (product as any).audience,
      selectedColor: options?.color || (product as any).colorName || "Standard",
      selectedSize: options?.size || "Assorted",
      assortedSizesNotes: options?.assortedSizesNotes,
      assortedColorsNotes: options?.assortedColorsNotes,
      quantity: initialQty,
      moq: moq,
      unitPrice: (product as any).wholesalePrice || (product as any).price || 0,
      targetPrice: options?.targetPrice,
      buyerNotes: options?.buyerNotes,
    };

    setRfqItems((prev) => {
      // Check if same product with same options exists
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.selectedColor === newItem.selectedColor &&
          item.selectedSize === newItem.selectedSize
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }
      return [newItem, ...prev];
    });
  };

  const removeFromRfq = (itemId: string) => {
    setRfqItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateRfqItemQuantity = (itemId: string, quantity: number) => {
    setRfqItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const updateRfqItemNotes = (itemId: string, notes: string) => {
    setRfqItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, buyerNotes: notes } : item))
    );
  };

  const clearRfq = () => {
    setRfqItems([]);
  };

  // Prompt 7: Semantic RFQ count represents distinct items in the RFQ inquiry cart (not piece sum 1550)
  const totalRfqCount = rfqItems.length;

  return (
    <RfqContext.Provider
      value={{
        rfqItems,
        addToRfq,
        removeFromRfq,
        updateRfqItemQuantity,
        updateRfqItemNotes,
        clearRfq,
        totalRfqCount,
      }}
    >
      {children}
    </RfqContext.Provider>
  );
}

export function useRfq() {
  const context = useContext(RfqContext);
  if (!context) {
    throw new Error("useRfq must be used within an RfqProvider");
  }
  return context;
}
