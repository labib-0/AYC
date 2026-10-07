"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface BrandLogoTileProps {
  id?: string | number;
  name: string;
  logoUrl?: string | null;
  href?: string;
  isSelected?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * BrandLogoTile — Canonical storefront Brand Tile Component
 * Shared across Shop By Brand (homepage) and GlobalFilterRail (catalog filter).
 * Standardized aspect ratio [1.35/1], object-contain logo rendering, and optional filter selection state.
 * Supports crawlable Link element when href is provided.
 */
export default function BrandLogoTile({
  id,
  name,
  logoUrl,
  href,
  isSelected = false,
  onClick,
  title,
  ariaLabel,
  className = "",
}: BrandLogoTileProps) {
  const [imgError, setImgError] = useState(false);

  const hasValidLogo = Boolean(
    logoUrl &&
      logoUrl.trim() !== "" &&
      !logoUrl.includes("pexels.com") &&
      !imgError
  );

  const tileClasses = `group relative flex items-center justify-center aspect-[1.6/1] w-full p-0.5 rounded transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
    isSelected
      ? "ring-1 ring-foreground/40 ring-inset hover:-translate-y-[1px]"
      : "hover:-translate-y-[1px]"
  } ${className}`;

  const content = (
    <div className="w-full h-full flex items-center justify-center">
      {hasValidLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl || undefined}
          alt={`${name} official brand logo`}
          className={`w-auto h-auto max-h-[76%] max-w-[84%] object-contain transition-transform duration-200 group-hover:scale-105 ${
            isSelected ? "scale-102" : ""
          }`}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground/80 text-center line-clamp-1 px-1 select-none">
          {name}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        key={id || name}
        href={href}
        onClick={onClick}
        aria-label={ariaLabel || `Explore ${name} wholesale collection`}
        title={title || name}
        className={tileClasses}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      key={id || name}
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={ariaLabel || (isSelected ? `Deselect ${name} brand` : `Select ${name} brand`)}
      title={title || name}
      className={tileClasses}
    >
      {content}
    </button>
  );
}
