"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product } from "@/types";
import { wishlistService, WishlistItemData } from "@/services/wishlist.service";
import { useAuth } from "./AuthContext";

interface WishlistContextType {
  items: WishlistItemData[];
  isInWishlist: (productId: string | number) => boolean;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string | number) => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  totalWishlistItems: number;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItemData[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wishlistService.getWishlist();
      setItems(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      wishlistService.clearLocal();
      return;
    }
    refreshWishlist();
  }, [user, refreshWishlist]);

  const isInWishlist = useCallback(
    (productId: string | number) => {
      if (!user) return false;
      return items.some((i) => String(i.product_id) === String(productId));
    },
    [user, items]
  );

  const addToWishlist = async (product: Product) => {
    if (!user) return;
    const updated = await wishlistService.addToWishlist(product);
    setItems(updated);
  };

  const removeFromWishlist = async (productId: string | number) => {
    if (!user) return;
    const updated = await wishlistService.removeFromWishlist(String(productId));
    setItems(updated);
  };

  const toggleWishlist = async (product: Product) => {
    if (!user) return;
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items: user ? items : [],
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        totalWishlistItems: user ? items.length : 0,
        loading,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
