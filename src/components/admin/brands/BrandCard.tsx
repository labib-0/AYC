"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Power, Tag } from "lucide-react";
import { BrandModel } from "@/services/brand.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { TableDragHandle, TableMoveControls } from "@/components/admin/ordered-list";

export interface BrandCardProps {
  brand: BrandModel;
  onEdit: (brand: BrandModel) => void;
  onToggleStatus: (brand: BrandModel) => void;
  onDelete: (brand: BrandModel) => void;
  globalIndex?: number;
  localIndex?: number;
  hasDuplicateSortOrders?: boolean;
  rowVisualClass?: string;
  showReorderControls?: boolean;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  onPointerDown?: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function BrandCard({
  brand,
  onEdit,
  onToggleStatus,
  onDelete,
  globalIndex = 0,
  localIndex = 0,
  hasDuplicateSortOrders = false,
  rowVisualClass = "",
  showReorderControls = false,
  isReorderDisabled = false,
  disabledReason = "Reordering is disabled while search or filters are active.",
  onPointerDown,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: BrandCardProps) {
  const { can } = useAdminAuth();
  const [imgError, setImgError] = useState(false);

  const canReorder = can("brand.edit") || can("brand.manage") || can("brand.reorder");

  const rawLogo = brand.logo_url || brand.logo;
  const cleanRawLogo = rawLogo && !rawLogo.includes("generic.png") && !rawLogo.includes("placeholder") ? rawLogo : null;
  const resolvedLogo = getBrandLogoUrl(brand.name, cleanRawLogo) || cleanRawLogo || "";
  const hasLogo = Boolean(resolvedLogo && !imgError);

  const isActive = brand.is_active !== false;
  const productCount = brand.products_count ?? 0;
  const displaySortOrder = hasDuplicateSortOrders
    ? globalIndex + 1
    : brand.sort_order && brand.sort_order > 0
    ? brand.sort_order
    : globalIndex + 1;

  return (
    <div
      data-ordered-row={showReorderControls ? "" : undefined}
      data-global-index={globalIndex}
      data-index={localIndex}
      className={`p-3.5 rounded-2xl bg-card border border-border/80 space-y-3 shadow-2xs transition-colors ${showReorderControls ? rowVisualClass : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Logo */}
          <div className="w-16 h-10 rounded-xl bg-background border border-border/80 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
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
              <Tag size={14} className="text-muted-foreground/40" />
            )}
          </div>

          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground block truncate">
              {brand.name}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground block truncate">
              /{brand.slug}
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

      {/* Card Footer: Product Count & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex items-center gap-1.5">
          {showReorderControls && canReorder && (
            <TableDragHandle
              globalIndex={globalIndex}
              localIndex={localIndex}
              itemTitle={brand.name}
              disabled={isReorderDisabled}
              disabledReason={disabledReason}
              onPointerDown={onPointerDown || (() => {})}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          )}
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            <strong className="text-foreground font-bold">{productCount}</strong> {productCount === 1 ? "product" : "products"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            #{displaySortOrder}
          </span>
          {showReorderControls && canReorder && onMoveUp && onMoveDown && (
            <TableMoveControls
              globalIndex={globalIndex}
              isFirst={isFirst}
              isLast={isLast}
              disabled={isReorderDisabled}
              disabledReason={disabledReason}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              itemTitle={brand.name}
            />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {can("brand.edit") && (
            <button
              type="button"
              onClick={() => onEdit(brand)}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              aria-label={`Edit ${brand.name}`}
            >
              <Edit2 size={13} />
            </button>
          )}
          {(can("brand.activate") || can("brand.deactivate") || can("brand.edit")) && (
            <button
              type="button"
              onClick={() => onToggleStatus(brand)}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              aria-label={isActive ? `Deactivate ${brand.name}` : `Activate ${brand.name}`}
            >
              <Power size={13} />
            </button>
          )}
          {can("brand.delete") && (
            <button
              type="button"
              onClick={() => onDelete(brand)}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-red-600 text-xs cursor-pointer"
              aria-label={`Delete ${brand.name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
