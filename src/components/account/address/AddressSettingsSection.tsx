"use client";

import React from "react";
import { Tag, Star } from "lucide-react";

interface AddressSettingsSectionProps {
  label: string;
  isDefault: boolean;
  saveToBook: boolean;
  hideDefaultCheckbox?: boolean;
  showSaveToBookCheckbox?: boolean;
  onLabelChange: (val: string) => void;
  onLabelBlur: () => void;
  onDefaultChange: (val: boolean) => void;
  onSaveToBookChange: (val: boolean) => void;
  isError: (field: string) => boolean;
  errors: Record<string, string>;
  disabled?: boolean;
}

const PRESET_LABELS = ["Office", "Warehouse", "Store", "Main Address", "Distribution Center"];

export default function AddressSettingsSection({
  label,
  isDefault,
  saveToBook,
  hideDefaultCheckbox = false,
  showSaveToBookCheckbox = false,
  onLabelChange,
  onLabelBlur,
  onDefaultChange,
  onSaveToBookChange,
  isError,
  errors,
  disabled = false,
}: AddressSettingsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/10">
        <Tag size={15} className="text-amber-500" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          3. Address Label &amp; Preferences
        </h4>
      </div>

      <div className="space-y-3">
        {/* Label Input with Preset Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>
              Address Label <span className="text-red-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Identifies this location
            </span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={onLabelBlur}
            placeholder="e.g. Central Warehouse, Headquarters, Retail Store #4"
            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
              isError("label")
                ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
          />
          {isError("label") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.label}
            </p>
          )}

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
            {PRESET_LABELS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onLabelChange(p)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                  label === p
                    ? "bg-amber-500 text-slate-900 border-amber-500 font-bold shadow-xs"
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Default Address Checkbox */}
        {!hideDefaultCheckbox && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={isDefault}
              onChange={(e) => onDefaultChange(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Star
                  size={12}
                  className={isDefault ? "text-amber-500 fill-amber-500" : "text-slate-400"}
                />
                Set as primary default shipping address
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                Only one address can be default. This will automatically become the preselected address for new orders.
              </p>
            </div>
          </label>
        )}

        {/* Checkout optional checkbox: Save to Address Book */}
        {showSaveToBookCheckbox && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 cursor-pointer transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={saveToBook}
              onChange={(e) => onSaveToBookChange(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Save this address to my Address Book
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                Reuse this shipping destination for future commercial orders without re-typing.
              </p>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
