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

const COMPACT_SQUARE_BRANDS = new Set([
  "next",
  "primark",
  "ovs",
  "diesel",
  "m&s",
  "m-s",
  "marks & spencer",
  "lee",
  "guess",
  "carhartt",
  "kappa",
  "champion",
  "champions",
  "columbia",
  "8 seconds",
  "8-seconds",
  "esmara",
  "sfera",
  "carry",
  "tex",
  "dip",
  "sada",
  "kiabi",
  "mix",
  "skora",
  "eddie bauer",
  "eddie-bauer",
  "monunent",
  "5.11",
  "5-11",
  "dkny",
]);

/**
 * BrandLogoTile — Canonical storefront Brand Tile Component
 * Shared across Shop By Brand (homepage) and GlobalFilterRail (catalog filter).
 * Standardized aspect ratio [1.6/1], object-contain logo rendering, optical scaling for compact logos, and optional filter selection state.
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

  const cleanBrandName = name.toLowerCase().trim();
  const slugBrandName = cleanBrandName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const isCompactLogo = COMPACT_SQUARE_BRANDS.has(cleanBrandName) || COMPACT_SQUARE_BRANDS.has(slugBrandName);

  const tileClasses = `group relative flex items-center justify-center aspect-[1.6/1] w-full p-0.5 rounded transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
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
            isCompactLogo ? "scale-[1.12]" : ""
          } ${isSelected ? "scale-102" : ""}`}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground/90 text-center line-clamp-1 px-1 select-none">
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
