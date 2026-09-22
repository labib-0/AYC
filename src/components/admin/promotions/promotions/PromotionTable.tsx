/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  SearchX, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ImageIcon, 
  PanelTop 
} from "lucide-react";
import { PromotionRecord } from "@/services/admin/promotion.service";
import PromotionRow from "./PromotionRow";

export interface PromotionTableProps {
  promotions: PromotionRecord[];
  loading: boolean;
  search: string;
  hasActiveFilters: boolean;
  onEdit: (promotion: PromotionRecord) => void;
  onToggleActive: (promotion: PromotionRecord) => void;
  onDelete: (promotion: PromotionRecord) => void;
  onAddPromotion: () => void;
  onResetFilters: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  hero_banner: "Hero Banner",
  top_banner: "Top Banner",
  sidebar_banner: "Sidebar Banner",
  sale_event: "Sale Event",
};

export default function PromotionTable({
  promotions,
  loading,
  search,
  hasActiveFilters,
  onEdit,
  onToggleActive,
  onDelete,
  onAddPromotion,
  onResetFilters,
}: PromotionTableProps) {
  // 1. Loading Skeleton
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-secondary/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Filtered Empty State
  if (promotions.length === 0 && (search || hasActiveFilters)) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
        <div className="p-3 rounded-full bg-secondary text-muted-foreground">
          <SearchX size={24} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">
          No promotions match your current filters
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Try adjusting your search keywords, status filter, or promotion type.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  // 3. Unfiltered Empty State
  if (promotions.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Sparkles size={24} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">
          No promotions yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Create promotional banners, seasonal offers, or discount events to display across the storefront.
        </p>
        <button
          type="button"
          onClick={onAddPromotion}
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
        >
          Create First Promotion
        </button>
      </div>
    );
  }

  // 4. Main Table
  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4 w-20">Image</th>
              <th className="py-3 px-4">Promotion</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Sort Order</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <PromotionRow
                key={promo.id}
                promotion={promo}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden divide-y divide-border/60">
        {promotions.map((promo) => {
          const isHomepageBanner = (promo.type === "hero_banner" || promo.type === "top_banner") && promo.is_active;
          return (
            <div key={promo.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-secondary border border-border/80 flex items-center justify-center shrink-0">
                  {promo.image_url ? (
                    <img
                      src={promo.image_url}
                      alt={promo.title}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-muted-foreground/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground line-clamp-1">
                      {promo.title}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      #{promo.sort_order ?? 0}
                    </span>
                  </div>

                  {promo.subtitle && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {promo.subtitle}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground border border-border/60">
                      {TYPE_LABELS[promo.type] || promo.type}
                    </span>

                    {promo.discount_percentage ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {promo.discount_percentage}% OFF
                      </span>
                    ) : null}

                    {promo.is_active ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={10} />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <XCircle size={10} />
                        <span>Inactive</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isHomepageBanner && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <PanelTop size={12} />
                    <span>Active Homepage Banner</span>
                  </span>
                  <Link
                    href="/admin/homepage"
                    className="text-[11px] font-bold text-primary underline"
                  >
                    Manage Banner →
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => onToggleActive(promo)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer"
                >
                  {promo.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(promo)}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(promo)}
                  className="p-1.5 rounded-lg border border-red-500/20 bg-card hover:bg-red-500/10 text-red-600 dark:text-red-400 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
