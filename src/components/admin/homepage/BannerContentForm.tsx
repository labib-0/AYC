import React from "react";
import { Type, Navigation } from "lucide-react";

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
      {/* Left Card: Banner Messaging */}
      <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div>
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Type size={14} />
              </div>
              <h2 className="text-xs sm:text-sm font-display font-bold uppercase tracking-tight text-foreground">
                Banner Messaging
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
              Live Text
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            Text displayed on the promotional banner.
          </p>

          <div className="space-y-3">
            {/* Banner Headline / Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="banner-title"
                  className="text-xs font-semibold text-foreground flex items-center gap-1"
                >
                  <span>Headline / Title</span>
                  <span className="text-destructive font-bold">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {title.length}/120
                </span>
              </div>
              <input
                id="banner-title"
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="e.g. YOUR WHOLESALE APPAREL SOURCING PARTNER"
                disabled={disabled}
                className={`w-full px-3 py-1.5 sm:py-2 rounded-lg border bg-background text-foreground text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all ${
                  errors.title
                    ? "border-destructive focus:ring-destructive/20"
                    : "border-border/80 focus:border-primary"
                }`}
              />
              {errors.title && (
                <p className="text-[11px] text-destructive mt-1 font-medium">{errors.title}</p>
              )}
            </div>

            {/* Banner Subtitle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="banner-subtitle"
                  className="text-xs font-semibold text-foreground"
                >
                  Supporting Subtitle
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
                placeholder="e.g. Quality apparel for retailers and bulk buyers with dependable sourcing."
                disabled={disabled}
                className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Banner Navigation */}
      <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div>
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Navigation size={14} />
              </div>
              <h2 className="text-xs sm:text-sm font-display font-bold uppercase tracking-tight text-foreground">
                Banner Navigation
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
              Call To Action
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            CTA label and destination.
          </p>

          <div className="space-y-3">
            {/* CTA Button Text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="banner-button-text"
                  className="text-xs font-semibold text-foreground"
                >
                  CTA Button Text
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {buttonText.length}/50
                </span>
              </div>
              <input
                id="banner-button-text"
                type="text"
                value={buttonText}
                maxLength={50}
                onChange={(e) => onChange("buttonText", e.target.value)}
                placeholder="e.g. EXPLORE CATALOG →"
                disabled={disabled}
                className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            {/* Destination Target */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="banner-button-target"
                  className="text-xs font-semibold text-foreground"
                >
                  Destination
                </label>
              </div>
              <input
                id="banner-button-target"
                type="text"
                value={buttonTarget}
                onChange={(e) => onChange("buttonTarget", e.target.value)}
                placeholder="e.g. #featured or /products"
                disabled={disabled}
                className={`w-full px-3 py-1.5 sm:py-2 rounded-lg border bg-background text-foreground text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-all ${
                  errors.buttonTarget
                    ? "border-destructive focus:ring-destructive/20"
                    : "border-border/80 focus:border-primary"
                }`}
              />
              {errors.buttonTarget && (
                <p className="text-[11px] text-destructive mt-1 font-medium">{errors.buttonTarget}</p>
              )}
            </div>

            {/* Quick Suggestion Chips for Destination Target */}
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Quick Target Destinations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onChange("buttonTarget", preset.label)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      buttonTarget === preset.label
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60"
                    }`}
                    title={preset.desc}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
