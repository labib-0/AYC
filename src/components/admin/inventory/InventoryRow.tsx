import React from "react";
import Link from "next/link";
import { Edit3, History, ExternalLink } from "lucide-react";
import {
  InventoryRecord,
  getInventoryProduct,
  getInventorySku,
  getInventoryBrandName,
  getInventoryCategoryName,
  getInventoryImageUrl,
} from "@/services/admin/inventory.service";
import StockStatusBadge from "./StockStatusBadge";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface InventoryRowProps {
  record: InventoryRecord;
  onAdjust: (record: InventoryRecord) => void;
  onViewHistory: (record: InventoryRecord) => void;
}

export default function InventoryRow({
  record,
  onAdjust,
  onViewHistory,
}: InventoryRowProps) {
  const { can } = useAdminAuth();
  const product = getInventoryProduct(record);
  const variant = record.variant;
  const warehouse = record.warehouse;
  const sku = getInventorySku(record);
  const brandName = getInventoryBrandName(record);
  const categoryName = getInventoryCategoryName(record);
  const imageUrl = getInventoryImageUrl(record);

  // Available stock calculation
  const totalStock = record.quantity;
  const available = totalStock;

  // Variant description details (e.g. Color / Size or Title)
  const variantDetails: string[] = [];
  if (variant?.color) variantDetails.push(variant.color);
  if (variant?.size) variantDetails.push(`Size: ${variant.size}`);
  if (!variantDetails.length && variant?.title) variantDetails.push(variant.title);

  return (
    <tr className="hover:bg-secondary/25 transition-colors font-medium border-b border-border/50 text-xs">
      {/* Product & Variant */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={product?.name || "Product"}
            className="w-11 aspect-[3/4] object-contain p-0.5 rounded-lg bg-secondary/60 shrink-0 border border-border/60 shadow-2xs"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
            }}
          />
          <div className="min-w-0 flex-1">
            <span className="font-bold text-foreground block truncate max-w-[220px] text-xs sm:text-sm">
              {product?.name || "—"}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {variantDetails.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {variantDetails.join(" • ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* SKU */}
      <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">
        <span className="bg-secondary/50 px-2 py-0.5 rounded text-[11px] font-semibold text-foreground">
          {sku}
        </span>
      </td>

      {/* Brand & Category */}
      <td className="py-3 px-3 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-xs">
            {brandName || "—"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {categoryName || "—"}
          </span>
        </div>
      </td>

      {/* Warehouse */}
      <td className="py-3 px-3 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-bold text-foreground">
            {warehouse?.name || "Uttara"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            {warehouse?.code || "WH-UTT-01"} • {warehouse?.city || "Dhaka"}
          </span>
        </div>
      </td>

      {/* Current Stock */}
      <td className="py-3 px-3 text-right font-display font-bold text-foreground text-sm tabular-nums whitespace-nowrap">
        {totalStock.toLocaleString()}
      </td>


      {/* Available */}
      <td className="py-3 px-3 text-right font-bold text-foreground text-xs tabular-nums whitespace-nowrap">
        <span className={available === 0 ? "text-rose-500 font-bold" : "text-foreground"}>
          {available.toLocaleString()}
        </span>
      </td>

      {/* Status Badge */}
      <td className="py-3 px-3 whitespace-nowrap">
        <StockStatusBadge quantity={available} />
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center justify-end gap-1.5">
          {can("inventory.adjust") && (
            <button
              type="button"
              onClick={() => onAdjust(record)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary text-xs font-bold transition-all cursor-pointer"
              title="Adjust stock for this item"
            >
              <Edit3 size={12} />
              <span>Adjust</span>
            </button>
          )}

          {(can("inventory.audit") || can("inventory.view")) && (
            <button
              type="button"
              onClick={() => onViewHistory(record)}
              className="inline-flex items-center gap-1 p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="View adjustment history"
              aria-label="View adjustment history"
            >
              <History size={13} />
            </button>
          )}

          {product?.slug && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="View live product"
              aria-label="View live product"
            >
              <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}
