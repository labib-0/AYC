"use client";

import React, { useState } from "react";
import { Tag } from "lucide-react";
import { getBrandLogoUrl } from "@/lib/brand-logos";

export interface BrandTileData {
  id?: string | number;
  name: string;
  slug?: string;
  logo?: string;
  logo_url?: string;
}

export interface BrandTileProps {
  brand: BrandTileData;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  asButton?: boolean;
  showActiveBadge?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * BrandTile — The ONE final, reusable Brand presentation component for Ayaan Clothing.
 *
 * Rules:
 * - True 1:1 square aspect ratio at all times
 * - Dedicated logo area (~70-75%) and brand name area (~25-30%)
 * - Real brand logo with object-fit: contain (never cropped, never stretched)
 * - Transparent / neutral background; NO "box inside box" appearance
 * - Clean ecommerce typography centered underneath on a consistent single-line baseline
 * - STRICT RULE: Never show product photos as brand identity
 * - Restrained, premium B2B hover and selected states
 */
export default function BrandTile({
  brand,
  isSelected = false,
  onClick,
  className = "",
  asButton = true,
  size = "md",
}: BrandTileProps) {
  const [hasImgError, setHasImgError] = useState(false);

  const rawLogo = brand.logo_url || brand.logo;
  const cleanRawLogo = rawLogo && !rawLogo.includes("generic.png") && !rawLogo.includes("placeholder") ? rawLogo : null;
  const resolvedLogo = getBrandLogoUrl(brand.name, cleanRawLogo) || cleanRawLogo;
  const hasValidLogo = Boolean(
    resolvedLogo &&
      resolvedLogo.trim() !== "" &&
      !resolvedLogo.includes("pexels.com") &&
      !hasImgError
  );

  // Size configurations — All sizes enforce a TRUE 1:1 SQUARE (aspect-ratio: 1 / 1)
  const sizeStyles = {
    sm: {
      container: "p-2 rounded-xl",
      logoArea: "pt-1 px-1.5",
      name: "text-[11px]",
      iconSize: 16,
    },
    md: {
      container: "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl",
      logoArea: "pt-1.5 px-2",
      name: "text-xs sm:text-[13px]",
      iconSize: 20,
    },
    lg: {
      container: "p-3.5 sm:p-4 rounded-2xl",
      logoArea: "pt-2 px-2.5",
      name: "text-xs sm:text-sm",
      iconSize: 24,
    },
  }[size];

  const surfaceClasses = isSelected
    ? "border-foreground ring-1.5 ring-foreground/30 bg-secondary/90 dark:bg-secondary/80 shadow-xs hover:bg-secondary hover:-translate-y-[2.5px] hover:shadow-[0_6px_16px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
    : "border-slate-900/25 dark:border-white/25 bg-card shadow-2xs hover:border-slate-900/70 dark:hover:border-white/70 hover:bg-secondary/60 dark:hover:bg-secondary/50 hover:shadow-[0_6px_16px_rgba(15,23,42,0.09)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.35)] hover:-translate-y-[2.5px]";

  const content = (
    <>
      {/* 1. Dedicated Logo Presentation Area (Upper 70–75%, Optically Centered) */}
      <div
        className={`flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden select-none ${sizeStyles.logoArea}`}
      >
        {hasValidLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedLogo || undefined}
            alt={`${brand.name} logo`}
            className="w-auto h-auto max-h-[62%] max-w-[76%] object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setHasImgError(true)}
          />
        ) : (
          // Approved Neutral Fallback (Strictly NEVER show product photos or arbitrary initials)
          <div
            className="flex items-center justify-center text-muted-foreground/40"
            aria-hidden="true"
          >
            <Tag size={sizeStyles.iconSize} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* 2. Brand Name Area (Lower 25–30%, Centered, Consistent Single-Line Baseline) */}
      <span
        className={`w-full text-center font-sans font-semibold uppercase tracking-wider select-none truncate px-1 pb-1 shrink-0 leading-tight ${sizeStyles.name} ${
          isSelected
            ? "text-foreground font-bold"
            : "text-muted-foreground group-hover:text-foreground"
        }`}
        title={brand.name}
      >
        {brand.name}
      </span>
    </>
  );

  const baseClasses = `group relative flex flex-col items-center justify-between border aspect-square transition-all duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground active:translate-y-0 active:scale-[0.99] ${sizeStyles.container} ${surfaceClasses} ${className}`;

  if (asButton || onClick) {
    return (
      <button
        type="button"
        style={{ aspectRatio: "1 / 1" }}
        onClick={onClick}
        aria-pressed={isSelected}
        aria-label={`${brand.name} brand`}
        className={`${baseClasses} cursor-pointer`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      style={{ aspectRatio: "1 / 1" }}
      aria-label={`${brand.name} brand`}
      className={`${baseClasses} cursor-default`}
    >
      {content}
    </div>
  );
}
