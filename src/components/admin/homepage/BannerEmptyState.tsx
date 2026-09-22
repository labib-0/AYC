import React from "react";
import { ImageOff, PlusCircle } from "lucide-react";

export interface BannerEmptyStateProps {
  onConfigure: () => void;
  isCreating?: boolean;
}

export default function BannerEmptyState({
  onConfigure,
  isCreating = false,
}: BannerEmptyStateProps) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
      <div className="p-4 rounded-full bg-secondary text-muted-foreground">
        <ImageOff size={32} />
      </div>

      <div className="max-w-md space-y-1.5">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          No homepage banner configured
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Create or activate a banner to display it on the storefront header. You can customize the image asset, headline text, CTA button, and target destination.
        </p>
      </div>

      <button
        type="button"
        onClick={onConfigure}
        disabled={isCreating}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
        id="btn-configure-banner"
      >
        <PlusCircle size={15} />
        <span>Configure Banner</span>
      </button>
    </div>
  );
}
