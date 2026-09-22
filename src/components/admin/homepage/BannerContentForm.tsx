import React from "react";
import { Type, AlignLeft, MousePointerClick, Navigation } from "lucide-react";

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
  { label: "#featured", desc: "Featured Products Anchor" },
  { label: "/products", desc: "Full Catalog" },
  { label: "/categories", desc: "Categories Taxonomy" },
  { label: "/brands", desc: "Brands Directory" },
  { label: "/rfq", desc: "Bulk RFQ & Inquiries" },
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
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-6 shadow-2xs space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Type size={16} />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Banner Messaging &amp; Navigation
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Configure the textual overlay and destination for wholesale buyers.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Banner Headline / Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="banner-title"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <span>Banner Headline / Title</span>
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {title.length}/120
            </span>
          </div>
          <div className="relative">
            <input
              id="banner-title"
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="e.g. YOUR WHOLESALE APPAREL SOURCING PARTNER"
              disabled={disabled}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                errors.title
                  ? "border-red-500 focus:ring-red-500/20"
                  : "border-border/80 focus:border-primary"
              }`}
            />
          </div>
          {errors.title ? (
            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.title}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-1">
              Displays as the primary uppercase headline across the banner.
            </p>
          )}
        </div>

        {/* Banner Subtitle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="banner-subtitle"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <AlignLeft size={13} className="text-muted-foreground" />
              <span>Supporting Subtitle</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {subtitle.length}/250
            </span>
          </div>
          <textarea
            id="banner-subtitle"
            rows={2}
            value={subtitle}
            maxLength={250}
            onChange={(e) => onChange("subtitle", e.target.value)}
            placeholder="e.g. Quality apparel for retailers, boutiques and bulk buyers, with dependable sourcing and export-ready support."
            disabled={disabled}
            className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Optional concise secondary copy. Hidden on very narrow mobile viewports.
          </p>
        </div>

        {/* CTA Button Text & Target Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Button Text */}
          <div>
            <label
              htmlFor="banner-button-text"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5"
            >
              <MousePointerClick size={13} className="text-muted-foreground" />
              <span>CTA Button Text</span>
            </label>
            <input
              id="banner-button-text"
              type="text"
              value={buttonText}
              maxLength={50}
              onChange={(e) => onChange("buttonText", e.target.value)}
              placeholder="e.g. EXPLORE CATALOG →"
              disabled={disabled}
              className="w-full px-3.5 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Action text rendered on the banner.
            </p>
          </div>

          {/* Button Target */}
          <div>
            <label
              htmlFor="banner-button-target"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5"
            >
              <Navigation size={13} className="text-muted-foreground" />
              <span>Destination (Anchor / URL)</span>
            </label>
            <input
              id="banner-button-target"
              type="text"
              value={buttonTarget}
              onChange={(e) => onChange("buttonTarget", e.target.value)}
              placeholder="e.g. #featured or /products"
              disabled={disabled}
              className={`w-full px-3.5 py-2 rounded-xl border bg-background text-foreground text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                errors.buttonTarget
                  ? "border-red-500 focus:ring-red-500/20"
                  : "border-border/80 focus:border-primary"
              }`}
            />
            {errors.buttonTarget ? (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.buttonTarget}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                Storefront route, anchor hash (e.g. #featured), or external link.
              </p>
            )}
          </div>
        </div>

        {/* Quick Suggestion Chips for Destination Target */}
        <div className="pt-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Quick Target Destinations:
          </span>
          <div className="flex flex-wrap gap-2">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange("buttonTarget", preset.label)}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  buttonTarget === preset.label
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60"
                }`}
                title={preset.desc}
              >
                <span>{preset.label}</span>
                <span className="text-[10px] opacity-70">({preset.desc})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
