"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Power, Layers } from "lucide-react";
import { CategoryModel } from "@/services/category.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface CategoryCardProps {
  category: CategoryModel;
  onEdit: (category: CategoryModel) => void;
  onToggleStatus: (category: CategoryModel) => void;
  onDelete: (category: CategoryModel) => void;
}

export default function CategoryCard({
  category,
  onEdit,
  onToggleStatus,
  onDelete,
}: CategoryCardProps) {
  const { can } = useAdminAuth();
  const [imgError, setImgError] = useState(false);

  const rawImage = category.image_url || category.image;
  const hasImage = Boolean(rawImage && !imgError);

  const isActive = category.is_active !== false;
  const productCount = category.products_count ?? 0;
  const sortOrder = category.sort_order ?? 0;

  return (
    <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Image */}
          <div className="w-14 h-11 rounded-xl bg-background border border-border/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rawImage}
                alt={`${category.name} preview`}
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <Layers size={14} className="text-muted-foreground/40" />
            )}
          </div>

          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground block truncate">
              {category.name}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground block truncate">
              /{category.slug}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            isActive
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-muted-foreground"
            }`}
          />
          <span>{isActive ? "Active" : "Inactive"}</span>
        </span>
      </div>

      {/* Card Footer: Product Count, Sort Order, Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            <strong className="text-foreground font-bold">{productCount}</strong> {productCount === 1 ? "product" : "products"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            #{sortOrder}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {can("category.edit") && (
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              aria-label={`Edit ${category.name}`}
            >
              <Edit2 size={13} />
            </button>
          )}
          {(can("category.activate") || can("category.deactivate") || can("category.edit")) && (
            <button
              type="button"
              onClick={() => onToggleStatus(category)}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              aria-label={isActive ? `Deactivate ${category.name}` : `Activate ${category.name}`}
            >
              <Power size={13} />
            </button>
          )}
          {can("category.delete") && (
            <button
              type="button"
              onClick={() => onDelete(category)}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-red-600 text-xs cursor-pointer"
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
