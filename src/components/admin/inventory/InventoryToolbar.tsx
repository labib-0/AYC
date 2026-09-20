import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Warehouse, LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";
import WarehouseSelector from "./WarehouseSelector";

export type StockFilterStatus = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface InventoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StockFilterStatus;
  onStatusChange: (status: StockFilterStatus) => void;
  warehouses: Warehouse[];
  selectedWarehouse: string;
  onSelectWarehouse: (warehouseId: string) => void;
  onResetFilters: () => void;
  totalResults: number;
}

export default function InventoryToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  warehouses,
  selectedWarehouse,
  onSelectWarehouse,
  onResetFilters,
  totalResults,
}: InventoryToolbarProps) {
  const hasActiveFilters = Boolean(
    search.trim() || status !== "ALL" || selectedWarehouse !== "all"
  );

  const statusOptions: { id: StockFilterStatus; label: string }[] = [
    { id: "ALL", label: "All Items" },
    { id: "IN_STOCK", label: "In Stock" },
    { id: "LOW_STOCK", label: `Low Stock (<${LOW_STOCK_THRESHOLD})` },
    { id: "OUT_OF_STOCK", label: "Out of Stock" },
  ];

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            id="inventory-search-input"
            placeholder="Search by product or SKU..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-border/80 bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Warehouse Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <WarehouseSelector
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onSelectWarehouse={onSelectWarehouse}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-border/80 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <X size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Buttons + Results Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
            <SlidersHorizontal size={12} />
            <span>Status:</span>
          </span>

          {statusOptions.map((opt) => {
            const isSelected = status === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusChange(opt.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-muted-foreground font-medium shrink-0 ml-auto">
          Showing <span className="font-bold text-foreground">{totalResults}</span> items
        </div>
      </div>
    </div>
  );
}
