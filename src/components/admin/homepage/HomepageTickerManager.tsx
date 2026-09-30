"use client";

import React, { useState } from "react";
import {
  ListPlus,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { HomepageTickerItem } from "@/services/homepage.service";

export interface HomepageTickerManagerProps {
  items: HomepageTickerItem[];
  onChange: (items: HomepageTickerItem[]) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  isDirty?: boolean;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

const PRESET_KEYWORDS = [
  "QUALITY",
  "FACTORY DIRECT",
  "EXPORT READY",
  "GLOBAL SHIPPING",
  "BULK ORDER SUPPORT",
  "QUALITY APPAREL",
  "VERIFIED STOCK",
  "BUSINESS SOURCING",
];

export default function HomepageTickerManager({
  items,
  onChange,
  onSave,
  isSaving = false,
  isDirty = false,
  showToast,
  disabled = false,
}: HomepageTickerManagerProps) {
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddKeyword = (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : newKeyword).trim();
    if (!text) {
      showToast("Keyword text cannot be empty.", "error");
      return;
    }

    const newItem: HomepageTickerItem = {
      text: text.toUpperCase(),
      is_active: true,
      sort_order: items.length,
    };

    onChange([...items, newItem]);
    if (textToAdd === undefined) {
      setNewKeyword("");
    }
  };

  const handleUpdateText = (index: number, newText: string) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, text: newText };
      }
      return item;
    });
    onChange(updated);
  };

  const handleToggleActive = (index: number) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, is_active: !item.is_active };
      }
      return item;
    });
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index).map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange(updated.map((item, idx) => ({ ...item, sort_order: idx })));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange(updated.map((item, idx) => ({ ...item, sort_order: idx })));
  };

  const handleAddPresets = () => {
    const existingTexts = new Set(items.map((i) => i.text.trim().toUpperCase()));
    const toAdd: HomepageTickerItem[] = [];
    PRESET_KEYWORDS.forEach((k) => {
      if (!existingTexts.has(k)) {
        toAdd.push({
          text: k,
          is_active: true,
          sort_order: items.length + toAdd.length,
        });
      }
    });

    if (toAdd.length === 0) {
      showToast("All standard preset keywords already exist in the list.", "error");
      return;
    }

    onChange([...items, ...toAdd]);
    showToast(`Added ${toAdd.length} preset keyword(s).`, "success");
  };

  const activeCount = items.filter((i) => i.is_active && i.text.trim().length > 0).length;

  return (
    <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ListPlus size={16} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Homepage Ticker / Keywords
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {activeCount} Active / {items.length} Total
          </span>
          {onSave && isDirty && (
            <button
              type="button"
              onClick={onSave}
              disabled={disabled || isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              <span>Save Ticker</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Customize the scrolling keyword strip displayed on the customer homepage directly below the main banner. Add, reorder, edit, and toggle keywords.
      </p>

      {/* Live Preview Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-[#EA580C]" />
            <span>Storefront Ticker Preview</span>
          </span>
          <span>{activeCount === 0 ? "Hidden on Storefront (Empty)" : "Live Marquee Loop"}</span>
        </div>

        <div className="relative w-full h-8 overflow-hidden rounded-xl border border-border/60 bg-secondary/20 flex items-center px-3">
          {activeCount > 0 ? (
            <div className="flex items-center whitespace-nowrap overflow-hidden text-xs">
              {items
                .filter((item) => item.is_active && item.text.trim().length > 0)
                .map((item, idx) => (
                  <span key={item.id || idx} className="inline-flex items-center">
                    <span className="font-bold uppercase tracking-tight text-foreground text-[11px]">
                      {item.text.trim()}
                    </span>
                    <span className="mx-3 text-[#EA580C] select-none">•</span>
                  </span>
                ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              No active keywords. Ticker will be hidden gracefully on storefront.
            </span>
          )}
        </div>
      </div>

      {/* Add New Keyword Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddKeyword();
            }
          }}
          placeholder="Enter keyword (e.g. FACTORY DIRECT, EXPORT READY)..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-semibold"
          disabled={disabled || isSaving}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddKeyword()}
            disabled={disabled || isSaving || !newKeyword.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Keyword</span>
          </button>
          <button
            type="button"
            onClick={handleAddPresets}
            disabled={disabled || isSaving}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors cursor-pointer"
            title="Add standard wholesale apparel preset keywords"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">Presets</span>
          </button>
        </div>
      </div>

      {/* Keywords Reorderable List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              No ticker keywords configured yet.
            </p>
            <button
              type="button"
              onClick={handleAddPresets}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              + Click here to add default wholesale presets
            </button>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id ? `item-${item.id}` : `idx-${index}`}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors ${
                item.is_active
                  ? "bg-secondary/20 border-border/70"
                  : "bg-muted/30 border-dashed border-border/50 opacity-60"
              }`}
            >
              {/* Order index + text input */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[11px] font-mono text-muted-foreground/80 w-5 text-center shrink-0">
                  {index + 1}
                </span>

                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleUpdateText(index, e.target.value)}
                  className="w-full max-w-md px-2.5 py-1 text-xs rounded-lg border border-transparent hover:border-input focus:border-primary focus:bg-background focus:outline-none transition-colors uppercase font-bold text-foreground"
                  disabled={disabled || isSaving}
                />
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Active / Inactive Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(index)}
                  disabled={disabled || isSaving}
                  className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    item.is_active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                  title={item.is_active ? "Active on ticker (click to disable)" : "Disabled (click to activate)"}
                >
                  {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                {/* Move Up */}
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={disabled || isSaving || index === 0}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Move keyword up"
                >
                  <ArrowUp size={13} />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={disabled || isSaving || index === items.length - 1}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Move keyword down"
                >
                  <ArrowDown size={13} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={disabled || isSaving}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="Delete keyword"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
