import React from "react";
import { PlusCircle, Warehouse as WarehouseIcon, RefreshCw } from "lucide-react";

export interface InventoryHeaderProps {
  onAdjustStock: () => void;
  onManageWarehouses: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function InventoryHeader({
  onAdjustStock,
  onManageWarehouses,
  onRefresh,
  isLoading = false,
}: InventoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
          Inventory &amp; Stock
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
          Monitor stock levels, warehouses and inventory adjustments.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onAdjustStock}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-sm cursor-pointer"
          id="btn-adjust-stock-global"
        >
          <PlusCircle size={15} />
          <span>Adjust Stock</span>
        </button>

        <button
          type="button"
          onClick={onManageWarehouses}
          className="inline-flex items-center gap-2 px-4 sm:px-4.5 py-2.5 rounded-full border border-border bg-card hover:bg-secondary text-foreground font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
          id="btn-manage-warehouses"
        >
          <WarehouseIcon size={14} />
          <span>Manage Warehouses</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh inventory data"
          aria-label="Refresh inventory data"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin text-primary" : ""} />
        </button>
      </div>
    </div>
  );
}
