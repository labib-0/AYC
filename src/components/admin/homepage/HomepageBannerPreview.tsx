/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Eye, ExternalLink, Sparkles } from "lucide-react";

export interface HomepageBannerPreviewProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonTarget?: string;
  isActive?: boolean;
  eyebrow?: string;
}

export default function HomepageBannerPreview({
  title,
  subtitle,
  imageUrl,
  buttonText = "EXPLORE CATALOG →",
  buttonTarget = "#featured",
  eyebrow = "AYAAN CLOTHING",
}: HomepageBannerPreviewProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 md:p-6 shadow-2xs space-y-3 sm:space-y-4 w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-1 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Eye size={17} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <span>Storefront Banner Preview</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Storefront View
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Real-time fluid representation of the primary storefront banner (~1375 × 158 px)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Target destination chip */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-secondary text-foreground border border-border/70">
            <ExternalLink size={12} className="text-muted-foreground" />
            <span>Target: <strong className="text-primary">{buttonTarget || "#featured"}</strong></span>
          </span>
        </div>
      </div>

      {/* Prominent Storefront Banner Container */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-secondary/90 border border-border/80 shadow-xs">
        {imageUrl ? (
          <div className="relative w-full h-[125px] xs:h-[138px] sm:h-[155px] md:h-[170px] lg:h-[185px] flex items-center overflow-hidden">
            {/* Background Photographic Image */}
            <img
              src={imageUrl}
              alt={title || "Homepage Banner Preview"}
              className="absolute inset-0 w-full h-full object-cover object-center md:object-right transition-transform duration-700 pointer-events-none"
            />

            {/* Contrast Gradient Overlay for Text Readability */}
            <div
              className="absolute inset-0 bg-black/40 bg-gradient-to-r from-background/90 via-background/60 to-transparent sm:from-background/80 sm:via-background/45 sm:to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Typography Overlay */}
            <div className="relative z-10 w-full max-w-3xl px-5 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 flex flex-col justify-center">
              {/* Eyebrow */}
              <span className="text-[9px] sm:text-[11px] font-mono font-bold tracking-[0.2em] text-primary uppercase mb-0.5 sm:mb-1">
                {eyebrow}
              </span>

              {/* Main Headline */}
              <h4 className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-display font-extrabold uppercase tracking-tight text-foreground leading-[1.18] line-clamp-2 drop-shadow-2xs">
                {title || "YOUR WHOLESALE APPAREL SOURCING PARTNER"}
              </h4>

              {/* Supporting Subtitle */}
              {subtitle && (
                <p className="text-[11px] sm:text-xs md:text-sm font-sans text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 leading-snug">
                  {subtitle}
                </p>
              )}

              {/* CTA Button Replica */}
              <div className="pt-1.5 sm:pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-xs">
                  <span>{buttonText || "EXPLORE CATALOG →"}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[140px] sm:h-[160px] flex flex-col items-center justify-center p-6 text-center bg-muted/30">
            <Sparkles size={24} className="text-muted-foreground/40 mb-1.5" />
            <p className="text-xs sm:text-sm font-bold text-foreground">
              No banner image uploaded
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              Upload a wide banner image in the media row below to preview your live storefront banner.
            </p>
          </div>
        )}
      </div>

      {/* Sizing & Specs Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
        <span className="font-mono text-[11px]">Dimensions: ~1375 × 158 px • Ratio ~8.7:1</span>
        <span className="text-[11px] hidden sm:inline">Preserves responsive aspect ratio across all devices</span>
      </div>
    </div>
  );
}
