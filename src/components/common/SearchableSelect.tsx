"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableSelectOption {
  id: string | number;
  name: string;
  logo_url?: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  id?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableSelectOption[];
  value?: string | number | null;
  /**
   * Display name to show if options are still loading or value is not yet in options list
   */
  fallbackDisplay?: string;
  onChange: (value: string, selectedOption?: SearchableSelectOption) => void;
  hasError?: boolean;
  disabled?: boolean;
  actionButton?: React.ReactNode;
  className?: string;
}

export default function SearchableSelect({
  id,
  label,
  required,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  options,
  value,
  fallbackDisplay,
  onChange,
  hasError,
  disabled,
  actionButton,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize string value for comparison
  const strValue = value !== undefined && value !== null ? String(value) : "";

  // Selected option resolution
  const selectedOption = useMemo(() => {
    if (!strValue) return null;
    return (
      options.find(
        (opt) =>
          String(opt.id) === strValue ||
          opt.name.toLowerCase() === strValue.toLowerCase()
      ) || null
    );
  }, [options, strValue]);

  // Display text: either matched option name, fallbackDisplay, or raw value string
  const displayText = selectedOption?.name || fallbackDisplay || strValue || "";

  // Filter options based on case-insensitive search
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [options, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(String(option.id), option);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Optional Header Row with Label & Action Button */}
      {(label || actionButton) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <label
              htmlFor={id}
              className="block text-xs font-bold uppercase tracking-wider text-foreground"
            >
              {label} {required && <span className="text-red-500">*</span>}
            </label>
          )}
          {actionButton}
        </div>
      )}

      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-left flex items-center justify-between gap-2 transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 ${
            hasError
              ? "border-red-500 focus:ring-red-500/30"
              : isOpen
              ? "border-ring ring-2 ring-ring/30"
              : "border-border hover:border-border/80 focus:ring-ring/40"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-muted/30" : ""}`}
        >
          <span
            className={`truncate ${
              displayText ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
          >
            {displayText || placeholder}
          </span>

          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
            {displayText && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="hover:text-foreground p-0.5 rounded transition-colors"
                title="Clear selection"
              >
                <X size={13} />
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {/* Dropdown Panel with Search Input */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl overflow-hidden p-2 space-y-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground font-medium">
                  No matching results found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected =
                    selectedOption?.id === opt.id ||
                    String(opt.id) === strValue ||
                    opt.name.toLowerCase() === strValue.toLowerCase();

                  return (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                    >
                      <span className="truncate">{opt.name}</span>
                      {isSelected && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
