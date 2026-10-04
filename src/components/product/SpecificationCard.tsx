import React from "react";

export interface SpecificationCardProps {
  /**
   * Label describing the specification, e.g. "Design Type", "Material", "Size", "Colour".
   */
  label: string;
  /**
   * Value entered by admin. Can be short, long, or multi-line.
   */
  value?: React.ReactNode;
  /**
   * Optional custom classes for container.
   */
  className?: string;
  /**
   * Optional test ID for automated assertions.
   */
  testId?: string;
  /**
   * Optional DOM id.
   */
  id?: string;
}

/**
 * SpecificationCard
 *
 * Fully dynamic, content-driven card for product specifications.
 * Ensures:
 * - Dynamic height: Card height automatically expands based on actual text content.
 * - Zero truncation: No ellipsis (...), no line clamping, no overflow:hidden clipping.
 * - Natural text wrapping: break-words and whitespace-pre-wrap to preserve admin-entered line breaks, spacing, and formatting.
 * - Top-aligned: Label on top, value directly underneath, avoiding awkward vertical centering.
 * - Comfortable minimum height: min-h-[58px] for clean baseline alignment across the 2x2 grid.
 */
export const SpecificationCard: React.FC<SpecificationCardProps> = ({
  label,
  value,
  className = "",
  testId,
  id,
}) => {
  const displayValue =
    value === undefined || value === null || (typeof value === "string" && value.trim() === "")
      ? "—"
      : value;

  return (
    <div
      id={id}
      data-testid={testId}
      className={`min-h-[58px] h-auto w-full p-2.5 sm:p-3 rounded-lg border border-border/60 bg-card shadow-2xs flex flex-col justify-start space-y-1 text-left ${className}`}
    >
      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider leading-none">
        {label}
      </span>
      <div className="font-semibold text-foreground text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap select-text">
        {displayValue}
      </div>
    </div>
  );
};

export default SpecificationCard;
