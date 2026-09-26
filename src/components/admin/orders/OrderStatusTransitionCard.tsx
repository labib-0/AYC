import React, { useState, useEffect } from "react";
import { OrderRecord } from "@/services/order.service";
import { adminOrderService } from "@/services/admin";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import OrderStatusBadge from "./OrderStatusBadge";
import { ArrowRight, Lock } from "lucide-react";

export interface OrderStatusTransitionCardProps {
  order: OrderRecord;
  onUpdateStatus: (newStatus: string, note?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function OrderStatusTransitionCard({
  order,
  onUpdateStatus,
  isLoading = false,
}: OrderStatusTransitionCardProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const rawAllowedNext = adminOrderService.getAllowedNextStatuses(order.status);

  // Filter allowed transitions by granular permissions
  const allowedNext = rawAllowedNext.filter((status) => {
    if (isSuperAdmin) return true;
    if (status === "confirmed") return can("order.confirm");
    if (status === "cancelled") return can("order.cancel");
    if (status === "processing") return can("order.mark_processing") || can("order.update_status");
    if (status === "shipped") return can("order.mark_shipped") || can("order.update_status");
    if (status === "delivered") return can("order.mark_delivered") || can("order.update_status");
    return can("order.update_status");
  });

  const [selectedStatus, setSelectedStatus] = useState(
    allowedNext.length > 0 ? allowedNext[0] : order.status
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    const nexts = allowedNext;
    setSelectedStatus(nexts.length > 0 ? nexts[0] : order.status);
    setNote("");
  }, [order.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || selectedStatus === order.status) return;
    await onUpdateStatus(selectedStatus, note.trim() || undefined);
  };

  const canUpdateStatus = isSuperAdmin || can("order.update_status");
  const isTerminal = rawAllowedNext.length === 0;

  if (!canUpdateStatus) {
    return (
      <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Order Status
          </h2>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2.5">
          <Lock size={15} className="text-amber-500 shrink-0" />
          <span>Status modification is restricted. Requires <code className="font-mono text-foreground font-semibold">order.update_status</code> authority.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Update Order Status
        </h2>
        <OrderStatusBadge status={order.status} size="sm" />
      </div>

      {isTerminal ? (
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground space-y-1">
          <p className="font-bold uppercase text-foreground">Terminal Status Reached</p>
          <p>
            Order #{order.order_number} is marked as{" "}
            <strong className="text-foreground uppercase">{order.status}</strong>. No further
            lifecycle transitions are permitted under workflow rules.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Available Next Transition
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                id="select-next-order-status"
              >
                {allowedNext.map((st) => (
                  <option key={st} value={st}>
                    Move to {st.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
              Audit Transition Note
            </label>
            <textarea
              rows={2}
              placeholder="Optional administrative reason for status change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || selectedStatus === order.status}
            className="w-full py-2.5 rounded-full bg-foreground text-background font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            id="btn-save-order-status"
          >
            {isLoading ? (
              <span>Updating Status...</span>
            ) : (
              <>
                <span>Advance to {selectedStatus.toUpperCase()}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
