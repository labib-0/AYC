import React from "react";
import { Layers, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { PromotionRecord } from "@/services/admin/promotion.service";

export interface BannerRecordSelectorProps {
  records: PromotionRecord[];
  selectedId: number | null;
  onSelect: (record: PromotionRecord) => void;
  onCreateNew: () => void;
  disabled?: boolean;
}

export default function BannerRecordSelector({
  records,
  selectedId,
  onSelect,
  onCreateNew,
  disabled = false,
}: BannerRecordSelectorProps) {
  if (records.length <= 1) {
    return null; // No selector needed if only 1 banner record exists
  }

  const activeCount = records.filter((r) => r.is_active).length;

  return (
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              Banner Campaign Records ({records.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Multiple banner promotions detected. Select a record to inspect and edit.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          id="btn-create-new-banner-record"
        >
          <Plus size={13} />
          <span>New Banner</span>
        </button>
      </div>

      {activeCount > 1 && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle size={14} className="shrink-0" />
          <span>
            Multiple banner records are currently marked active. Storefront resolution priority selects the first matching record.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {records.map((record) => {
          const isSelected = record.id === selectedId;
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record)}
              disabled={disabled}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-2xs"
                  : "border-border/80 bg-background hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-foreground line-clamp-1">
                  {record.title || `Banner #${record.id}`}
                </span>
                {record.is_active ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <CheckCircle2 size={10} />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground shrink-0">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Type: {record.type}</span>
                <span>ID: #{record.id}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
