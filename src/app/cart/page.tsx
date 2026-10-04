"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";

export default function CartPage() {
  const { setIsCartOpen } = useCart();
  const router = useRouter();

  useEffect(() => {
    setIsCartOpen(true);
    router.replace("/products");
  }, [setIsCartOpen, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-muted-foreground p-8">
      <div className="animate-pulse font-medium text-sm">Opening Cart...</div>
    </div>
  );
}
