"use client";

import React from "react";
import { Users, Info } from "lucide-react";

const FIXED_AUDIENCES = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"] as const;

export default function AudienceReference() {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground/80 shrink-0">
            <Users size={14} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Audience
            </h2>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Info size={11} className="shrink-0 text-muted-foreground/70" />
              <span>Audience is a fixed product attribute and is not managed as a product category.</span>
            </p>
          </div>
        </div>

        {/* Read-Only Fixed Audience Pills */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          {FIXED_AUDIENCES.map((audience) => (
            <span
              key={audience}
              className="px-2.5 py-1 rounded-lg bg-secondary/70 border border-border/60 text-[11px] font-bold tracking-wider text-foreground/90 uppercase select-none"
            >
              {audience}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
