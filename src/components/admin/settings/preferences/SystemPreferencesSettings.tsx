"use client";

import React, { useState, useEffect } from "react";
import { DollarSign, Package, ShieldCheck, Save, AlertCircle } from "lucide-react";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface SystemPreferencesSettingsProps {
  onNotify: (message: string) => void;
}

export default function SystemPreferencesSettings({ onNotify }: SystemPreferencesSettingsProps) {
  const [defaultIncoterm, setDefaultIncoterm] = useState("FOB Dhaka");
  const [defaultCartonSpec, setDefaultCartonSpec] = useState("Standard 5-ply export master carton (60x40x30 cm)");
  const [defaultQualityStandard, setDefaultQualityStandard] = useState("AQL 2.5 Major");
  const [defaultPaginationSize, setDefaultPaginationSize] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = mockStore.getSystemPreferences();
    setDefaultIncoterm(data.defaultIncoterm || "FOB Dhaka");
    setDefaultCartonSpec(data.defaultCartonSpec || "Standard 5-ply export master carton (60x40x30 cm)");
    setDefaultQualityStandard(data.defaultQualityStandard || "AQL 2.5 Major");
    setDefaultPaginationSize(data.defaultPaginationSize || 20);
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      mockStore.saveSystemPreferences({
        defaultIncoterm,
        defaultCartonSpec: defaultCartonSpec.trim(),
        defaultQualityStandard,
        defaultPaginationSize: Number(defaultPaginationSize) || 20,
      });

      onNotify("System preferences saved successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Currency Standard Card */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Operational Currency</h3>
              <p className="text-xs text-muted-foreground">
                Base foreign exchange valuation standard used across wholesale pricing and invoices.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={12} />
            <span>USD Export Standard</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-foreground font-mono">USD ($)</span>
              <span className="text-xs text-muted-foreground font-semibold">United States Dollar</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All international commercial transactions, proforma invoices, wholesale catalog wholesale prices, and shipping valuations operate exclusively in USD. Multi-currency exchange rate conversions are handled at the buyer&apos;s settlement bank.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-secondary text-foreground border border-border/80 uppercase tracking-wider">
              Fixed USD Base
            </span>
          </div>
        </div>
      </div>

      {/* Export & Logistics Defaults Form */}
      <form onSubmit={handleSavePreferences} className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Export Document &amp; Commercial Defaults</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Default trade terms pre-populated when issuing new commercial documents, offers, and quotes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Default International Incoterm
            </label>
            <select
              value={defaultIncoterm}
              onChange={(e) => setDefaultIncoterm(e.target.value)}
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value="FOB Dhaka">FOB Dhaka (Port of Loading Hazrat Shahjalal DAC)</option>
              <option value="DAP">DAP (Delivered at Place)</option>
              <option value="CIF">CIF (Cost, Insurance and Freight)</option>
              <option value="EXW">EXW (Ex Works Dhaka Factory)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Quality Inspection Standard
            </label>
            <select
              value={defaultQualityStandard}
              onChange={(e) => setDefaultQualityStandard(e.target.value)}
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value="AQL 2.5 Major">AQL 2.5 Major / 4.0 Minor (Export Standard)</option>
              <option value="AQL 1.5 Strict">AQL 1.5 Strict (Luxury Brand Standard)</option>
              <option value="100% Full Inspection">100% Full Piece Inspection</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">
              Default Export Master Carton Specification
            </label>
            <input
              type="text"
              value={defaultCartonSpec}
              onChange={(e) => setDefaultCartonSpec(e.target.value)}
              placeholder="Standard 5-ply export master carton (60x40x30 cm)"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <span className="text-[11px] text-muted-foreground block">
              Default packaging description populated into Packing Lists and Commercial Invoices.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Default Admin Pagination Size
            </label>
            <select
              value={defaultPaginationSize}
              onChange={(e) => setDefaultPaginationSize(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value={10}>10 items per page</option>
              <option value={20}>20 items per page (Recommended)</option>
              <option value={50}>50 items per page</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? "Saving..." : "Save Preferences"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
