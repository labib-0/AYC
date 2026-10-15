"use client";

import React from "react";
import { B2BProductInput } from "@/types/b2b";
import ProductTableRow from "./ProductTableRow";
import { PackageX, RefreshCw, AlertCircle, X } from "lucide-react";

interface ProductTableProps {
  products: B2BProductInput[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onTogglePublish: (product: B2BProductInput) => void;
  onToggleStorefrontVisibility?: (product: B2BProductInput) => void;
  onDuplicate: (product: B2BProductInput) => void;
  onDelete: (product: B2BProductInput) => void;
  onAdjustStock?: (product: B2BProductInput) => void;
  onViewStockHistory?: (product: B2BProductInput) => void;
  onMarkSoldOut?: (product: B2BProductInput) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  startIndex?: number;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  onPointerDown?: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  onMoveUp?: (globalIndex: number) => void;
  onMoveDown?: (globalIndex: number) => void;
  isFirstItem?: (globalIndex: number) => boolean;
  isLastItem?: (globalIndex: number) => boolean;
  getRowVisualClass?: (globalIndex: number) => string;
  pagination?: React.ReactNode;
}

interface ColumnDef {
  key: string;
  label: React.ReactNode;
  title?: string;
  width?: string;
  colWidthClass: string;
  thClass: string;
}

export const PRODUCT_COLUMNS: ColumnDef[] = [
  {
    key: "reorder",
    label: "",
    width: "36px",
    colWidthClass: "w-9",
    thClass: "px-1 py-2 w-9 text-center",
  },
  {
    key: "select",
    label: "",
    width: "32px",
    colWidthClass: "w-8",
    thClass: "px-1.5 py-2 w-8 text-center",
  },
  {
    key: "thumbnail",
    label: "Image",
    title: "Product Thumbnail",
    width: "42px",
    colWidthClass: "w-[42px]",
    thClass: "px-1 py-2 w-[42px] text-center",
  },
  {
    key: "productId",
    label: "ID",
    title: "Product Identifier",
    width: "82px",
    colWidthClass: "w-[82px]",
    thClass: "px-1.5 py-2 w-[82px] text-center",
  },
  {
    key: "product",
    label: "Product",
    colWidthClass: "min-w-[190px] w-auto",
    thClass: "px-2.5 py-2 text-left",
  },
  {
    key: "sku",
    label: "SKU",
    title: "Stock Keeping Unit",
    width: "110px",
    colWidthClass: "w-[110px]",
    thClass: "px-2 py-2 w-[110px] text-left",
  },
  {
    key: "brand",
    label: "Brand",
    width: "92px",
    colWidthClass: "w-[92px]",
    thClass: "px-1.5 py-2 w-[92px] text-left",
  },
  {
    key: "category",
    label: "Category",
    width: "86px",
    colWidthClass: "w-[86px]",
    thClass: "px-1.5 py-2 w-[86px] text-left",
  },
  {
    key: "audience",
    label: "Audience",
    width: "64px",
    colWidthClass: "w-[64px]",
    thClass: "px-1.5 py-2 w-[64px] text-left",
  },
  {
    key: "price",
    label: "Price",
    width: "58px",
    colWidthClass: "w-[58px]",
    thClass: "px-1.5 py-2 w-[58px] text-right",
  },
  {
    key: "moq",
    label: "MOQ",
    title: "Minimum Order Quantity",
    width: "50px",
    colWidthClass: "w-[50px]",
    thClass: "px-1.5 py-2 w-[50px] text-right",
  },
  {
    key: "stock",
    label: "Stock",
    title: "Available Stock",
    width: "66px",
    colWidthClass: "w-[66px]",
    thClass: "px-1.5 py-2 w-[66px] text-right",
  },
  {
    key: "availableMoqs",
    label: "MOQs",
    title: "Available Complete MOQs",
    width: "68px",
    colWidthClass: "w-[68px]",
    thClass: "px-1.5 py-2 w-[68px] text-right",
  },
  {
    key: "status",
    label: "Status",
    width: "80px",
    colWidthClass: "w-[80px]",
    thClass: "px-1.5 py-2 w-[80px] text-left",
  },
  {
    key: "actions",
    label: "Actions",
    width: "86px",
    colWidthClass: "w-[86px]",
    thClass: "px-1.5 py-2 w-[86px] text-center sticky right-0 bg-secondary/80 backdrop-blur-xs z-10",
  },
];

export default function ProductTable({
  products,
  loading,
  error,
  selectedIds,
  onSelect,
  onSelectAll,
  onTogglePublish,
  onToggleStorefrontVisibility,
  onDuplicate,
  onDelete,
  onAdjustStock,
  onViewStockHistory,
  onMarkSoldOut,
  onRetry,
  onClearFilters,
  hasActiveFilters,
  startIndex = 0,
  isReorderDisabled = false,
  disabledReason,
  onPointerDown,
  onMoveUp,
  onMoveDown,
  isFirstItem,
  isLastItem,
  getRowVisualClass,
  pagination,
}: ProductTableProps) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = products.some((p) => selectedIds.has(p.id)) && !allSelected;

  // Loading skeleton
  if (loading) {
    return (
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              {PRODUCT_COLUMNS.map((col) => (
                <col
                  key={col.key}
                  className={col.colWidthClass}
                  style={col.width ? { width: col.width } : undefined}
                />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                {PRODUCT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={col.thClass}
                    style={col.width ? { width: col.width } : undefined}
                    title={col.title}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {col.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="px-1 py-1.5 w-9 text-center" style={{ width: "36px" }}>
                    <div className="w-5 h-5 rounded bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 w-8 text-center" style={{ width: "32px" }}>
                    <div className="w-3.5 h-3.5 rounded bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-1 py-1.5 w-[42px] text-center" style={{ width: "42px" }}>
                    <div className="w-7 h-[37px] rounded-md bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[82px] text-center" style={{ width: "82px" }}>
                    <div className="h-4 w-14 rounded bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-2.5 py-1.5 min-w-0">
                    <div className="h-3.5 w-3/4 rounded bg-secondary animate-pulse mb-1" />
                    <div className="h-2.5 w-20 rounded bg-secondary/60 animate-pulse" />
                  </td>
                  <td className="px-2 py-1.5 w-[110px]" style={{ width: "110px" }}>
                    <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[92px]" style={{ width: "92px" }}>
                    <div className="h-3 w-16 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[86px]" style={{ width: "86px" }}>
                    <div className="h-3 w-14 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[64px]" style={{ width: "64px" }}>
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[58px] text-right" style={{ width: "58px" }}>
                    <div className="h-3 w-10 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[50px] text-right" style={{ width: "50px" }}>
                    <div className="h-3 w-8 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[66px] text-right" style={{ width: "66px" }}>
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[68px] text-right" style={{ width: "68px" }}>
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[80px]" style={{ width: "80px" }}>
                    <div className="h-4 w-14 rounded-full bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5 w-[86px] text-center sticky right-0 bg-card" style={{ width: "86px" }}>
                    <div className="h-5 w-12 rounded bg-secondary animate-pulse mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="border border-red-200 dark:border-red-800/50 rounded-xl bg-red-50/50 dark:bg-red-950/20 px-6 py-10 flex flex-col items-center justify-center text-center">
        <AlertCircle size={28} className="text-red-500 mb-3" />
        <p className="text-sm font-bold text-foreground mb-1">Unable to load products</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="border border-border/60 rounded-xl bg-card px-6 py-14 flex flex-col items-center justify-center text-center">
        <PackageX size={32} className="text-muted-foreground/40 mb-3" />
        <p className="text-sm font-bold text-foreground mb-1">No products found</p>
        <p className="text-xs text-muted-foreground mb-4">
          {hasActiveFilters
            ? "No products match your current filters."
            : "Your catalog is empty. Add your first product to get started."}
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={13} />
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left">
          <colgroup>
            {PRODUCT_COLUMNS.map((col) => (
              <col
                key={col.key}
                className={col.colWidthClass}
                style={col.width ? { width: col.width } : undefined}
              />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              <th
                className={PRODUCT_COLUMNS[0].thClass}
                style={PRODUCT_COLUMNS[0].width ? { width: PRODUCT_COLUMNS[0].width } : undefined}
              >
                <span className="sr-only">Reorder</span>
              </th>
              <th
                className={PRODUCT_COLUMNS[1].thClass}
                style={PRODUCT_COLUMNS[1].width ? { width: PRODUCT_COLUMNS[1].width } : undefined}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border accent-foreground cursor-pointer align-middle"
                  aria-label="Select all products"
                />
              </th>
              {PRODUCT_COLUMNS.slice(2).map((col) => (
                <th
                  key={col.key}
                  className={col.thClass}
                  style={col.width ? { width: col.width } : undefined}
                  title={col.title}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-ordered-container className="divide-y divide-border/40">
            {products.map((product, i) => {
              const globalIndex = startIndex + i;
              return (
                <ProductTableRow
                  key={product.id}
                  product={product}
                  selected={selectedIds.has(product.id)}
                  globalIndex={globalIndex}
                  localIndex={i}
                  isReorderDisabled={isReorderDisabled}
                  disabledReason={disabledReason}
                  onPointerDown={onPointerDown}
                  onMoveUp={onMoveUp ? () => onMoveUp(globalIndex) : undefined}
                  onMoveDown={onMoveDown ? () => onMoveDown(globalIndex) : undefined}
                  isFirst={isFirstItem ? isFirstItem(globalIndex) : false}
                  isLast={isLastItem ? isLastItem(globalIndex) : false}
                  rowVisualClass={getRowVisualClass ? getRowVisualClass(globalIndex) : ""}
                  onSelect={onSelect}
                  onTogglePublish={onTogglePublish}
                  onToggleStorefrontVisibility={onToggleStorefrontVisibility}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onAdjustStock={onAdjustStock}
                  onViewStockHistory={onViewStockHistory}
                  onMarkSoldOut={onMarkSoldOut}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="border-t border-border/60 bg-card/60 px-4 py-1">
          {pagination}
        </div>
      )}
    </div>
  );
}
