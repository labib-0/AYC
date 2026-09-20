import React from "react";
import { OrderStatusEvent } from "@/services/order.service";
import { Clock, CheckCircle2 } from "lucide-react";

export interface OrderStatusHistoryProps {
  events?: OrderStatusEvent[];
}

export default function OrderStatusHistory({ events = [] }: OrderStatusHistoryProps) {
  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span>Order Timeline &amp; System Events</span>
        </h2>
        <span className="text-xs font-mono text-muted-foreground">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>

      <div className="space-y-3">
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
          <p className="text-xs text-muted-foreground py-2">
            No system events recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
