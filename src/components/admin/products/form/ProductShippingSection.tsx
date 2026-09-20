"use client";

import { Plus, Trash2, Box } from "lucide-react";
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
  const handleAddProfile = () => {
    const defaultQty = moq > 0 ? moq : 10;
    const newProfile: ShippingPackageProfile = {
      package_quantity: defaultQty,
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
    onChange([...profiles, newProfile]);
  };

  const handleUpdateProfile = (index: number, updates: Partial<ShippingPackageProfile>) => {
    const updated = profiles.map((p, i) => (i === index ? { ...p, ...updates } : p));
    onChange(updated);
  };

  const handleRemoveProfile = (index: number) => {
    onChange(profiles.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Shipping & Packaging Logistics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Physical carton packaging specs, weight, and automated CBM volumetric metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddProfile}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          <Plus size={13} /> Add Carton Profile
        </button>
      </div>

      <div className="space-y-4">
        {profiles.map((profile, index) => {
          const cbm = calculateTotalCbm(
            profile.carton_length,
            profile.carton_width,
            profile.carton_height,
            profile.carton_count || 1,
            profile.dimension_unit || "cm"
          );

          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box size={14} className="text-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Carton Profile #{index + 1}
                  </span>
                </div>

                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProfile(index)}
                    className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Remove Profile"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Row 1: Quantity & Dimensions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Units / Package
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={profile.package_quantity || ""}
                    onChange={(e) =>
                      handleUpdateProfile(index, {
                        package_quantity: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Carton Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={profile.carton_count || 1}
                    onChange={(e) =>
                      handleUpdateProfile(index, {
                        carton_count: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Gross Weight
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={profile.gross_weight || ""}
                      onChange={(e) =>
                        handleUpdateProfile(index, {
                          gross_weight: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground tabular-nums"
                    />
                    <select
                      value={profile.weight_unit || "kg"}
                      onChange={(e) =>
                        handleUpdateProfile(index, {
                          weight_unit: e.target.value as "kg" | "lbs",
                        })
                      }
                      className="h-9 px-1.5 rounded-lg border border-border bg-card text-[11px] font-bold uppercase"
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Calculated CBM
                  </label>
                  <div className="h-9 px-3 rounded-lg bg-secondary/60 border border-border/40 flex items-center font-mono font-bold text-xs text-foreground tabular-nums">
                    {cbm.toFixed(4)} m³
                  </div>
                </div>
              </div>

              {/* Row 2: Carton Dimensions (L x W x H) */}
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
                      handleUpdateProfile(index, {
                        carton_length: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground tabular-nums"
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
                      handleUpdateProfile(index, {
                        carton_width: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground tabular-nums"
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
                      handleUpdateProfile(index, {
                        carton_height: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground tabular-nums"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
