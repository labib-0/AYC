"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/types";
import { wishlistService, WishlistItemData } from "@/services/wishlist.service";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/navigation";

interface WishlistContextType {
  items: WishlistItemData[];
  isInWishlist: (productId: string | number) => boolean;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string | number) => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  isProcessing: (productId: string | number) => boolean;
  totalWishlistItems: number;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const syncingRef = useRef(false);

  const isCustomer = Boolean(user && user.role === "customer");

  const redirectToLogin = useCallback(() => {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem("ayaan_intended_destination", currentPath);
      sessionStorage.setItem(
        "ayaan_login_notice",
        "Please sign in with a customer account to save items to your wishlist."
      );
      router.push(
        `/login?returnUrl=${encodeURIComponent(currentPath)}&notice=${encodeURIComponent(
          "Please sign in with a customer account to save items to your wishlist."
        )}`
      );
    }
  }, [router]);

  const refreshWishlist = useCallback(async () => {
    if (!isCustomer) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const data = await wishlistService.getWishlist();
      setItems(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    if (!isCustomer) {
      setItems([]);
      return;
    }

    if (!syncingRef.current) {
      syncingRef.current = true;
      wishlistService.syncLocalWishlist().then((data) => {
        setItems(data);
        syncingRef.current = false;
      }).catch(() => {
        syncingRef.current = false;
      });
    }
  }, [isCustomer]);

  const isInWishlist = useCallback(
    (productId: string | number) => {
      if (!isCustomer) return false;
      const pid = String(productId);
      return items.some((i) => String(i.product_id) === pid || String(i.product?.id) === pid);
    },
    [isCustomer, items]
  );

  const isProcessing = useCallback(
    (productId: string | number) => {
      const pid = String(productId);
      return processingIds.includes(pid);
    },
    [processingIds]
  );

  const setProcessing = (productId: string | number, active: boolean) => {
    const pid = String(productId);
    setProcessingIds((prev) => (active ? [...prev, pid] : prev.filter((id) => id !== pid)));
  };

  const addToWishlist = async (product: Product) => {
    if (!isCustomer) {
      redirectToLogin();
      return;
    }

    const pid = String(product.id);
    if (isProcessing(pid)) return;

    try {
      setProcessing(pid, true);
      const updated = await wishlistService.addToWishlist(product);
      setItems(updated);
    } finally {
      setProcessing(pid, false);
    }
  };

  const removeFromWishlist = async (productId: string | number) => {
    if (!isCustomer) {
      redirectToLogin();
      return;
    }

    const pid = String(productId);
    if (isProcessing(pid)) return;

    try {
      setProcessing(pid, true);
      const updated = await wishlistService.removeFromWishlist(pid);
      setItems(updated);
    } finally {
      setProcessing(pid, false);
    }
  };

  const toggleWishlist = async (product: Product) => {
    if (!isCustomer) {
      redirectToLogin();
      return;
    }

    const pid = String(product.id);
    if (isProcessing(pid)) return;

    try {
      setProcessing(pid, true);
      const updated = await wishlistService.toggleWishlist(product);
      setItems(updated);
    } finally {
      setProcessing(pid, false);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items: isCustomer ? items : [],
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isProcessing,
        totalWishlistItems: isCustomer ? items.length : 0,
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
