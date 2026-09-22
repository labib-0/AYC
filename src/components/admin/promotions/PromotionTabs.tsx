import React from "react";
import { Sparkles, Tag } from "lucide-react";

export interface PromotionTabsProps {
  activeTab: "promotions" | "coupons";
  onTabChange: (tab: "promotions" | "coupons") => void;
  promotionsCount: number;
  couponsCount: number;
}

export default function PromotionTabs({
  activeTab,
  onTabChange,
  promotionsCount,
  couponsCount,
}: PromotionTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border/80">
      <button
        type="button"
        onClick={() => onTabChange("promotions")}
        className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
          activeTab === "promotions"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
        id="tab-promotions"
      >
        <Sparkles size={15} />
        <span>Promotions</span>
        <span
          className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
            activeTab === "promotions"
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {promotionsCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("coupons")}
        className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
          activeTab === "coupons"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
        id="tab-coupons"
      >
        <Tag size={15} />
        <span>Coupons</span>
        <span
          className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
            activeTab === "coupons"
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {couponsCount}
        </span>
      </button>
    </div>
  );
}
