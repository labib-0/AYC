"use client";

import React from "react";

/**
 * PHASE 19B — Unified Product Card Badge & Brand Logo Style Tokens
 * Master visual reference: The customer-facing ORIGINAL Design Type tag.
 * Provides a single source of truth for NEW, HOT, ORIGINAL / MASTER COPY, and Brand Logo Container.
 */

// Base shared typographic and structural styling
export const PRODUCT_BADGE_BASE_CLASS =
  "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[9.5px] font-sans font-semibold tracking-wider uppercase backdrop-blur-xs shadow-2xs leading-none select-none";

// Neutral surface (ORIGINAL master visual reference, shared with NEW and MASTER COPY)
export const PRODUCT_BADGE_NEUTRAL_CLASS =
  "bg-background/85 dark:bg-slate-900/85 text-foreground/80 border border-border/50";

// HOT badge surface (preserves existing pink/red background, normalizes typography, border and shape)
export const PRODUCT_BADGE_HOT_CLASS =
  "bg-rose-500/90 text-white border border-rose-600/30 dark:border-rose-400/30";

// FEATURED badge surface (premium amber/gold surface)
export const PRODUCT_BADGE_FEATURED_CLASS =
  "bg-amber-500/90 text-white border border-amber-600/30 dark:border-amber-400/30";

// PREORDER badge surface (distinct indigo/violet surface)
export const PRODUCT_BADGE_PREORDER_CLASS =
  "bg-indigo-600/90 text-white border border-indigo-700/30 dark:border-indigo-400/30";

// Brand logo container surface (shares identical background fill, border, corner radius, and subtle shadow)
export const BRAND_LOGO_CONTAINER_SURFACE_CLASS =
  "bg-background/85 dark:bg-slate-900/85 backdrop-blur-xs border border-border/50 shadow-2xs rounded";

export interface ProductBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "hot" | "featured" | "preorder";
  children: React.ReactNode;
}

export function ProductBadge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: ProductBadgeProps) {
  const variantClass =
    variant === "hot"
      ? PRODUCT_BADGE_HOT_CLASS
      : variant === "featured"
      ? PRODUCT_BADGE_FEATURED_CLASS
      : variant === "preorder"
      ? PRODUCT_BADGE_PREORDER_CLASS
      : PRODUCT_BADGE_NEUTRAL_CLASS;

  return (
    <span
      className={`${PRODUCT_BADGE_BASE_CLASS} ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}

export default ProductBadge;
