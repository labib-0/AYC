"use client";

import { Weight, Package2, Ruler } from "lucide-react";
import type { ShippingPackageProfile } from "@/types";
import { calculateTotalCbm } from "@/lib/services/shipping-package";

interface ProductLogisticsSummaryProps {
  /** The active shipping package profile for this product */
  profile: ShippingPackageProfile;
  /** MOQ (quantity for this profile) */
  moq: number;
}

/**
 * Compact logistics/packaging summary shown on the Customer Product Detail page.
 * Positioned after the pricing section and before the Add to Cart button.
 *
 * This is INFORMATIONAL only — it does NOT affect purchasing quantity.
 * The customer's purchasing unit remains PCS.
 */
export default function ProductLogisticsSummary({
  profile,
  moq,
}: ProductLogisticsSummaryProps) {
  const weightUnit = (profile.weight_unit || "kg").toUpperCase();
  const dimUnit = profile.dimension_unit || "cm";
  const cartonCount = Math.max(1, Number(profile.carton_count) || 1);

  // Prefer backend-computed values if available; calculate locally as fallback
  const totalCbm =
    profile.total_cbm !== undefined && profile.total_cbm > 0
      ? profile.total_cbm
      : calculateTotalCbm(
          profile.carton_length || 0,
          profile.carton_width || 0,
          profile.carton_height || 0,
          cartonCount,
          dimUnit as "cm" | "in" | "m"
        );

  // total_gross_weight: prefer backend; fallback = gross_weight per carton × count
  const totalGrossWeight =
    profile.total_gross_weight !== undefined && profile.total_gross_weight > 0
      ? profile.total_gross_weight
      : (profile.gross_weight || 0) * cartonCount;

  const grossWeightPerCarton = profile.gross_weight || 0;

  // Only render if we have meaningful data
  if (!profile.carton_length || !profile.gross_weight) return null;

  return (
    <div
      className="rounded-xl border border-border/60 bg-secondary/20 p-3 sm:p-3.5 space-y-2.5"
      aria-label="Shipping and packaging logistics information"
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <Package2 size={12} />
        <span>Packaging Logistics</span>
        <span className="ml-auto text-[10px] font-medium normal-case tracking-normal text-muted-foreground/60">
          per MOQ ({moq.toLocaleString()} pcs)
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Gross Weight */}
        <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg bg-background border border-border/50">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Weight size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Gross Weight</span>
          </div>
          <p className="text-[13px] font-bold tabular-nums text-foreground leading-tight">
            {totalGrossWeight % 1 === 0
              ? totalGrossWeight.toFixed(0)
              : totalGrossWeight.toFixed(1)}{" "}
            <span className="text-xs font-semibold text-muted-foreground">{weightUnit}</span>
          </p>
          <p className="text-[9px] text-muted-foreground/70 leading-tight">
            {grossWeightPerCarton} {weightUnit}/ctn × {cartonCount}
          </p>
        </div>

        {/* Total CBM */}
        <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg bg-background border border-border/50">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Ruler size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Total CBM</span>
          </div>
          <p className="text-[13px] font-bold tabular-nums text-foreground leading-tight">
            {totalCbm.toFixed(3)}{" "}
            <span className="text-xs font-semibold text-muted-foreground">m³</span>
          </p>
          <p className="text-[9px] text-muted-foreground/70 leading-tight">
            {cartonCount} {cartonCount === 1 ? "carton" : "cartons"}
          </p>
        </div>

        {/* Carton Count */}
        <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg bg-background border border-border/50">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Package2 size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Cartons</span>
          </div>
          <p className="text-[13px] font-bold tabular-nums text-foreground leading-tight">
            {cartonCount}
          </p>
          <p className="text-[9px] text-muted-foreground/70 leading-tight">
            {profile.carton_length} × {profile.carton_width} × {profile.carton_height} {dimUnit}
          </p>
        </div>
      </div>
    </div>
  );
}
