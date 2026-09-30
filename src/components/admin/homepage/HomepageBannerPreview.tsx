/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Eye, ExternalLink } from "lucide-react";

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
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-6 shadow-2xs space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Eye size={16} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Homepage Banner Preview
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Real-time representation of the storefront top banner (~1375×158 px)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Target chip */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-secondary text-foreground/80 border border-border/60">
            <ExternalLink size={11} className="text-muted-foreground" />
            <span>Target: {buttonTarget || "#featured"}</span>
          </span>
        </div>
      </div>

      {/* Actual Storefront Top Banner replica */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-secondary/80 border border-border/80 shadow-xs">
        {imageUrl ? (
          <div className="relative w-full h-[110px] xs:h-[120px] sm:h-[135px] md:h-[148px] lg:h-[158px] flex items-center overflow-hidden">
            {/* Background Photographic Image */}
            <img
              src={imageUrl}
              alt={title || "Homepage Banner Preview"}
              className="absolute inset-0 w-full h-full object-cover object-center md:object-right transition-transform duration-700"
            />

            {/* Subtle Gradient Overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/35 to-transparent sm:from-background/55 sm:via-background/20 sm:to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Clean, Minimal B2B Typography Overlay */}
            <div className="relative z-10 w-full max-w-2xl px-4 sm:px-8 md:px-10 lg:px-12 py-2 sm:py-3 flex flex-col justify-center">
              {/* Eyebrow */}
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.2em] text-primary uppercase mb-0.5 sm:mb-1">
                {eyebrow}
              </span>

              {/* Main Headline */}
              <h3 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-display font-extrabold uppercase tracking-tight text-foreground leading-[1.2] line-clamp-2">
                {title || "YOUR WHOLESALE APPAREL SOURCING PARTNER"}
              </h3>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-[10px] sm:text-[11px] md:text-xs font-sans text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
                  {subtitle}
                </p>
              )}

              {/* Compact CTA */}
              <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] font-sans font-bold uppercase tracking-wider text-foreground/90 group-hover:text-primary transition-colors mt-1 sm:mt-1.5">
                <span>{buttonText || "EXPLORE CATALOG →"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[120px] sm:h-[150px] flex flex-col items-center justify-center p-6 text-center bg-muted/40">
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              No banner image uploaded
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-sm">
              Upload a wide banner image below to preview how it will appear on the storefront.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
        <span>Recommended Dimensions: ~1375 × 158 px (aspect ratio ~8.7:1)</span>
        <span>Scales fluidly on smaller screens</span>
      </div>
    </div>
  );
}
