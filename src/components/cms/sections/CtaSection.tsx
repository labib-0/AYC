"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CallToActionData } from "@/types/cms";

interface CtaSectionProps {
  data: CallToActionData;
}

export default function CtaSection({ data }: CtaSectionProps) {
  const {
    title,
    subtitle,
    primaryBtnText,
    primaryBtnUrl,
    secondaryBtnText,
    secondaryBtnUrl,
    backgroundColor = "navy",
  } = data;

  const bgClasses = {
    navy: "bg-[#0b1329] text-white border-white/10",
    orange: "bg-amber-500 text-slate-950 border-amber-600/20",
    slate: "bg-secondary text-foreground border-border",
    default: "bg-card text-foreground border-border",
  }[backgroundColor];

  return (
    <section className="w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div
          className={`rounded-3xl p-8 sm:p-12 lg:p-16 border shadow-xl text-center flex flex-col items-center ${bgClasses}`}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight max-w-2xl mb-4">
            {title}
          </h2>

          {subtitle && (
            <p
              className={`text-sm sm:text-base md:text-lg max-w-xl leading-relaxed mb-8 ${
                backgroundColor === "navy"
                  ? "text-white/80"
                  : backgroundColor === "orange"
                  ? "text-slate-900 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {subtitle}
            </p>
          )}

          {(primaryBtnText || secondaryBtnText) && (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {primaryBtnText && primaryBtnUrl && (
                <Link
                  href={primaryBtnUrl}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 min-h-[44px] shadow-md ${
                    backgroundColor === "navy"
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20"
                      : backgroundColor === "orange"
                      ? "bg-slate-950 hover:bg-slate-900 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  <span>{primaryBtnText}</span>
                  <ArrowRight size={16} />
                </Link>
              )}

              {secondaryBtnText && secondaryBtnUrl && (
                <Link
                  href={secondaryBtnUrl}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors min-h-[44px] ${
                    backgroundColor === "navy"
                      ? "border border-white/20 text-white/90 hover:bg-white/10"
                      : backgroundColor === "orange"
                      ? "border border-slate-950/30 text-slate-950 hover:bg-slate-950/10"
                      : "border border-border text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <span>{secondaryBtnText}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

