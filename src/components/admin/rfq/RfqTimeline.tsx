import React from "react";
import { RfqHistoryEvent } from "@/types/b2b";
import RfqStatusBadge from "./RfqStatusBadge";
import { History, Clock } from "lucide-react";

export interface RfqTimelineProps {
  events?: RfqHistoryEvent[];
}

export default function RfqTimeline({ events = [] }: RfqTimelineProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History size={15} className="text-primary" />
          <span>Status & Activity Audit Trail ({events.length})</span>
        </h2>
      </div>

      <div className="space-y-4">
        {events.map((ev, index) => {
          const isLatest = index === 0;
          const formattedDate = ev.createdAt
            ? new Date(ev.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";

          return (
            <div key={ev.id || index} className="flex items-start gap-3 relative">
              {/* Vertical line connecting events */}
              {index < events.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-border/60" />
              )}

              {/* Marker bullet */}
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 z-10 ${
                  isLatest
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                <Clock size={11} />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-1 text-xs min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <RfqStatusBadge status={ev.status} size="sm" />
                  <span className="font-medium text-foreground">
                    by {ev.actorName || "System"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                    {formattedDate}
                  </span>
                </div>

                {ev.note && (
                  <p className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded-xl border border-border/30">
                    {ev.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
