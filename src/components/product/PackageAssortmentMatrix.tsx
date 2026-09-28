"use client";

import React from "react";

export interface PackageAssortmentMatrixData {
  colors: string[];
  sizes: string[];
  cellMap: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

export interface PackageAssortmentMatrixProps {
  matrixData: PackageAssortmentMatrixData;
  title?: string;
  className?: string;
  getColorHex?: (color: string) => string;
}

/**
 * PackageAssortmentMatrix
 * 
 * Professional apparel size/color ratio matrix component.
 * - COLORS = ROWS
 * - SIZES = COLUMNS
 * - First Column: COLOR (left-aligned, sticky on mobile scroll)
 * - Size Columns: In actual business data order (center-aligned numeric)
 * - Final Column: Row TOTAL (right-aligned, highlighted)
 * - Final Row: Column TOTALS per size + Grand TOTAL
 * - Responsive: Horizontal scrolling on mobile without whole-page overflow
 */
export default function PackageAssortmentMatrix({
  matrixData,
  title = "RATIO MATRIX",
  className = "",
}: PackageAssortmentMatrixProps) {
  if (!matrixData || matrixData.colors.length === 0 || matrixData.sizes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1.5 pt-1 ${className}`}>
      {/* Matrix Subheading */}
      {title && (
        <div className="flex items-center justify-between text-[10.5px] sm:text-[11px]">
          <span className="font-display font-bold uppercase tracking-wider text-foreground/90">
            {title}
          </span>
        </div>
      )}

      {/* Responsive Matrix Table Container */}
      <div
        className="overflow-x-auto border border-border/70 rounded-lg bg-card shadow-2xs"
        tabIndex={0}
        aria-label="Package Assortment Size-Color Ratio Matrix"
      >
        <table className="w-full text-xs text-left min-w-[240px] font-sans border-collapse">
          {/* Header Row: COLOR | S | M | L | XL | ... | TOTAL */}
          <thead className="bg-secondary/40 text-[10.5px] font-display font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <tr>
              <th
                scope="col"
                className="sticky left-0 bg-secondary/80 backdrop-blur-xs z-20 px-3 py-2 text-left font-bold text-foreground border-r border-border/40 sm:border-r-0"
              >
                COLOR
              </th>
              {matrixData.sizes.map((s) => (
                <th
                  key={s}
                  scope="col"
                  className="px-2.5 sm:px-3 py-2 text-center font-bold text-foreground"
                >
                  {s}
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-2 font-extrabold text-right text-foreground bg-secondary/50 sm:bg-secondary/30"
              >
                TOTAL
              </th>
            </tr>
          </thead>

          {/* Color Rows: One Row per Color */}
          <tbody className="divide-y divide-border/40 text-[11.5px]">
            {matrixData.colors.map((color) => (
              <tr key={color} className="hover:bg-secondary/15 transition-colors">
                {/* Color Name */}
                <td className="sticky left-0 bg-card z-10 px-3 py-2 font-semibold text-foreground border-r border-border/40 sm:border-r-0 whitespace-nowrap">
                  <span>{color}</span>
                </td>

                {/* Quantities for each size */}
                {matrixData.sizes.map((size) => {
                  const val = matrixData.cellMap[color]?.[size] ?? 0;
                  return (
                    <td
                      key={size}
                      className={`px-2.5 sm:px-3 py-2 text-center tabular-nums font-mono text-[11.5px] ${
                        val > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground/50 font-normal"
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}

                {/* Row Total */}
                <td className="px-3 py-2 font-bold text-right text-foreground tabular-nums font-mono text-[11.5px] bg-secondary/20">
                  {(matrixData.rowTotals[color] ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Total Row: Sum per size + Grand Total */}
          <tfoot className="bg-secondary/30 border-t-2 border-border/80 font-bold text-foreground text-[11.5px]">
            <tr>
              <td className="sticky left-0 bg-secondary/70 backdrop-blur-xs z-10 px-3 py-2 uppercase text-[10.5px] font-display font-extrabold tracking-wider border-r border-border/40 sm:border-r-0">
                TOTAL
              </td>
              {matrixData.sizes.map((size) => (
                <td
                  key={size}
                  className="px-2.5 sm:px-3 py-2 text-center tabular-nums font-mono font-bold text-foreground"
                >
                  {(matrixData.colTotals[size] ?? 0).toLocaleString()}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-foreground font-extrabold tabular-nums font-display text-[12px] bg-secondary/60 sm:bg-secondary/40">
                {matrixData.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
