"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check, X, AlertCircle } from "lucide-react";

export type DateFilterPreset =
  | "all"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom";

export interface OrderDateFilterProps {
  datePreset: DateFilterPreset;
  dateFrom?: string;
  dateTo?: string;
  onChange: (preset: DateFilterPreset, dateFrom?: string, dateTo?: string) => void;
}

const PRESET_OPTIONS: { id: DateFilterPreset; label: string }[] = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7_days", label: "Last 7 Days" },
  { id: "last_30_days", label: "Last 30 Days" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getPillLabel(preset: DateFilterPreset, dateFrom?: string, dateTo?: string): string {
  switch (preset) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "last_7_days":
      return "Last 7 Days";
    case "last_30_days":
      return "Last 30 Days";
    case "this_month":
      return "This Month";
    case "last_month":
      return "Last Month";
    case "custom": {
      if (dateFrom && dateTo) {
        if (dateFrom === dateTo) {
          return formatDateDisplay(dateFrom);
        }
        return `${formatDateDisplay(dateFrom)} – ${formatDateDisplay(dateTo)}`;
      }
      if (dateFrom) return `From ${formatDateDisplay(dateFrom)}`;
      if (dateTo) return `Until ${formatDateDisplay(dateTo)}`;
      return "Custom Range";
    }
    case "all":
    default:
      return "All Dates";
  }
}

export default function OrderDateFilter({
  datePreset,
  dateFrom,
  dateTo,
  onChange,
}: OrderDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Temporary state for custom date inputs
  const [tempFrom, setTempFrom] = useState(dateFrom || "");
  const [tempTo, setTempTo] = useState(dateTo || "");
  const [showCustomInputs, setShowCustomInputs] = useState(datePreset === "custom");

  // Sync temp values when props change
  useEffect(() => {
    setTempFrom(dateFrom || "");
    setTempTo(dateTo || "");
    setShowCustomInputs(datePreset === "custom");
  }, [datePreset, dateFrom, dateTo]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const isActive = datePreset !== "all";
  const displayLabel = getPillLabel(datePreset, dateFrom, dateTo);

  const hasRangeError = Boolean(tempFrom && tempTo && tempFrom > tempTo);

  const handleSelectPreset = (preset: DateFilterPreset) => {
    if (preset === "custom") {
      setShowCustomInputs(true);
      return;
    }
    setShowCustomInputs(false);
    setTempFrom("");
    setTempTo("");
    onChange(preset, undefined, undefined);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (hasRangeError) return;
    if (!tempFrom && !tempTo) return;
    onChange("custom", tempFrom || undefined, tempTo || undefined);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempFrom("");
    setTempTo("");
    setShowCustomInputs(false);
    onChange("all", undefined, undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Date Filter Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-3 py-2 text-xs rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 outline-none focus:ring-1 focus:ring-primary ${
          isActive
            ? "border-primary/60 bg-primary/10 text-primary font-medium shadow-2xs"
            : "border-border bg-card text-foreground hover:bg-secondary/40"
        }`}
        id="btn-order-date-filter"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Filter orders by date"
      >
        <Calendar size={13} className={isActive ? "text-primary" : "text-muted-foreground"} />
        <span className="whitespace-nowrap font-sans">{displayLabel}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Date range filter menu"
          className="absolute left-0 mt-2 w-72 sm:w-80 p-3 rounded-2xl border border-border/80 bg-card shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filter by Date
            </span>
            {isActive && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer transition-colors"
                id="btn-clear-date-filter"
              >
                <X size={11} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Preset Options List */}
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {PRESET_OPTIONS.map((opt) => {
              const isSelected =
                opt.id === "custom"
                  ? datePreset === "custom" || showCustomInputs
                  : datePreset === opt.id && !showCustomInputs;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-secondary/60"
                  }`}
                  id={`btn-date-preset-${opt.id}`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={13} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Section */}
          {showCustomInputs && (
            <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="input-date-from"
                    className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                  >
                    From
                  </label>
                  <input
                    type="date"
                    id="input-date-from"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-secondary/30 text-foreground text-xs font-mono focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-date-to"
                    className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                  >
                    To
                  </label>
                  <input
                    type="date"
                    id="input-date-to"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-secondary/30 text-foreground text-xs font-mono focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              </div>

              {hasRangeError && (
                <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>Start date cannot be after end date.</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                  id="btn-custom-date-clear"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  disabled={hasRangeError || (!tempFrom && !tempTo)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                  id="btn-custom-date-apply"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
