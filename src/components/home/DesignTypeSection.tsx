"use client";

import Link from "next/link";

export const DESIGN_TYPE_OPTIONS = [
  { label: "ORIGINAL", value: "ORIGINAL" },
  { label: "MASTER COPY", value: "MASTER COPY" },
] as const;

export default function DesignTypeSection() {
  return (
    <section
      id="design-type"
      className="pt-1 sm:pt-1.5 pb-1 sm:pb-1.5 bg-background scroll-mt-20 select-none"
      aria-label="Design Type"
    >
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        {/* DESIGN TYPE Section Heading */}
        <div className="mb-2 sm:mb-2.5 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground leading-none">
              DESIGN TYPE
            </h2>
          </div>
        </div>

        {/* Text-Only Selectable Pills (No Icons) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5" role="list">
          {DESIGN_TYPE_OPTIONS.map((dt) => {
            const param = encodeURIComponent(dt.value);
            return (
              <Link
                key={dt.value}
                href={`/search?design_type=${param}&filterOpen=true`}
                role="listitem"
                title={`Browse ${dt.label} products`}
                aria-label={`Browse ${dt.label} design type`}
                className="group inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-900/20 dark:border-white/20 bg-card/90 dark:bg-card/60 hover:bg-secondary/70 dark:hover:bg-secondary/60 hover:border-slate-900/60 dark:hover:border-white/60 text-foreground/85 hover:text-foreground text-[11px] sm:text-[12.5px] font-sans font-bold uppercase tracking-wider leading-none shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer text-center min-h-[36px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="whitespace-nowrap">{dt.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
