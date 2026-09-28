"use client";

import React, { useMemo } from "react";
import type { ShippingPackageProfile } from "@/types";
import { calculateCartonCbm } from "@/lib/services/shipping-package";

export interface ProductSelectedLogisticsRowProps {
  /** Currently selected order quantity in PCS */
  quantity: number;
  /** Available shipping package profiles on the product */
  profiles?: ShippingPackageProfile[];
  /** Minimum order quantity for the product */
  moq?: number;
  /** Optional package allocations for package assortment products */
  packageAllocations?: any[];
  className?: string;
}

/**
 * ProductSelectedLogisticsRow
 *
 * Compact logistics row placed immediately below Order Quantity & Estimated Total.
 * Dynamically computes and displays CBM and Gross Weight corresponding strictly
 * to the currently selected order quantity using existing carton-based packaging logic.
 *
 * Displays "Not configured" if packaging profile information is absent or incomplete.
 */
export default function ProductSelectedLogisticsRow({
  quantity,
  profiles = [],
  moq = 1,
  packageAllocations,
  className = "",
}: ProductSelectedLogisticsRowProps) {
  const logistics = useMemo(() => {
    const activeProfiles = (profiles || []).filter((p) => p.is_active !== false);

    // Find if there is any valid profile with positive dimensions/cbm and gross weight
    const validProfiles = activeProfiles.filter(
      (p) =>
        (Number(p.gross_weight) > 0 || Number(p.total_gross_weight) > 0) &&
        (Number(p.carton_length) > 0 || Number(p.single_carton_cbm) > 0 || Number(p.total_cbm) > 0)
    );

    if (validProfiles.length === 0 || quantity <= 0) {
      return {
        isConfigured: false,
        cbm: null,
        grossWeight: null,
        weightUnit: "KG",
      };
    }

    const sortedProfiles = [...validProfiles].sort(
      (a, b) => Number(a.package_quantity || 0) - Number(b.package_quantity || 0)
    );

    // 1. Direct match: Exact quantity match
    const exactMatch = sortedProfiles.find(
      (p) =>
        Number(p.package_quantity) === quantity &&
        (p.quantity_max === undefined || p.quantity_max === null)
    );

    if (exactMatch) {
      const cartonCount = Math.max(1, Number(exactMatch.carton_count) || 1);
      const singleCartonCbm =
        exactMatch.single_carton_cbm && Number(exactMatch.single_carton_cbm) > 0
          ? Number(exactMatch.single_carton_cbm)
          : calculateCartonCbm(
              Number(exactMatch.carton_length || 0),
              Number(exactMatch.carton_width || 0),
              Number(exactMatch.carton_height || 0),
              (exactMatch.dimension_unit as "cm" | "in" | "m") || "cm"
            );

      const totalCbm =
        exactMatch.total_cbm && Number(exactMatch.total_cbm) > 0
          ? Number(exactMatch.total_cbm)
          : singleCartonCbm * cartonCount;

      const totalGrossWeight =
        exactMatch.total_gross_weight && Number(exactMatch.total_gross_weight) > 0
          ? Number(exactMatch.total_gross_weight)
          : Number(exactMatch.gross_weight || 0) * cartonCount;

      return {
        isConfigured: true,
        cbm: totalCbm,
        grossWeight: totalGrossWeight,
        weightUnit: (exactMatch.weight_unit || "kg").toUpperCase(),
      };
    }

    // 2. Direct match: Range match
    const rangeMatch = sortedProfiles.find((p) => {
      if (p.quantity_max !== undefined && p.quantity_max !== null) {
        return quantity >= Number(p.package_quantity) && quantity <= Number(p.quantity_max);
      }
      return false;
    });

    if (rangeMatch) {
      const cartonCount = Math.max(1, Number(rangeMatch.carton_count) || 1);
      const singleCartonCbm =
        rangeMatch.single_carton_cbm && Number(rangeMatch.single_carton_cbm) > 0
          ? Number(rangeMatch.single_carton_cbm)
          : calculateCartonCbm(
              Number(rangeMatch.carton_length || 0),
              Number(rangeMatch.carton_width || 0),
              Number(rangeMatch.carton_height || 0),
              (rangeMatch.dimension_unit as "cm" | "in" | "m") || "cm"
            );

      const totalCbm =
        rangeMatch.total_cbm && Number(rangeMatch.total_cbm) > 0
          ? Number(rangeMatch.total_cbm)
          : singleCartonCbm * cartonCount;

      const totalGrossWeight =
        rangeMatch.total_gross_weight && Number(rangeMatch.total_gross_weight) > 0
          ? Number(rangeMatch.total_gross_weight)
          : Number(rangeMatch.gross_weight || 0) * cartonCount;

      return {
        isConfigured: true,
        cbm: totalCbm,
        grossWeight: totalGrossWeight,
        weightUnit: (rangeMatch.weight_unit || "kg").toUpperCase(),
      };
    }

    // 3. Authoritative carton calculation using base packaging configuration
    const baseProfile = sortedProfiles[0];
    const allocTotal =
      packageAllocations && packageAllocations.length > 0
        ? packageAllocations.reduce(
            (acc, a) => acc + Number(a.quantity ?? (a as any).count ?? 0),
            0
          )
        : 0;

    const basePkgQty = Math.max(1, Number(baseProfile.package_quantity) || allocTotal || moq || 1);
    const cartonsPerPkg = Math.max(1, Number(baseProfile.carton_count) || 1);
    const piecesPerCarton = Math.max(1, Math.round(basePkgQty / cartonsPerPkg));

    const requiredCartons = Math.ceil(quantity / piecesPerCarton);

    const singleCartonCbm =
      baseProfile.single_carton_cbm && Number(baseProfile.single_carton_cbm) > 0
        ? Number(baseProfile.single_carton_cbm)
        : calculateCartonCbm(
            Number(baseProfile.carton_length || 0),
            Number(baseProfile.carton_width || 0),
            Number(baseProfile.carton_height || 0),
            (baseProfile.dimension_unit as "cm" | "in" | "m") || "cm"
          );

    const grossWeightPerCarton =
      Number(baseProfile.gross_weight) > 0
        ? Number(baseProfile.gross_weight)
        : Number(baseProfile.total_gross_weight || 0) / cartonsPerPkg;

    const totalCbm = singleCartonCbm * requiredCartons;
    const totalGrossWeight = grossWeightPerCarton * requiredCartons;

    return {
      isConfigured: true,
      cbm: totalCbm,
      grossWeight: totalGrossWeight,
      weightUnit: (baseProfile.weight_unit || "kg").toUpperCase(),
    };
  }, [quantity, profiles, moq, packageAllocations]);

  const { isConfigured, cbm, grossWeight, weightUnit } = logistics;

  const formattedWeight =
    grossWeight !== null
      ? grossWeight % 1 === 0
        ? grossWeight.toFixed(0)
        : grossWeight.toFixed(1)
      : null;

  return (
    <div
      className={`rounded-lg border border-border/70 bg-secondary/15 px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-2xs ${className}`}
      aria-label="Order quantity logistics impact"
    >
      <div className="grid grid-cols-2 gap-2.5 divide-x divide-border/60">
        {/* CBM Metric */}
        <div className="flex flex-col pl-1 sm:pl-1.5">
          <span className="text-[9.5px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground leading-none">
            CBM
          </span>
          <span
            className={`text-[12px] sm:text-[13px] font-sans font-bold tabular-nums leading-tight mt-0.5 ${
              isConfigured ? "text-foreground" : "text-muted-foreground text-[11px] font-normal"
            }`}
          >
            {isConfigured && cbm !== null ? `${cbm.toFixed(3)} m³` : "Not configured"}
          </span>
        </div>

        {/* Gross Weight Metric */}
        <div className="flex flex-col pl-2.5 sm:pl-3">
          <span className="text-[9.5px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground leading-none">
            GROSS WEIGHT
          </span>
          <span
            className={`text-[12px] sm:text-[13px] font-sans font-bold tabular-nums leading-tight mt-0.5 ${
              isConfigured ? "text-foreground" : "text-muted-foreground text-[11px] font-normal"
            }`}
          >
            {isConfigured && formattedWeight !== null
              ? `${formattedWeight} ${weightUnit}`
              : "Not configured"}
          </span>
        </div>
      </div>
    </div>
  );
}
