import React from "react";
import { RfqItem } from "@/types/b2b";
import { Package, Tag } from "lucide-react";

export interface RfqItemsTableProps {
  items: RfqItem[];
}

export default function RfqItemsTable({ items }: RfqItemsTableProps) {
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalEstimatedValue = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.targetPrice || item.unitPrice || 0),
    0
  );

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Package size={15} className="text-primary" />
          <span>Requested Products & Quantities ({items.length})</span>
        </h2>
        <span className="text-xs font-mono font-bold text-foreground">
          {totalUnits.toLocaleString()} Total Units
        </span>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/30 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
              <th className="py-2.5 px-3">Product</th>
              <th className="py-2.5 px-3">Variant / Specs</th>
              <th className="py-2.5 px-3 text-right">Requested Qty</th>
              <th className="py-2.5 px-3 text-right">Target Price</th>
              <th className="py-2.5 px-3 text-right">Est. Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.map((item) => {
              const unitPrice = item.targetPrice || item.unitPrice || 0;
              const lineTotal = (item.quantity || 0) * unitPrice;

              return (
                <tr key={item.id} className="hover:bg-secondary/15 transition-colors">
                  {/* Product */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-12 h-12 rounded-xl object-cover bg-secondary border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                          <Package size={20} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-xs block truncate max-w-[220px]">
                          {item.productName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                          <span>{item.sku}</span>
                          {item.brand && (
                            <span className="inline-flex items-center gap-0.5 font-sans font-medium px-1.5 py-0.2 rounded bg-secondary text-foreground">
                              <Tag size={9} />
                              {item.brand}
                            </span>
                          )}
                        </div>
                        {item.buyerNotes && (
                          <p className="text-[11px] text-muted-foreground italic mt-1 bg-secondary/30 p-1.5 rounded border border-border/40 max-w-[280px]">
                            &ldquo;{item.buyerNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Variant */}
                  <td className="py-3 px-3">
                    <div className="text-xs space-y-0.5">
                      {item.selectedColor && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">Color: </span>
                          <span className="text-foreground font-medium">{item.selectedColor}</span>
                        </div>
                      )}
                      {item.selectedSize && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">Size: </span>
                          <span className="text-foreground font-medium">{item.selectedSize}</span>
                        </div>
                      )}
                      {item.moq && (
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          Catalog MOQ: {item.moq} pcs
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono font-bold text-xs text-foreground">
                      {item.quantity.toLocaleString()} pcs
                    </span>
                  </td>

                  {/* Target Price */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono text-xs text-foreground">
                      ${Number(unitPrice).toFixed(2)}
                    </span>
                    {item.targetPrice && item.unitPrice && (
                      <span className="text-[10px] text-muted-foreground block line-through">
                        cat. ${Number(item.unitPrice).toFixed(2)}
                      </span>
                    )}
                  </td>

                  {/* Est Amount */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono font-bold text-xs text-foreground">
                      ${Number(lineTotal).toFixed(2)} USD
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Note: Final quotation pricing will be set in the Quotation Builder.
        </span>
        <div className="text-right">
          <span className="text-muted-foreground text-[11px] block uppercase font-bold">
            Total Target Value
          </span>
          <span className="text-base font-display font-bold text-foreground">
            ${totalEstimatedValue.toFixed(2)} USD
          </span>
        </div>
      </div>
    </div>
  );
}
