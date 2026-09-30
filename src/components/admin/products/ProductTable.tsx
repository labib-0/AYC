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
  onRetry: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

interface ColumnDef {
  key: string;
  label: React.ReactNode;
  title?: string;
  colWidthClass: string;
  thClass: string;
}

export const PRODUCT_COLUMNS: ColumnDef[] = [
  {
    key: "select",
    label: "",
    colWidthClass: "w-8",
    thClass: "px-2 py-2 w-8 text-center",
  },
  {
    key: "thumbnail",
    label: "Image",
    title: "Product Thumbnail",
    colWidthClass: "w-10",
    thClass: "px-1 py-2 w-10 text-center",
  },
  {
    key: "productId",
    label: "ID",
    title: "Product ID",
    colWidthClass: "w-[72px]",
    thClass: "px-1.5 py-2 w-[72px] text-left",
  },
  {
    key: "product",
    label: "Product",
    colWidthClass: "w-auto",
    thClass: "px-2 py-2 text-left",
  },
  {
    key: "sku",
    label: "SKU",
    title: "Stock Keeping Unit",
    colWidthClass: "w-[62px]",
    thClass: "px-1.5 py-2 w-[62px] text-left",
  },
  {
    key: "brand",
    label: "Brand",
    colWidthClass: "w-[72px]",
    thClass: "px-1.5 py-2 w-[72px] text-left",
  },
  {
    key: "category",
    label: "Category",
    colWidthClass: "w-[72px]",
    thClass: "px-1.5 py-2 w-[72px] text-left",
  },
  {
    key: "audience",
    label: "Audience",
    colWidthClass: "w-[58px]",
    thClass: "px-1.5 py-2 w-[58px] text-left",
  },
  {
    key: "price",
    label: "Price",
    colWidthClass: "w-[54px]",
    thClass: "px-1.5 py-2 w-[54px] text-right",
  },
  {
    key: "moq",
    label: "MOQ",
    title: "Minimum Order Quantity",
    colWidthClass: "w-[44px]",
    thClass: "px-1.5 py-2 w-[44px] text-right",
  },
  {
    key: "stock",
    label: "Stock",
    title: "Available Stock",
    colWidthClass: "w-[64px]",
    thClass: "px-1.5 py-2 w-[64px] text-right",
  },
  {
    key: "availableMoqs",
    label: "MOQs",
    title: "Available Complete MOQs",
    colWidthClass: "w-[64px]",
    thClass: "px-1.5 py-2 w-[64px] text-right",
  },
  {
    key: "status",
    label: "Status",
    colWidthClass: "w-[64px]",
    thClass: "px-1.5 py-2 w-[64px] text-left",
  },
  {
    key: "actions",
    label: "Actions",
    colWidthClass: "w-9",
    thClass: "px-1 py-2 w-9 text-center sticky right-0 bg-secondary/80 backdrop-blur-xs z-10",
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
  onRetry,
  onClearFilters,
  hasActiveFilters,
}: ProductTableProps) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = products.some((p) => selectedIds.has(p.id)) && !allSelected;

  // Loading skeleton
  if (loading) {
    return (
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full table-fixed text-left">
            <colgroup>
              {PRODUCT_COLUMNS.map((col) => (
                <col key={col.key} className={col.colWidthClass} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                {PRODUCT_COLUMNS.map((col) => (
                  <th key={col.key} className={col.thClass}>
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
                  <td className="px-2 py-1.5 w-8 text-center">
                    <div className="w-3.5 h-3.5 rounded bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-1 py-1.5 w-10 text-center">
                    <div className="w-7 h-[37px] rounded-md bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="h-4 w-12 rounded bg-secondary animate-pulse mx-auto" />
                  </td>
                  <td className="px-2 py-1.5 min-w-0">
                    <div className="h-3.5 w-3/4 rounded bg-secondary animate-pulse mb-1" />
                    <div className="h-2.5 w-16 rounded bg-secondary/60 animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="h-3 w-10 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="h-3 w-10 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <div className="h-3 w-10 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <div className="h-3 w-8 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <div className="h-3 w-10 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse ml-auto" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="h-4 w-11 rounded-full bg-secondary animate-pulse" />
                  </td>
                  <td className="px-1 py-1.5 w-9 text-center sticky right-0 bg-card">
                    <div className="h-5 w-5 rounded bg-secondary animate-pulse mx-auto" />
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
    <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto min-h-[280px]">
        <table className="w-full table-fixed text-left">
          <colgroup>
            {PRODUCT_COLUMNS.map((col) => (
              <col key={col.key} className={col.colWidthClass} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              <th className="px-2 py-2 w-8 text-center">
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
              {PRODUCT_COLUMNS.slice(1).map((col) => (
                <th
                  key={col.key}
                  className={col.thClass}
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
            {products.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onSelect={onSelect}
                onTogglePublish={onTogglePublish}
                onToggleStorefrontVisibility={onToggleStorefrontVisibility}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
