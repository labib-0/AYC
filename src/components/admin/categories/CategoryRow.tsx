"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Power, Layers } from "lucide-react";
import { CategoryModel } from "@/services/category.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";

interface CategoryRowProps {
  category: CategoryModel;
  onEdit: (category: CategoryModel) => void;
  onToggleStatus: (category: CategoryModel) => void;
  onDelete: (category: CategoryModel) => void;
}

export default function CategoryRow({
  category,
  onEdit,
  onToggleStatus,
  onDelete,
}: CategoryRowProps) {
  const { can } = useAdminAuth();
  const [imgError, setImgError] = useState(false);

  const rawImage = category.image_url || category.image;
  const hasImage = Boolean(rawImage && !imgError);

  const isActive = category.is_active !== false;
  const productCount = category.products_count ?? 0;
  const sortOrder = category.sort_order ?? 0;

  return (
    <tr className="border-b border-border/60 hover:bg-secondary/30 transition-colors group">
        {/* 1. Image Column */}
        <td className="py-3 px-4 w-24">
          <div className="w-16 h-12 rounded-xl bg-card border border-border/80 flex items-center justify-center p-1 overflow-hidden shadow-2xs group-hover:border-foreground/20 transition-colors">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rawImage}
                alt={`${category.name} category`}
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex items-center justify-center text-muted-foreground/40">
                <Layers size={16} strokeWidth={1.5} />
              </div>
            )}
          </div>
        </td>

        {/* 2. Category Column */}
        <td className="py-3 px-4 min-w-[160px]">
          <div>
            <span className="text-xs font-bold text-foreground block">
              {category.name}
            </span>
            {category.description && (
              <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">
                {category.description}
              </span>
            )}
          </div>
        </td>

        {/* 3. Slug Column */}
        <td className="py-3 px-4 font-mono text-xs text-muted-foreground truncate max-w-[140px]">
          {category.slug}
        </td>

        {/* 4. Products Column */}
        <td className="py-3 px-4">
          <span
            className={`inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
              productCount > 0
                ? "bg-secondary text-foreground font-bold"
                : "bg-muted/50 text-muted-foreground"
            }`}
            title={`${productCount} associated ${productCount === 1 ? "product" : "products"}`}
            aria-label={`${productCount} associated ${productCount === 1 ? "product" : "products"}`}
          >
            {productCount}
          </span>
        </td>

        {/* 5. Sort Order Column */}
        <td className="py-3 px-4 text-xs font-mono text-muted-foreground tabular-nums">
          #{sortOrder}
        </td>

        {/* 6. Status Column */}
        <td className="py-3 px-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
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
        </td>

        {/* 7. Actions Column */}
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {/* Edit Button */}
            {can("category.edit") && (
              <button
                type="button"
                onClick={() => onEdit(category)}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Edit category details"
                aria-label={`Edit ${category.name}`}
              >
                <Edit2 size={13} />
              </button>
            )}

            {/* Status Toggle Button */}
            {(can("category.activate") || can("category.deactivate") || can("category.edit")) && (
              <button
                type="button"
                onClick={() => onToggleStatus(category)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isActive
                    ? "border-border bg-card text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                }`}
                title={isActive ? "Deactivate category" : "Activate category"}
                aria-label={isActive ? `Deactivate ${category.name}` : `Activate ${category.name}`}
              >
                <Power size={13} />
              </button>
            )}

            {/* Delete Button */}
            {can("category.delete") && (
              <button
                type="button"
                onClick={() => onDelete(category)}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors cursor-pointer"
                title="Delete category"
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </td>
    </tr>
  );
}
