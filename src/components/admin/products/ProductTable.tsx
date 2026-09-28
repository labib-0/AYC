"use client";

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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {h}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="px-3 py-3 w-10">
                    <div className="w-3.5 h-3.5 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-2 py-2 w-14">
                    <div className="w-10 h-[53px] rounded-lg bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3 w-28">
                    <div className="h-4 w-24 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-32 rounded bg-secondary animate-pulse mb-1.5" />
                    <div className="h-2.5 w-20 rounded bg-secondary/60 animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-16 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-16 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-14 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-10 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-12 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-14 rounded bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-5 w-16 rounded-full bg-secondary animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-6 w-6 rounded bg-secondary animate-pulse" />
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-colors"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-border text-foreground hover:bg-secondary transition-colors"
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border accent-foreground cursor-pointer"
                  aria-label="Select all products"
                />
              </th>
              {TABLE_HEADERS.slice(1).map((h) => (
                <th
                  key={h}
                  className={`px-3 py-2.5 text-left ${
                    h === "Price" || h === "Stock" || h === "MOQ" || h === "Available Stock" || h === "Available MOQs"
                      ? "text-right"
                      : ""
                  } ${h === "Actions" ? "text-center w-12" : ""}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {h}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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

const TABLE_HEADERS = [
  "",
  "Thumbnail",
  "Product ID",
  "Product",
  "SKU",
  "Brand",
  "Category",
  "Audience",
  "Price",
  "MOQ",
  "Available Stock",
  "Available MOQs",
  "Status",
  "Actions",
];
