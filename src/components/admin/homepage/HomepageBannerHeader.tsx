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
  title = "Homepage & Banner",
  description = "Manage the primary banner displayed on the AYAAN CLOTHING homepage.",
  storefrontUrl,
  isDirty,
  isSaving,
  onSave,
  onReset,
}: HomepageBannerHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
            {title}
          </h1>
          {isDirty && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
              Unsaved Changes
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {/* Preview on Storefront Link */}
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          id="link-preview-storefront"
          title="Open storefront homepage in a new tab"
        >
          <span>Preview on Storefront</span>
          <ExternalLink size={13} />
        </a>

        {/* Reset Changes Button */}
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
            id="btn-reset-banner"
            title="Discard unsaved local changes"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}

        {/* Save Changes Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          id="btn-save-banner"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
