"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink } from "lucide-react";
import { HeroBannerData } from "@/types/cms";

interface HeroBannerSectionProps {
  data: HeroBannerData;
}

export default function HeroBannerSection({ data }: HeroBannerSectionProps) {
  const safeData = data || {};
  const {
    title,
    subtitle,
    badge,
    imageUrl = (safeData as any).image_url,
    alignment = "center",
    ctaText = (safeData as any).cta_primary_label,
    ctaUrl = (safeData as any).cta_primary_url,
    ctaVariant = "primary",
    secondaryCtaText = (safeData as any).cta_secondary_label,
    secondaryCtaUrl = (safeData as any).cta_secondary_url,
    overlayOpacity = (safeData as any).overlay_opacity ?? 60,
  } = safeData;

  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center mx-auto",
    right: "text-right items-end ml-auto",
  }[alignment];

  const opacityValue = Math.min(Math.max(overlayOpacity, 0), 100) / 100;

  return (
    <section className="relative w-full overflow-hidden bg-[#0b1329] text-white py-16 sm:py-24 lg:py-32">
      {/* Background Image & Overlay */}
      {imageUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={imageUrl}
            alt={title || "Banner background"}
            fill
            className="object-cover object-center"
            priority
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: opacityValue }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1329] via-transparent to-black/30" />
        </div>
      )}

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col max-w-3xl ${alignClasses}`}>
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-4 backdrop-blur-xs">
              {badge}
            </span>
          )}

          {title && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-4">
              {title}
            </h1>
          )}

          {subtitle && (
            <p className="text-base sm:text-lg md:text-xl text-white/80 leading-relaxed font-normal mb-8 max-w-2xl">
              {subtitle}
            </p>
          )}

          {/* Buttons */}
          {(ctaText || secondaryCtaText) && (
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {ctaText && ctaUrl && (
                <Link
                  href={ctaUrl}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg min-h-[44px] ${
                    ctaVariant === "outline"
                      ? "border border-white/40 text-white hover:bg-white/10"
                      : ctaVariant === "secondary"
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20"
                  }`}
                >
                  <span>{ctaText}</span>
                  <ArrowRight size={16} />
                </Link>
              )}

              {secondaryCtaText && secondaryCtaUrl && (
                <Link
                  href={secondaryCtaUrl}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-white/20 text-white/90 hover:text-white hover:bg-white/10 transition-colors min-h-[44px]"
                >
                  <span>{secondaryCtaText}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

