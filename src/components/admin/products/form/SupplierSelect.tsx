"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Building2, Search, X, Check, Loader2, AlertCircle } from "lucide-react";
import { adminSupplierService } from "@/services/admin/supplier.service";
import { SupplierModel } from "@/types/b2b";

interface SupplierSelectProps {
  value?: string | number | null;
  selectedSupplier?: SupplierModel | null;
  onChange: (supplierId: number | null, supplier: SupplierModel | null) => void;
  error?: string;
  disabled?: boolean;
}

export default function SupplierSelect({
  value,
  selectedSupplier: initialSupplier,
  onChange,
  error,
  disabled = false,
}: SupplierSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SupplierModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<SupplierModel | null>(initialSupplier || null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync currentSupplier when initialSupplier prop changes
  useEffect(() => {
    if (initialSupplier) {
      setCurrentSupplier(initialSupplier);
    } else if (!value) {
      setCurrentSupplier(null);
    }
  }, [initialSupplier, value]);

  // If value is provided but supplier object is missing, fetch supplier details
  useEffect(() => {
    if (value && (!currentSupplier || String(currentSupplier.id) !== String(value))) {
      let isMounted = true;
      adminSupplierService.getSupplierById(value).then((sup) => {
        if (isMounted && sup) {
          setCurrentSupplier(sup);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [value, currentSupplier]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Search suppliers
  const executeSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const list = await adminSupplierService.searchSuppliers(query, 20);
      setResults(list.filter((s) => s.is_active !== false));
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle open and initial query
  const handleOpenDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    executeSearch(searchTerm);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Debounced search on input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query);
    }, 250);
  };

  const handleSelect = (supplier: SupplierModel) => {
    setCurrentSupplier(supplier);
    onChange(supplier.id, supplier);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSupplier(null);
    onChange(null, null);
    setSearchTerm("");
    setResults([]);
  };

  const isSelected = (id: number) => {
    return currentSupplier?.id === id || String(value) === String(id);
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
          Supplier <span className="text-[10px] font-normal text-muted-foreground lowercase">(admin only / optional)</span>
        </label>
        {currentSupplier && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-[10px] font-bold text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Selected Box / Trigger */}
      {!isOpen ? (
        <div
          onClick={handleOpenDropdown}
          className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl border bg-card text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
            disabled ? "opacity-60 cursor-not-allowed" : "hover:border-foreground/40"
          } ${error ? "border-red-500 focus:ring-red-500/30" : "border-border"}`}
        >
          {currentSupplier ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 size={12} />
              </div>
              <span className="font-semibold text-foreground truncate">
                <span className="font-mono text-muted-foreground mr-1">{currentSupplier.code}</span>
                — {currentSupplier.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search size={13} className="shrink-0 text-muted-foreground/60" />
              <span>Search supplier by name or ID...</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {currentSupplier && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Remove supplier"
                aria-label="Remove supplier"
              >
                <X size={13} />
              </button>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1.5 py-0.5 rounded bg-secondary">
              Select
            </span>
          </div>
        </div>
      ) : (
        /* Active Search Input & Dropdown */
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search supplier by name or ID..."
              disabled={disabled}
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-primary bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {isLoading ? (
              <Loader2 size={14} className="absolute right-3 text-primary animate-spin" />
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Results Dropdown Menu */}
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-lg p-1 space-y-1">
            {isLoading && results.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Searching suppliers...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {searchTerm.trim() ? (
                  <>No suppliers found matching &ldquo;{searchTerm}&rdquo;</>
                ) : (
                  <>No suppliers registered in the system yet.</>
                )}
              </div>
            ) : (
              results.map((supplier) => {
                const active = isSelected(supplier.id);
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      active
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-secondary text-foreground font-medium"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-muted-foreground uppercase">{supplier.code}</span>
                        <span>—</span>
                        <span className="truncate">{supplier.name}</span>
                      </div>
                      {supplier.contact_person && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Contact: {supplier.contact_person} {supplier.email ? `(${supplier.email})` : ""}
                        </div>
                      )}
                    </div>
                    {active && <Check size={14} className="shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
