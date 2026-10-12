"use client";

import { AdminPageSize, PAGE_SIZE_OPTIONS, DEFAULT_ADMIN_PAGE_SIZE } from "@/types/admin-listing";

export interface PageSizeSelectorProps {
  value: number;
  onChange: (pageSize: AdminPageSize) => void;
  options?: readonly AdminPageSize[] | readonly number[];
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
}

/**
 * AYC Admin — Standard Page-Size Selector
 * Mandatory options: 5 (default), 10, 20, 50 records.
 */
export default function PageSizeSelector({
  value,
  onChange,
  options = PAGE_SIZE_OPTIONS,
  label = "Show",
  id,
  disabled = false,
  className = "",
  selectClassName = "",
}: PageSizeSelectorProps) {
  const generatedId = id || "admin-page-size-selector";

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <label htmlFor={generatedId} className="font-semibold whitespace-nowrap select-none">
        {label}:
      </label>
      <div className="relative inline-flex items-center">
        <select
          id={generatedId}
          value={value}
          onChange={(e) => {
            const nextVal = Number(e.target.value) as AdminPageSize;
            onChange(nextVal);
          }}
          disabled={disabled}
          className={`h-8 pl-2.5 pr-6 rounded-lg border border-border bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${selectClassName}`}
          aria-label={`${label} records per page`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 text-[10px] text-muted-foreground">
          ▼
        </span>
      </div>
    </div>
  );
}
