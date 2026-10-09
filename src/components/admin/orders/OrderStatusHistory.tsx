import React, { useState } from "react";
import { OrderStatusEvent } from "@/services/order.service";
import { Clock, CheckCircle2, ChevronDown } from "lucide-react";

export interface OrderStatusHistoryProps {
  events?: OrderStatusEvent[];
  defaultOpen?: boolean;
}

export default function OrderStatusHistory({
  events = [],
  defaultOpen = false,
}: OrderStatusHistoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4"
      id="admin-order-activity-history"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between pb-1 text-left cursor-pointer group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Activity &amp; Audit History
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border/50">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="p-1.5 rounded-lg border border-border/60 group-hover:bg-secondary transition-colors text-muted-foreground group-hover:text-foreground">
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="pt-2 border-t border-border/60 space-y-3 animate-in fade-in duration-150">
          {events && events.length > 0 ? (
            events.map((ev, idx) => {
              const dateStr = new Date(ev.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              });

              return (
                <div
                  key={ev.id || `event-${idx}`}
                  className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 flex items-start gap-3 text-xs"
                >
                  <div className="p-1.5 rounded-full bg-primary/10 text-primary mt-0.5 shrink-0">
                    <CheckCircle2 size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground block font-mono">
                      {ev.event_type}
                    </span>
                    {ev.message && (
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        {ev.message}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground block mt-1 font-mono">
                      {dateStr}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No audit timeline events recorded for this order.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
