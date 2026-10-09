import React from "react";
import { OrderRecord } from "@/services/order.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import {
  Truck,
  Ship,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Send,
  Edit3,
  AlertCircle,
  Clock,
} from "lucide-react";

export interface CarrierFulfillmentCardProps {
  order: OrderRecord;
  onOpenSeaQuoteModal: () => void;
  onOpenFulfillmentModal: () => void;
  onOpenAramexShipmentDialog: () => void;
  onRefreshTracking: () => void;
  actionLoading?: boolean;
}

export default function CarrierFulfillmentCard({
  order,
  onOpenSeaQuoteModal,
  onOpenFulfillmentModal,
  onOpenAramexShipmentDialog,
  onRefreshTracking,
  actionLoading = false,
}: CarrierFulfillmentCardProps) {
  const { can, isSuperAdmin } = useAdminAuth();
  const canCreateShipment = isSuperAdmin || can("shipment.create");
  const canRefreshTracking = isSuperAdmin || can("tracking.refresh");
  const canUpdateSeaQuote = isSuperAdmin || can("order.shipping.update");
  const canUpdateFulfillment = isSuperAdmin || can("order.update_fulfillment");
  const canViewLabel = isSuperAdmin || can("shipment.label.view");

  const snapshot = order.shipping_snapshot;
  const isSea =
    snapshot?.mode === "sea" ||
    order.transport_method?.toLowerCase() === "sea" ||
    order.shipping_method?.toLowerCase().includes("sea") ||
    order.carrier?.toLowerCase().includes("sea");

  const hasAwb = Boolean(order.tracking_number);
  const isPaid = order.payment_status === "paid" || order.payment_method === "net_30";
  const isFulfilled = ["shipped", "delivered"].includes(order.fulfillment_status);
  const isTerminal = ["cancelled", "refunded"].includes(order.status);

  const canShip =
    !isTerminal &&
    (order.can_create_aramex_shipment ||
      (!hasAwb && (isPaid || order.status === "processing" || order.status === "confirmed")));

  const carrierDisplayName =
    order.carrier ||
    snapshot?.carrier ||
    (isSea ? "Ocean Vessel Carrier (LCL/FCL)" : "Express Air Courier");

  const totalPieces =
    snapshot?.package_quantity ||
    order.items?.reduce((s, i) => s + (i.quantity || 0), 0) ||
    0;

  // Unfulfilled & Unpaid: Reduced Visual Weight State
  if (!isPaid && !isFulfilled && !hasAwb && !isTerminal) {
    return (
      <div
        className="bg-card border border-border/70 rounded-3xl p-5 shadow-xs space-y-3"
        id="admin-carrier-fulfillment-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-secondary text-muted-foreground">
              {isSea ? <Ship size={18} /> : <Truck size={18} />}
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Fulfillment &amp; Dispatch
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">
                Planned: {carrierDisplayName}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-secondary px-2.5 py-1 rounded-full text-muted-foreground border border-border/50">
            Awaiting Payment
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/20 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-500 shrink-0" />
            <span className="text-[11px]">
              Carrier dispatch, package weight calculations, and AWB generation will unlock once payment is approved.
            </span>
          </div>

          {canUpdateFulfillment && (
            <button
              type="button"
              onClick={onOpenFulfillmentModal}
              className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors shrink-0 cursor-pointer"
            >
              Manual Override
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4"
      id="admin-carrier-fulfillment-card"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            {isSea ? <Ship size={20} /> : <Truck size={20} />}
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {isSea ? "Ocean & Maritime Logistics" : "Fulfillment & Dispatch Logistics"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isSea
                ? "Sea container booking, LCL/FCL freight quotation, and port handling."
                : "Air freight dispatch, AWB generation, and real-time tracking integration."}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSea ? (
            canUpdateSeaQuote && (
              <button
                type="button"
                onClick={onOpenSeaQuoteModal}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                id="btn-update-sea-quote"
              >
                <DollarSign size={14} />
                <span>Update Freight Quote</span>
              </button>
            )
          ) : hasAwb ? (
            canRefreshTracking && (
              <button
                type="button"
                onClick={onRefreshTracking}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-foreground text-xs font-bold uppercase tracking-wider hover:bg-secondary/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                id="btn-refresh-carrier-tracking"
              >
                <RefreshCw size={13} className={actionLoading ? "animate-spin" : ""} />
                <span>Refresh Tracking</span>
              </button>
            )
          ) : (
            canCreateShipment && (
              <button
                type="button"
                onClick={onOpenAramexShipmentDialog}
                disabled={actionLoading || !canShip}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs ${
                  canShip
                    ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                }`}
                id="btn-open-aramex-dialog"
              >
                <Send size={14} />
                <span>Create Aramex Shipment</span>
              </button>
            )
          )}

          {canUpdateFulfillment && (
            <button
              type="button"
              onClick={onOpenFulfillmentModal}
              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              id="btn-edit-fulfillment"
              title="Edit fulfillment status and carrier manually"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Shipment Error Banner if Present */}
      {order.last_shipment_error && (
        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold uppercase">Shipment Notice:</p>
            <p>{order.last_shipment_error}</p>
          </div>
        </div>
      )}

      {/* Logistics Specification Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Shipping Carrier / Forwarder
          </span>
          <span className="font-bold text-foreground text-xs sm:text-sm block truncate">
            {carrierDisplayName}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            {isSea ? "Quote / Booking Reference" : "AWB / Tracking Number"}
          </span>
          <span className="font-mono font-bold text-primary text-xs sm:text-sm block truncate">
            {isSea
              ? order.shipping_quote_id || snapshot?.quote_reference_id || "Pending Tariff Quote"
              : order.tracking_number || "Not Issued"}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            {isSea ? "Quoted Freight" : "Carrier Live Status"}
          </span>
          <span className="font-bold text-foreground text-xs sm:text-sm block truncate">
            {isSea
              ? Number(order.shipping_cost) > 0
                ? `$${Number(order.shipping_cost).toFixed(2)} USD`
                : "Awaiting Quote"
              : order.carrier_status || (hasAwb ? "In Transit" : "Pending Dispatch")}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Packaging / Cartons
          </span>
          <span className="font-bold text-foreground text-xs block">
            {snapshot?.carton_count || 1} ctn ({totalPieces} pcs)
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Gross / Net Weight
          </span>
          <span className="font-bold text-foreground text-xs block">
            {snapshot?.gross_weight ? `${snapshot.gross_weight} kg` : "N/A"}{" "}
            {snapshot?.net_weight ? `(Net: ${snapshot.net_weight} kg)` : ""}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
            Shipment Volume (CBM)
          </span>
          <span className="font-bold text-foreground text-xs block">
            {snapshot?.cbm ? `${snapshot.cbm} CBM` : "0.072 CBM"}
          </span>
        </div>
      </div>

      {/* External Action Links */}
      {hasAwb && !isSea && (
        <div className="pt-2 flex items-center gap-4 flex-wrap text-xs">
          {order.direct_tracking_url && (
            <a
              href={order.direct_tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
            >
              <span>View on Carrier Tracking Portal</span>
              <ExternalLink size={13} />
            </a>
          )}

          {canViewLabel && order.shipment_label_url && (
            <a
              href={order.shipment_label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
            >
              <span>Download Official Shipping Label (PDF)</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
