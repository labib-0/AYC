"use client";

import React from "react";
import Image from "next/image";

export interface HeaderBrandingProps {
  siteTitle: string;
  siteLogo?: string | null;
  className?: string;
  titleClassName?: string;
  logoHeightClass?: string;
  logoSizeClass?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Controlled Header Branding Component strictly following:
 * [ transparent square logo container ] [ WEBSITE TITLE ]
 *
 * Rules:
 * 1. Logo container sits on the left, website title sits directly to the right.
 * 2. Logo container is strictly square (1:1 aspect ratio), responsive across viewports.
 * 3. Container is transparent: no visible border, no background, no shadow.
 * 4. When no valid logo exists, gracefully renders nothing (no visible box or placeholder).
 * 5. Logo is centered and contained naturally inside the square (object-contain).
 */
export default function HeaderBranding({
  siteTitle,
  siteLogo,
  className = "flex items-center gap-2.5 sm:gap-3 shrink-0",
  titleClassName = "font-brand font-black text-xl sm:text-2xl xl:text-2xl 2xl:text-3xl tracking-widest text-white leading-tight",
  logoHeightClass,
  logoSizeClass,
  onClick,
}: HeaderBrandingProps) {
  const displayTitle = siteTitle || "AYAAN CLOTHING";

  const sizeClasses =
    logoSizeClass ||
    (logoHeightClass
      ? `${logoHeightClass} aspect-square`
      : "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-10.5 lg:w-10.5 xl:h-11 xl:w-11 aspect-square");

  return (
    <div className={className} onClick={onClick}>
      {/* [ DEDICATED TRANSPARENT SQUARE LOGO CONTAINER ] */}
      {siteLogo ? (
        <div
          className={`${sizeClasses} aspect-square flex items-center justify-center shrink-0 overflow-hidden select-none bg-transparent border-0 shadow-none outline-none`}
          style={{ aspectRatio: "1 / 1" }}
        >
          <img
            src={siteLogo}
            alt={displayTitle}
            className="w-full h-full max-w-full max-h-full object-contain pointer-events-none"
            loading="eager"
          />
        </div>
      ) : null}

      {/* [ WEBSITE TITLE ] — Sits directly to the right of logo container */}
      <span className={`${titleClassName} select-none truncate`} aria-label={displayTitle}>
        {formatTitleWithAccents(displayTitle)}
      </span>
    </div>
  );
}

/**
 * Renders stylized title with brand accent on first letters if matching standard style,
 * or clean uppercase text otherwise.
 */
function formatTitleWithAccents(title: string) {
  const words = title.trim().split(/\s+/);
  return (
    <span className="inline-flex items-baseline flex-wrap gap-x-1.5">
      {words.map((word, idx) => {
        if (!word) return null;
        const firstChar = word.charAt(0);
        const rest = word.slice(1);
        return (
          <span key={idx} className="inline-flex items-baseline">
            <span className="text-[#EA580C]">{firstChar}</span>
            <span>{rest}</span>
          </span>
        );
      })}
    </span>
  );
}
