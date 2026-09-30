import React from "react";
import { OrderItemRecord } from "@/services/order.service";
import { ShoppingBag, Image as ImageIcon } from "lucide-react";

export interface OrderItemsTableProps {
  items: OrderItemRecord[];
}

export default function OrderItemsTable({ items }: OrderItemsTableProps) {
  const lineCount = items.length;
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary" />
          <span>Purchased Line Items ({lineCount})</span>
        </h2>
        <span className="text-xs font-mono text-muted-foreground">
          {totalUnits} {totalUnits === 1 ? "unit" : "units"} total
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {items.map((item, idx) => {
          let breakdown: Array<{ size: string; quantity: number }> | null = null;
          if (item.package_breakdown) {
            try {
              breakdown =
                typeof item.package_breakdown === "string"
                  ? JSON.parse(item.package_breakdown)
                  : item.package_breakdown;
            } catch {
              breakdown = null;
            }
          }

          const imageUrl =
            item.product_image_url ||
            (item.product_images && item.product_images[0]) ||
            null;

          return (
            <div key={item.id || `item-${idx}`} className="py-4 flex items-start sm:items-center gap-4 text-xs">
              {/* Thumbnail Image — Canonical 3:4 */}
              <div className="w-14 aspect-[3/4] rounded-xl bg-secondary shrink-0 border border-border/50 overflow-hidden flex items-center justify-center relative">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={item.product_name}
                    className="w-full h-full object-contain p-0.5"
                    loading="lazy"
                  />
                ) : (
                  <ImageIcon size={18} className="text-muted-foreground/50" />
                )}
              </div>

              {/* Product & Variant Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <span className="font-bold text-foreground block truncate text-sm">
                  {item.product_name}
                </span>

                <div className="flex items-center gap-2 flex-wrap text-muted-foreground font-mono text-[11px]">
                  <span>SKU: {item.sku || "—"}</span>
                  {item.size && <span>• Size: {item.size}</span>}
                  {item.color && <span>• Color: {item.color}</span>}
                  {item.variant_title && <span>• {item.variant_title}</span>}
                </div>

                {/* Wholesale Package Assortment Matrix */}
                {Array.isArray(breakdown) && breakdown.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-muted-foreground font-bold uppercase">Size Matrix:</span>
                    {breakdown.map((bd, bIdx) => (
                      <span
                        key={bIdx}
                        className="bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60 font-mono text-muted-foreground"
                      >
                        {bd.size}: <strong className="text-foreground">{bd.quantity}</strong>
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-muted-foreground font-mono text-xs pt-0.5">
                  ${Number(item.unit_price || 0).toFixed(2)} × {item.quantity} units
                </div>
              </div>

              {/* Line Total */}
              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-foreground text-sm block">
                  ${Number(item.line_total || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  USD
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
