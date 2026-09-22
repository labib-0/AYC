import React from "react";
import { Power, CheckCircle2, EyeOff } from "lucide-react";

export interface BannerStatusControlProps {
  isActive: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}

export default function BannerStatusControl({
  isActive,
  onChange,
  disabled = false,
}: BannerStatusControlProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl transition-colors ${
              isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Power size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <span>Homepage Visibility</span>
              {isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={11} />
                  <span>Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <EyeOff size={11} />
                  <span>Inactive</span>
                </span>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Control whether this banner is published live on the storefront homepage.
            </p>
          </div>
        </div>

        {/* Accessible Switch Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          disabled={disabled}
          onClick={() => onChange(!isActive)}
          className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            isActive ? "bg-emerald-600" : "bg-muted-foreground/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          id="toggle-banner-active"
        >
          <span className="sr-only">Toggle banner active state</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              isActive ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/60">
        {isActive ? (
          <p className="text-foreground/90 font-medium">
            ✅ <strong>Active:</strong> This banner is immediately eligible to render across the storefront header above the ticker. Changes will persist to the live storefront on Save.
          </p>
        ) : (
          <p className="text-amber-700 dark:text-amber-300 font-medium">
            ⏸️ <strong>Inactive:</strong> The banner remains safely saved in your records but is hidden from public storefront visitors.
          </p>
        )}
      </div>
    </div>
  );
}
