"use client";

import { Search } from "lucide-react";

interface ProductSeoSectionProps {
  seoTitle: string;
  seoDescription: string;
  productName: string;
  slug: string;
  onSeoTitleChange: (val: string) => void;
  onSeoDescriptionChange: (val: string) => void;
}

export default function ProductSeoSection({
  seoTitle,
  seoDescription,
  productName,
  slug,
  onSeoTitleChange,
  onSeoDescriptionChange,
}: ProductSeoSectionProps) {
  const displayTitle = seoTitle || productName || "Product Title Preview";
  const displaySlug = slug || "product-url-slug";
  const displayDesc =
    seoDescription || "Discover premium wholesale apparel from Ayaan Clothing. High quality fabric with custom branding available.";

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          Search Engine Optimization (SEO)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Control organic search titles, meta descriptions, and Google snippet appearance.
        </p>
      </div>

      <div className="space-y-4">
        {/* Search Engine Snippet Preview */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Search size={12} /> Google Search Preview
          </div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
            {displayTitle} | Ayaan Clothing
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
            https://ayaanclothing.com/products/{displaySlug}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {displayDesc}
          </p>
        </div>

        {/* SEO Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              SEO Page Title
            </label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {seoTitle.length} / 60 chars
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder={productName || "Leave empty to use Product Name"}
            className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
          />
        </div>

        {/* SEO Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Meta Description
            </label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {seoDescription.length} / 160 chars
            </span>
          </div>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="Brief summary for search engine results..."
            className="w-full p-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors resize-y leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
