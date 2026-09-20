"use client";

import { CheckCircle2, Circle, Globe, FileText } from "lucide-react";

interface ProductPublishSectionProps {
  status: "published" | "draft";
  onStatusChange: (status: "published" | "draft") => void;
  checklist: {
    hasName: boolean;
    hasBrand: boolean;
    hasPrice: boolean;
    hasImage: boolean;
    hasMoq: boolean;
  };
}

export default function ProductPublishSection({
  status,
  onStatusChange,
  checklist,
}: ProductPublishSectionProps) {
  const isPublished = status === "published";

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          Catalog Visibility & Status
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Controls whether buyers can view and order this product.
        </p>
      </div>

      {/* Status Selection Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Published */}
        <button
          type="button"
          onClick={() => onStatusChange("published")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            isPublished
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <Globe
              size={16}
              className={isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
            />
            <span
              className={`w-2 h-2 rounded-full ${
                isPublished ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
              }`}
            />
          </div>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              isPublished ? "text-emerald-900 dark:text-emerald-200" : "text-foreground"
            }`}
          >
            Published
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Live on storefront</p>
        </button>

        {/* Draft */}
        <button
          type="button"
          onClick={() => onStatusChange("draft")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            !isPublished
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <FileText
              size={16}
              className={!isPublished ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}
            />
            <span
              className={`w-2 h-2 rounded-full ${
                !isPublished ? "bg-amber-500" : "bg-muted-foreground/40"
              }`}
            />
          </div>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              !isPublished ? "text-amber-900 dark:text-amber-200" : "text-foreground"
            }`}
          >
            Draft
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Hidden from buyers</p>
        </button>
      </div>

      {/* Readiness Checklist */}
      <div className="pt-2 border-t border-border/60 space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Catalog Readiness
        </span>
        <div className="space-y-1.5">
          <CheckItem label="Product Name" ok={checklist.hasName} />
          <CheckItem label="Brand Assigned" ok={checklist.hasBrand} />
          <CheckItem label="Wholesale Price Set" ok={checklist.hasPrice} />
          <CheckItem label="Product Image Uploaded" ok={checklist.hasImage} />
          <CheckItem label="MOQ Defined" ok={checklist.hasMoq} />
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
      ) : (
        <Circle size={13} className="text-muted-foreground/40 shrink-0" />
      )}
      <span className={ok ? "font-medium text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
