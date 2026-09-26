"use client";

import { Box } from "lucide-react";
import { ShippingPackageProfile } from "@/types";
import { calculateTotalCbm } from "@/lib/services/shipping-package";

interface ProductShippingSectionProps {
  profiles: ShippingPackageProfile[];
  moq: number;
  onChange: (profiles: ShippingPackageProfile[]) => void;
}

export default function ProductShippingSection({
  profiles,
  moq,
  onChange,
}: ProductShippingSectionProps) {
  // Always work with one authoritative shipping profile
  const profile: ShippingPackageProfile = profiles[0] || {
    package_quantity: moq > 0 ? moq : 10,
    carton_count: 1,
    carton_length: 60,
    carton_width: 40,
    carton_height: 30,
    dimension_unit: "cm",
    gross_weight: 15,
    net_weight: 13.5,
    weight_unit: "kg",
    is_active: true,
  };

  const updateProfile = (updates: Partial<ShippingPackageProfile>) => {
    const updated: ShippingPackageProfile = {
      ...profile,
      ...updates,
      // MOQ is derived from package assortment — do NOT override it here
      package_quantity: moq > 0 ? moq : profile.package_quantity || 1,
    };
    onChange([updated]);
  };

  const cartonCount = Math.max(1, Math.round(profile.carton_count || 1));

  // Single carton CBM (calculated from one carton's dimensions)
  const singleCartonCbm = calculateTotalCbm(
    profile.carton_length || 0,
    profile.carton_width || 0,
    profile.carton_height || 0,
    1,
    profile.dimension_unit || "cm"
  );

  // Total CBM = single carton CBM × carton count
  const totalCbm = singleCartonCbm * cartonCount;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Shipping &amp; Packaging Logistics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Physical carton packaging specifications and CBM volumetric metrics for the Universal Package (MOQ).
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-semibold">
          <Box size={13} />
          <span>Universal Carton</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-4">
        {/* Row 1: Gross Weight & Carton Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gross Weight (per carton) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Gross Weight <span className="text-muted-foreground font-normal normal-case tracking-normal">(per carton)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                value={profile.gross_weight || ""}
                onChange={(e) =>
                  updateProfile({
                    gross_weight: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="15.0"
                className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <select
                value={profile.weight_unit || "kg"}
                onChange={(e) =>
                  updateProfile({
                    weight_unit: e.target.value as "kg" | "lbs",
                  })
                }
                className="h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="kg">KG</option>
                <option value="lbs">LBS</option>
              </select>
            </div>
          </div>

          {/* Carton Count */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Carton Count
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={cartonCount}
              onChange={(e) => {
                const val = Math.max(1, Math.round(parseFloat(e.target.value) || 1));
                updateProfile({ carton_count: val });
              }}
              onKeyDown={(e) => {
                // Reject decimals
                if (e.key === "." || e.key === ",") e.preventDefault();
              }}
              placeholder="1"
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              How many identical cartons are needed to ship the MOQ.
            </p>
          </div>
        </div>

        {/* Row 2: Dimensions (Length x Width x Height) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Carton Dimensions
            </label>
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground">
              <span>Unit:</span>
              <select
                value={profile.dimension_unit || "cm"}
                onChange={(e) =>
                  updateProfile({
                    dimension_unit: e.target.value as "cm" | "in",
                  })
                }
                className="h-6 px-1.5 rounded-md border border-border bg-card text-[10px] font-bold uppercase"
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Length ({profile.dimension_unit || "cm"})
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={profile.carton_length || ""}
                onChange={(e) =>
                  updateProfile({
                    carton_length: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="60"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Width ({profile.dimension_unit || "cm"})
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={profile.carton_width || ""}
                onChange={(e) =>
                  updateProfile({
                    carton_width: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="40"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Height ({profile.dimension_unit || "cm"})
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={profile.carton_height || ""}
                onChange={(e) =>
                  updateProfile({
                    carton_height: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="30"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
        </div>

        {/* Row 3: CBM Readouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Single Carton CBM */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Single Carton CBM
            </label>
            <div className="h-10 px-3.5 rounded-xl bg-secondary/60 border border-border/60 flex items-center justify-between font-mono font-bold text-xs text-foreground tabular-nums">
              <span>{singleCartonCbm.toFixed(4)} m³</span>
              <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground">
                / carton
              </span>
            </div>
          </div>

          {/* Total CBM */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Total CBM
              <span className="ml-1 text-muted-foreground font-normal normal-case tracking-normal">
                ({cartonCount} carton{cartonCount !== 1 ? "s" : ""})
              </span>
            </label>
            <div className="h-10 px-3.5 rounded-xl bg-primary/8 border border-primary/20 flex items-center justify-between font-mono font-bold text-xs text-foreground tabular-nums">
              <span className="text-primary">{totalCbm.toFixed(4)} m³</span>
              <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground">
                Shipment Volume
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          This packaging configuration uses{" "}
          <strong>{cartonCount}</strong> identical carton{cartonCount !== 1 ? "s" : ""} for the current
          MOQ of <strong>{moq > 0 ? moq : profile.package_quantity || "—"} pcs</strong>.
          Total CBM = {singleCartonCbm.toFixed(4)} × {cartonCount} = {totalCbm.toFixed(4)} m³.
        </p>
      </div>
    </div>
  );
}
