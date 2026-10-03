import React from "react";
import { Sparkles } from "lucide-react";

export interface BannerContentFormProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonTarget: string;
  onChange: (field: "title" | "subtitle" | "buttonText" | "buttonTarget", value: string) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const TARGET_PRESETS = [
  { label: "#featured", desc: "Featured" },
  { label: "/products", desc: "Products" },
  { label: "/categories", desc: "Categories" },
  { label: "/brands", desc: "Brands" },
  { label: "/rfq", desc: "RFQ" },
];

export default function BannerContentForm({
  title,
  subtitle,
  buttonText,
  buttonTarget,
  onChange,
  errors,
  disabled = false,
}: BannerContentFormProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-2xs w-full space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground uppercase">
            Hero Content
          </h3>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          LIVE
        </span>
      </div>

      <div className="space-y-4">
        {/* Headline / Title - Full Width */}
        <div>
          <label
            htmlFor="banner-title"
            className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1.5"
          >
            <span>Headline</span>
            <span className="text-destructive font-bold">*</span>
          </label>
          <input
            id="banner-title"
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. YOUR WHOLESALE APPAREL SOURCING PARTNER"
            disabled={disabled}
            className={`w-full px-3.5 py-2 rounded-xl border bg-background text-foreground text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all ${
              errors.title
                ? "border-destructive focus:ring-destructive/20"
                : "border-border/80 focus:border-primary"
            }`}
          />
          {errors.title && (
            <p className="text-[11px] text-destructive mt-1 font-medium">{errors.title}</p>
          )}
        </div>

        {/* Supporting Text - Full Width */}
        <div>
          <label
            htmlFor="banner-subtitle"
            className="text-xs font-semibold text-foreground block mb-1.5"
          >
            Supporting Text
          </label>
          <textarea
            id="banner-subtitle"
            rows={2}
            value={subtitle}
            maxLength={250}
            onChange={(e) => onChange("subtitle", e.target.value)}
            placeholder="e.g. Quality apparel for retailers, boutiques and bulk buyers with dependable sourcing."
            disabled={disabled}
            className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
          />
        </div>

        {/* CTA Label + Destination - 2 Columns on Desktop, Stack on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* CTA Label */}
          <div>
            <label
              htmlFor="banner-button-text"
              className="text-xs font-semibold text-foreground block mb-1.5"
            >
              CTA Label
            </label>
            <input
              id="banner-button-text"
              type="text"
              value={buttonText}
              maxLength={50}
              onChange={(e) => onChange("buttonText", e.target.value)}
              placeholder="e.g. EXPLORE CATALOG →"
              disabled={disabled}
              className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          {/* Destination */}
          <div>
            <label
              htmlFor="banner-button-target"
              className="text-xs font-semibold text-foreground block mb-1.5"
            >
              Destination
            </label>
            <input
              id="banner-button-target"
              type="text"
              value={buttonTarget}
              onChange={(e) => onChange("buttonTarget", e.target.value)}
              placeholder="e.g. #featured or /products"
              disabled={disabled}
              className={`w-full px-3.5 py-2 rounded-xl border bg-background text-foreground text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-all ${
                errors.buttonTarget
                  ? "border-destructive focus:ring-destructive/20"
                  : "border-border/80 focus:border-primary"
              }`}
            />
            {errors.buttonTarget && (
              <p className="text-[11px] text-destructive mt-1 font-medium">{errors.buttonTarget}</p>
            )}
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-1 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Destinations:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange("buttonTarget", preset.label)}
                disabled={disabled}
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  buttonTarget === preset.label
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60"
                }`}
                title={preset.desc}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
