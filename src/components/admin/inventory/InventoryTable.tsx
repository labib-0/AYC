import React from "react";
import { Package, SearchX, CheckCircle2, History } from "lucide-react";
import { InventoryRecord, LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";
import InventoryRow from "./InventoryRow";
import StockStatusBadge from "./StockStatusBadge";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface InventoryTableProps {
  records: InventoryRecord[];
  isLoading: boolean;
  search: string;
  status: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  onAdjust: (record: InventoryRecord) => void;
  onViewHistory: (record: InventoryRecord) => void;
  onResetFilters?: () => void;
}

export default function InventoryTable({
  records,
  isLoading,
  search,
  status,
  onAdjust,
  onViewHistory,
  onResetFilters,
}: InventoryTableProps) {
  const { can } = useAdminAuth();
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4">Product &amp; Variant</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Brand / Cat</th>
                <th className="py-3 px-3">Warehouse</th>
                <th className="py-3 px-3 text-right">Current</th>
                <th className="py-3 px-3 text-right">Reserved</th>
                <th className="py-3 px-3 text-right">Available</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-13 bg-secondary rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-secondary rounded w-32" />
                        <div className="h-2.5 bg-secondary rounded w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3"><div className="h-3 bg-secondary rounded w-16" /></td>
                  <td className="py-3.5 px-3"><div className="h-3 bg-secondary rounded w-20" /></td>
                  <td className="py-3.5 px-3"><div className="h-3 bg-secondary rounded w-24" /></td>
                  <td className="py-3.5 px-3 text-right"><div className="h-3.5 bg-secondary rounded w-12 ml-auto" /></td>
                  <td className="py-3.5 px-3 text-right"><div className="h-3 bg-secondary rounded w-8 ml-auto" /></td>
                  <td className="py-3.5 px-3 text-right"><div className="h-3.5 bg-secondary rounded w-12 ml-auto" /></td>
                  <td className="py-3.5 px-3"><div className="h-5 bg-secondary rounded-full w-20" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-7 bg-secondary rounded-lg w-16 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Handle empty states per Section 45
  if (records.length === 0) {
    const hasActiveFilters = Boolean(search.trim() || status !== "ALL");

    let emptyTitle = "Inventory is empty.";
    let emptyDescription = "No inventory records are available yet.";
    let Icon = Package;

    if (status === "LOW_STOCK") {
      emptyTitle = "No low-stock items.";
      emptyDescription = `All inventory quantities currently meet or exceed the ${LOW_STOCK_THRESHOLD}-unit threshold.`;
      Icon = CheckCircle2;
    } else if (status === "OUT_OF_STOCK") {
      emptyTitle = "No out-of-stock items.";
      emptyDescription = "There are zero items with 0 available stock in this view.";
      Icon = CheckCircle2;
    } else if (hasActiveFilters) {
      emptyTitle = "No inventory items match your current filters.";
      emptyDescription = "Try adjusting your search term or stock status.";
      Icon = SearchX;
    }

    return (
      <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          <Icon size={22} />
        </div>
        <h3 className="font-display font-bold text-base text-foreground mb-1">
          {emptyTitle}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
          {emptyDescription}
        </p>

        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-full bg-secondary hover:bg-foreground hover:text-background text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
      {/* Mobile Stacked Card View (md:hidden) */}
      <div className="md:hidden divide-y divide-border/60">
        {records.map((record) => {
          const product = record.variant?.product;
          const variant = record.variant;
          const warehouse = record.warehouse;
          const totalStock = record.quantity;
          const reserved = record.reserved_quantity || 0;
          const available = Math.max(0, totalStock - reserved);
          const rawImg = product?.images?.[0];
          const imageUrl =
            typeof rawImg === "string"
              ? rawImg
              : (rawImg as { image_url?: string } | undefined)?.image_url ||
                "/placeholder.jpg";
          const brandName =
            typeof product?.brand === "string"
              ? product.brand
              : (product?.brand as { name?: string } | undefined)?.name;
          const categoryName =
            typeof product?.category === "string"
              ? product.category
              : (product?.category as { name?: string } | undefined)?.name;

          return (
            <div key={record.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={product?.name || "Product"}
                  className="w-12 aspect-[3/4] object-contain p-0.5 rounded-lg bg-secondary/60 shrink-0 border border-border/60 shadow-2xs"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground block text-xs sm:text-sm">
                      {product?.name || "Catalog Product"}
                    </span>
                    <StockStatusBadge quantity={available} size="sm" />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {brandName && (
                      <span className="font-semibold text-foreground mr-1.5">
                        {brandName}
                      </span>
                    )}
                    {categoryName && <span>{categoryName} • </span>}
                    <span className="font-mono">{variant?.sku || record.id}</span>
                  </div>
                  {(variant?.size || variant?.color) && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {[
                        variant?.color,
                        variant?.size ? `Size: ${variant.size}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Metric Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-secondary/30 border border-border/60 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Current
                  </span>
                  <span className="text-xs font-display font-bold text-foreground tabular-nums">
                    {totalStock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Reserved
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {reserved.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Available
                  </span>
                  <span
                    className={`text-xs font-display font-bold tabular-nums ${
                      available === 0 ? "text-rose-500" : "text-foreground"
                    }`}
                  >
                    {available.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Warehouse & Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground font-medium truncate">
                  📍 {warehouse?.name || "Uttara"} ({warehouse?.code || "WH-UTT-01"})
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {can("inventory.adjust") && (
                    <button
                      type="button"
                      onClick={() => onAdjust(record)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <span>Adjust</span>
                    </button>
                  )}
                  {(can("inventory.audit") || can("inventory.view")) && (
                    <button
                      type="button"
                      onClick={() => onViewHistory(record)}
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="View history"
                      aria-label="View history"
                    >
                      <History size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (hidden on mobile, visible md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
              <th className="py-3 px-4">Product &amp; Variant</th>
              <th className="py-3 px-3">SKU</th>
              <th className="py-3 px-3">Brand / Cat</th>
              <th className="py-3 px-3">Warehouse</th>
              <th className="py-3 px-3 text-right">Current Stock</th>
              <th className="py-3 px-3 text-right">Reserved</th>
              <th className="py-3 px-3 text-right">Available</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {records.map((record) => (
              <InventoryRow
                key={record.id}
                record={record}
                onAdjust={onAdjust}
                onViewHistory={onViewHistory}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
