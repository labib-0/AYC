import React from "react";
import { Save, RotateCcw, ExternalLink, Loader2 } from "lucide-react";

export interface HomepageBannerHeaderProps {
  title?: string;
  description?: string;
  storefrontUrl: string;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export default function HomepageBannerHeader({
  title = "Homepage",
  description = "Manage your storefront content and hero banner.",
  storefrontUrl,
  isDirty,
  isSaving,
  onSave,
  onReset,
}: HomepageBannerHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {isDirty && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Unsaved Changes
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Preview Storefront Action */}
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-medium text-xs transition-colors cursor-pointer"
          id="link-preview-storefront"
          title="Open storefront homepage in a new tab"
        >
          <span>Preview Storefront</span>
          <ExternalLink size={12} />
        </a>

        {/* Reset Action */}
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
            id="btn-reset-banner"
            title="Discard unsaved local changes"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}

        {/* Save Changes Action */}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          id="btn-save-banner"
        >
          {isSaving ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={13} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
