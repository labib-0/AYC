"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Power, ExternalLink, Tag } from "lucide-react";
import { BrandModel } from "@/services/brand.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { TableDragHandle, TableMoveControls } from "@/components/admin/ordered-list";

interface BrandRowProps {
  brand: BrandModel;
  onEdit: (brand: BrandModel) => void;
  onToggleStatus: (brand: BrandModel) => void;
  onDelete: (brand: BrandModel) => void;
  globalIndex?: number;
  localIndex?: number;
  hasDuplicateSortOrders?: boolean;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  onPointerDown?: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  rowVisualClass?: string;
}

export default function BrandRow({
  brand,
  onEdit,
  onToggleStatus,
  onDelete,
  globalIndex = 0,
  localIndex = 0,
  hasDuplicateSortOrders = false,
  isReorderDisabled = false,
  disabledReason = "Reordering is disabled while search or filters are active.",
  onPointerDown,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  rowVisualClass = "",
}: BrandRowProps) {
  const { can } = useAdminAuth();
  const [imgError, setImgError] = useState(false);

  const canReorder = can("brand.edit") || can("brand.manage") || can("brand.reorder");

  // Resolve logo using explicit brand logo, falling back to brand logo dictionary
  const rawLogo = brand.logo_url || brand.logo;
  const resolvedLogo = getBrandLogoUrl(brand.name, rawLogo) || rawLogo || "";
  const hasLogo = Boolean(resolvedLogo && !imgError);

  const isActive = brand.is_active !== false;
  const productCount = brand.products_count ?? 0;
  // Calculate deterministic 1-based sequence position if sort_order is duplicate, zero, or unassigned
  const displaySortOrder = hasDuplicateSortOrders
    ? globalIndex + 1
    : brand.sort_order && brand.sort_order > 0
    ? brand.sort_order
    : globalIndex + 1;

  return (
    <tr
      data-ordered-row
      data-global-index={globalIndex}
      data-index={localIndex}
      className={`border-b border-border/60 hover:bg-secondary/30 transition-colors group ${rowVisualClass}`}
    >
      {/* 0. Reorder Drag Handle Column */}
      <td className="py-3 px-2 w-10 text-center">
        <TableDragHandle
          globalIndex={globalIndex}
          localIndex={localIndex}
          itemTitle={brand.name}
          disabled={!canReorder || isReorderDisabled}
          disabledReason={
            !canReorder
              ? "You do not have permission to reorder brands."
              : disabledReason
          }
          onPointerDown={onPointerDown || (() => {})}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </td>

      {/* 1. Logo Column */}
      <td className="py-3 px-4 w-28">
        <div className="w-20 h-11 rounded-xl bg-card border border-border/80 flex items-center justify-center p-1.5 overflow-hidden shadow-2xs group-hover:border-foreground/20 transition-colors">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedLogo}
              alt={`${brand.name} logo`}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground/40">
              <Tag size={16} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </td>

      {/* 2. Brand Column */}
      <td className="py-3 px-4 min-w-[160px]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground block">
            {brand.name}
          </span>
          {brand.website && (
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/60 hover:text-foreground transition-colors"
              title={`Visit ${brand.website}`}
              aria-label={`Official website for ${brand.name}`}
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        {!hasDuplicateSortOrders && brand.sort_order !== undefined && brand.sort_order > 0 && (
          <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
            Priority: {brand.sort_order}
          </span>
        )}
      </td>

      {/* 3. Slug Column */}
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground truncate max-w-[140px]">
        {brand.slug}
      </td>

      {/* 4. Products Column */}
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
            productCount > 0
              ? "bg-secondary text-foreground font-bold"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {productCount} {productCount === 1 ? "product" : "products"}
        </span>
      </td>

      {/* 5. Sort Order Column */}
      <td className="py-3 px-4 text-xs font-mono text-muted-foreground tabular-nums">
        <div className="flex items-center gap-2">
          <span
            title={
              hasDuplicateSortOrders
                ? `Position #${displaySortOrder} (raw sort_order: ${brand.sort_order ?? 0})`
                : `Sort Order #${displaySortOrder}`
            }
          >
            #{displaySortOrder}
          </span>
          {onMoveUp && onMoveDown && (
            <TableMoveControls
              globalIndex={globalIndex}
              isFirst={isFirst}
              isLast={isLast}
              disabled={!canReorder || isReorderDisabled}
              disabledReason={
                !canReorder
                  ? "You do not have permission to reorder brands."
                  : disabledReason
              }
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              itemTitle={brand.name}
            />
          )}
        </div>
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

      {/* 6. Actions Column */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Edit Button */}
          {can("brand.edit") && (
            <button
              type="button"
              onClick={() => onEdit(brand)}
              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Edit brand details"
              aria-label={`Edit ${brand.name}`}
            >
              <Edit2 size={13} />
            </button>
          )}

          {/* Status Toggle Button */}
          {(can("brand.activate") || can("brand.deactivate") || can("brand.edit")) && (
            <button
              type="button"
              onClick={() => onToggleStatus(brand)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isActive
                  ? "border-border bg-card text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              }`}
              title={isActive ? "Deactivate brand" : "Activate brand"}
              aria-label={isActive ? `Deactivate ${brand.name}` : `Activate ${brand.name}`}
            >
              <Power size={13} />
            </button>
          )}

          {/* Delete Button */}
          {can("brand.delete") && (
            <button
              type="button"
              onClick={() => onDelete(brand)}
              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors cursor-pointer"
              title="Delete brand"
              aria-label={`Delete ${brand.name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
