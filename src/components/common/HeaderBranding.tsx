"use client";

import React from "react";
import Image from "next/image";

export interface HeaderBrandingProps {
  siteTitle: string;
  siteLogo?: string | null;
  className?: string;
  titleClassName?: string;
  logoHeightClass?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Controlled Header Branding Component strictly following:
 * [ LOGO CONTAINER ] [ WEBSITE TITLE ]
 *
 * Rules:
 * 1. Logo container sits on the left, website title sits directly to the right.
 * 2. Logo is properly contained without distortion (object-contain).
 * 3. Title is dynamically rendered from site settings (not hardcoded).
 * 4. When no valid logo exists, smoothly falls back to the website title.
 */
export default function HeaderBranding({
  siteTitle,
  siteLogo,
  className = "flex items-center gap-2.5 sm:gap-3 shrink-0",
  titleClassName = "font-brand font-black text-xl sm:text-2xl xl:text-2xl 2xl:text-3xl tracking-widest text-white leading-tight",
  logoHeightClass = "h-8 sm:h-9 md:h-10",
  onClick,
}: HeaderBrandingProps) {
  const displayTitle = siteTitle || "AYAAN CLOTHING";

  return (
    <div className={className} onClick={onClick}>
      {/* [ LOGO CONTAINER ] */}
      {siteLogo ? (
        <div
          className={`${logoHeightClass} max-w-[120px] sm:max-w-[160px] md:max-w-[200px] flex items-center justify-center shrink-0 overflow-hidden select-none`}
        >
          <img
            src={siteLogo}
            alt={displayTitle}
            className="h-full w-auto max-h-full max-w-full object-contain pointer-events-none"
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
