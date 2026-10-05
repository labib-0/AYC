"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user || user.role !== "customer") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ayaan_open_checkout", "true");
        sessionStorage.setItem("ayaan_login_notice", "Please log in with a customer account to continue to checkout.");
      }
      router.replace(
        `/login?returnUrl=${encodeURIComponent("/cart?openCheckout=true")}&notice=${encodeURIComponent("Please log in with a customer account to continue to checkout.")}`
      );
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("ayaan_open_checkout", "true");
    }
    router.replace("/cart?openCheckout=true");
  }, [user, loading, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground p-8">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
      <div className="font-medium text-sm">Preparing Checkout...</div>
    </div>
  );
}
