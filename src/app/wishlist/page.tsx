import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import WishlistManager from "@/components/wishlist/WishlistManager";

export const metadata = {
  title: "Wishlist | Ayaan Clothing",
  description: "View and manage your saved wholesale apparel products.",
};

export default function WishlistPage() {
  return (
    <main className="min-h-[80vh] bg-background text-foreground pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-semibold">Saved Items</span>
        </nav>

        <WishlistManager isStorefront={true} />
      </div>
    </main>
  );
}
