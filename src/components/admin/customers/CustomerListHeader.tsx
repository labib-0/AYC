import React from "react";
import { RefreshCw } from "lucide-react";

export interface CustomerListHeaderProps {
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function CustomerListHeader({
  onRefresh,
  isLoading = false,
}: CustomerListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
          Customers
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
          Manage customer accounts, companies and B2B information.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          title="Refresh customers"
          aria-label="Refresh customers"
          id="btn-refresh-customers"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-primary" : ""} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
