import React from "react";
import { Package, SearchX, CheckCircle2 } from "lucide-react";
import { InventoryRecord, LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";
import InventoryRow from "./InventoryRow";

export interface InventoryTableProps {
  records: InventoryRecord[];
  isLoading: boolean;
  search: string;
  status: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  selectedWarehouse: string;
  onAdjust: (record: InventoryRecord) => void;
  onViewHistory: (record: InventoryRecord) => void;
  onResetFilters?: () => void;
}

export default function InventoryTable({
  records,
  isLoading,
  search,
  status,
  selectedWarehouse,
  onAdjust,
  onViewHistory,
  onResetFilters,
}: InventoryTableProps) {
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
    const hasActiveFilters = Boolean(
      search.trim() || status !== "ALL" || selectedWarehouse !== "all"
    );

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
      emptyDescription = "Try adjusting your search term, warehouse, or stock status.";
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
      {/* Desktop Table View */}
      <div className="overflow-x-auto">
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
