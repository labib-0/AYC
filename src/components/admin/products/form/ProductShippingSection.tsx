"use client";

import { ShippingPackageProfile } from "@/types";
import { calculateTotalCbm } from "@/lib/services/shipping-package";
import { handleNumberInputWheel } from "@/components/common/GlobalNumberInputWheelGuard";

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
    package_quantity: moq > 0 ? moq : 0,
    dimension_unit: "cm",
    weight_unit: "kg",
    is_active: true,
  };

  const updateProfile = (updates: Partial<ShippingPackageProfile>) => {
    const updated: ShippingPackageProfile = {
      ...profile,
      ...updates,
      package_quantity: moq > 0 ? moq : profile.package_quantity || 0,
    };
    onChange([updated]);
  };

  const cartonCount = profile.carton_count !== undefined && profile.carton_count !== null && profile.carton_count > 0
    ? Math.round(Number(profile.carton_count))
    : null;

  const hasDimensions = Boolean(
    profile.carton_length && profile.carton_length > 0 &&
    profile.carton_width && profile.carton_width > 0 &&
    profile.carton_height && profile.carton_height > 0
  );

  const hasGrossWeight = Boolean(profile.gross_weight && profile.gross_weight > 0);

  // Single carton CBM (calculated only when dimensions are entered)
  const singleCartonCbm = hasDimensions
    ? calculateTotalCbm(
        profile.carton_length || 0,
        profile.carton_width || 0,
        profile.carton_height || 0,
        1,
        profile.dimension_unit || "cm"
      )
    : null;

  // Total CBM = single carton CBM × carton count (only when both exist)
  const totalCbm = singleCartonCbm !== null && cartonCount !== null
    ? singleCartonCbm * cartonCount
    : null;

  // Total Gross Weight = gross weight × carton count (only when both exist)
  const totalGrossWeight = hasGrossWeight && cartonCount !== null
    ? (profile.gross_weight || 0) * cartonCount
    : null;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Section Name: PACKAGING */}
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          PACKAGING
        </h2>
      </div>

      <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          CARTON DETAILS
        </h3>

        {/* Row 1: Gross Weight & Carton Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gross Weight / Carton */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Gross Weight / Carton
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                value={profile.gross_weight !== undefined && profile.gross_weight !== null && profile.gross_weight > 0 ? profile.gross_weight : ""}
                onWheel={handleNumberInputWheel}
                onChange={(e) =>
                  updateProfile({
                    gross_weight: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder=""
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
              value={cartonCount !== null ? cartonCount : ""}
              onWheel={handleNumberInputWheel}
              onChange={(e) => {
                const val = e.target.value ? Math.max(1, Math.round(parseFloat(e.target.value))) : undefined;
                updateProfile({ carton_count: val });
              }}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === ",") e.preventDefault();
              }}
              placeholder=""
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        {/* Row 2: Carton Dimensions */}
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
                Length
              </label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={profile.carton_length !== undefined && profile.carton_length !== null && profile.carton_length > 0 ? profile.carton_length : ""}
                onWheel={handleNumberInputWheel}
                onChange={(e) =>
                  updateProfile({
                    carton_length: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder=""
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Width
              </label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={profile.carton_width !== undefined && profile.carton_width !== null && profile.carton_width > 0 ? profile.carton_width : ""}
                onWheel={handleNumberInputWheel}
                onChange={(e) =>
                  updateProfile({
                    carton_width: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder=""
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Height
              </label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={profile.carton_height !== undefined && profile.carton_height !== null && profile.carton_height > 0 ? profile.carton_height : ""}
                onWheel={handleNumberInputWheel}
                onChange={(e) =>
                  updateProfile({
                    carton_height: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder=""
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Calculated Values — Total CBM · Total Gross Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Total CBM */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Total CBM
              {cartonCount !== null && (
                <span className="ml-1 text-muted-foreground font-normal normal-case tracking-normal">
                  ({cartonCount} carton{cartonCount !== 1 ? "s" : ""})
                </span>
              )}
            </label>
            <div className="h-10 px-3.5 rounded-xl bg-primary/8 border border-primary/20 flex items-center justify-between font-mono font-bold text-xs text-foreground tabular-nums">
              <span className="text-primary">{totalCbm !== null ? `${totalCbm.toFixed(4)} m³` : "—"}</span>
              <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground">
                Shipment Vol
              </span>
            </div>
          </div>

          {/* Total Gross Weight */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Total Gross Weight
              {cartonCount !== null && profile.gross_weight && (
                <span className="ml-1 text-muted-foreground font-normal normal-case tracking-normal">
                  ({cartonCount} × {profile.gross_weight} {(profile.weight_unit || "kg").toUpperCase()})
                </span>
              )}
            </label>
            <div className="h-10 px-3.5 rounded-xl bg-secondary/60 border border-border/60 flex items-center justify-between font-mono font-bold text-xs text-foreground tabular-nums">
              <span className="text-foreground">
                {totalGrossWeight !== null ? `${totalGrossWeight.toFixed(1)} ${(profile.weight_unit || "kg").toUpperCase()}` : "—"}
              </span>
              <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground">
                Shipment Wt
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
