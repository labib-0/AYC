/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Sparkles, ExternalLink } from "lucide-react";

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
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-2xs space-y-3 w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground uppercase">
            Hero Banner
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Live Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-foreground border border-border/60">
            <ExternalLink size={11} className="text-muted-foreground" />
            <span>Target: <strong className="text-primary">{buttonTarget || "#featured"}</strong></span>
          </span>
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            1375 × 158 px
          </span>
        </div>
      </div>

      {/* Prominent Storefront-Style Banner Container */}
      <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-secondary/80 border border-border/60 shadow-xs">
        {imageUrl ? (
          <div className="relative w-full h-[135px] sm:h-[155px] md:h-[175px] lg:h-[190px] flex items-center overflow-hidden">
            {/* Background Photographic Image */}
            <img
              src={imageUrl}
              alt={title || "Hero Banner Preview"}
              className="absolute inset-0 w-full h-full object-cover object-center md:object-right transition-transform duration-500 pointer-events-none"
            />

            {/* Contrast Gradient Overlay */}
            <div
              className="absolute inset-0 bg-black/45 bg-gradient-to-r from-background/90 via-background/60 to-transparent sm:from-background/85 sm:via-background/50 sm:to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Typography Overlay */}
            <div className="relative z-10 w-full max-w-3xl px-5 sm:px-8 md:px-10 py-3 sm:py-4 flex flex-col justify-center">
              {/* Eyebrow */}
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.2em] text-primary uppercase mb-0.5">
                {eyebrow}
              </span>

              {/* Main Headline */}
              <h4 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-display font-extrabold uppercase tracking-tight text-foreground leading-tight line-clamp-2 drop-shadow-2xs">
                {title || "YOUR WHOLESALE APPAREL SOURCING PARTNER"}
              </h4>

              {/* Supporting Subtitle */}
              {subtitle && (
                <p className="text-[11px] sm:text-xs md:text-sm font-sans text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 leading-snug">
                  {subtitle}
                </p>
              )}

              {/* CTA Button Replica */}
              <div className="pt-2">
                <span className="inline-flex items-center px-3 sm:px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-xs">
                  {buttonText || "EXPLORE CATALOG →"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[140px] sm:h-[160px] flex flex-col items-center justify-center p-6 text-center bg-muted/20">
            <Sparkles size={22} className="text-muted-foreground/40 mb-1" />
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              No banner image uploaded
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload an image in the section below to preview your live hero banner.
            </p>
          </div>
        )}
      </div>

      {/* Sizing metadata */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 font-mono">
        <span>1375 × 158 px</span>
        <span className="text-[10px] font-sans hidden sm:inline text-muted-foreground/80">Storefront preview</span>
      </div>
    </div>
  );
}
