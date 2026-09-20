import React from "react";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { Warehouse } from "@/services/admin/inventory.service";

export interface WarehouseSelectorProps {
  warehouses: Warehouse[];
  selectedWarehouse: string;
  onSelectWarehouse: (warehouseId: string) => void;
  className?: string;
  id?: string;
}

export default function WarehouseSelector({
  warehouses,
  selectedWarehouse,
  onSelectWarehouse,
  className = "",
  id = "warehouse-selector",
}: WarehouseSelectorProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <WarehouseIcon
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <select
        id={id}
        value={selectedWarehouse}
        onChange={(e) => onSelectWarehouse(e.target.value)}
        className="pl-8 pr-8 py-2 text-xs rounded-xl border border-border/80 bg-card text-foreground font-medium hover:border-foreground/30 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors appearance-none cursor-pointer"
        aria-label="Filter by warehouse"
      >
        <option value="all">All Warehouses</option>
        {warehouses.map((w) => (
          <option key={w.id} value={String(w.id)}>
            {w.name} ({w.code})
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">
        ▼
      </div>
    </div>
  );
}
