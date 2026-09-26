"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Package
} from "lucide-react";
import { homepageService } from "@/services/homepage.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";

interface SeasonManagerProps {
  initialSeason?: string;
  totalProducts?: number;
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const SEASON_PRESETS = [
  "2026 Core Collection",
  "Spring / Summer 2026",
  "Autumn / Winter 2026",
  "High-Summer 2026",
  "2027 Core Collection",
  "2027 Export Line",
];

export default function SeasonManager({
  initialSeason = "2026 Core Collection",
  totalProducts = 0,
  onSaveSuccess,
  showToast,
}: SeasonManagerProps) {
  const { can, canAny, isSuperAdmin } = useAdminAuth();
  const canEditSeason = isSuperAdmin || canAny(["homepage.banner.edit", "homepage.product.manage", "product.edit"]);

  const [activeSeason, setActiveSeason] = useState(initialSeason);
  const [draftSeason, setDraftSeason] = useState(initialSeason);
  const [applyToAll, setApplyToAll] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialSeason) {
      setActiveSeason(initialSeason);
      setDraftSeason(initialSeason);
    }
  }, [initialSeason]);

  const isDirty = draftSeason.trim() !== activeSeason.trim();

  const handleSelectPreset = (preset: string) => {
    setDraftSeason(preset);
  };

  const handleSave = async () => {
    const trimmed = draftSeason.trim();
    if (!trimmed) {
      showToast("Season name cannot be empty.", "error");
      return;
    }

    if (!canEditSeason) {
      showToast("You do not have permission to update the storewide collection season.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await homepageService.updateActiveSeason(trimmed, applyToAll);
      setActiveSeason(trimmed);
      showToast(
        applyToAll 
          ? `Collection season updated to '${trimmed}' across all ${res?.affected_products_count || totalProducts || "catalog"} products.`
          : `Default collection season updated to '${trimmed}'.`,
        "success"
      );
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to update collection season. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Calendar size={16} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Collection Season Management
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Package size={13} className="text-primary" />
          <span>{totalProducts > 0 ? `${totalProducts} Products in Catalog` : "Storewide"}</span>
        </div>
      </div>

      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        {/* Description & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Set the storewide collection season badge shown on customer product pages, specification sheets, 
              and proforma invoices. Selecting or entering a new season and clicking save will 
              <strong className="text-foreground font-semibold"> automatically synchronize all products</strong> in the database and clear cache instantly.
            </p>

            {/* Quick Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles size={12} className="text-primary" />
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {SEASON_PRESETS.map((preset) => {
                  const isSelected = draftSeason.trim() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                          : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary hover:border-border"
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-primary" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-secondary/40 border border-border/70 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers size={11} className="text-primary" />
                Storefront Badge Preview
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                Live
              </span>
            </div>

            {/* Exact replica of storefront Season badge */}
            <div className="p-3 rounded-lg border border-border/80 bg-card space-y-0.5 shadow-2xs">
              <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block uppercase font-bold tracking-wider">
                Season
              </span>
              <span className="font-semibold text-foreground text-sm block truncate">
                {draftSeason.trim() || activeSeason}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              Renders on every product detail page alongside Fabric, GSM Weight, and Fit specifications.
            </p>
          </div>
        </div>

        {/* Input and Controls Form */}
        <div className="pt-2 border-t border-border/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="custom-season-input" className="block text-xs font-semibold uppercase tracking-wider text-foreground">
                Season / Collection Title
              </label>
              <input
                id="custom-season-input"
                type="text"
                value={draftSeason}
                onChange={(e) => setDraftSeason(e.target.value)}
                placeholder="e.g. Spring / Summer 2026"
                disabled={saving || !canEditSeason}
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
              />
            </div>

            <div className="flex sm:justify-end sm:self-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty || !draftSeason.trim() || !canEditSeason}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Synchronizing Catalog...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Apply to All Products</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Options & Status footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                disabled={saving || !canEditSeason}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-muted-foreground font-medium">
                Update all existing products in PostgreSQL database automatically ({totalProducts > 0 ? `${totalProducts} products` : "all catalog items"})
              </span>
            </label>

            <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Current Active: <strong className="text-foreground">{activeSeason}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
