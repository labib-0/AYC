import React from "react";
import { OrderRecord } from "@/services/order.service";
import { MapPin, Anchor, FileText, AlertCircle } from "lucide-react";

export interface ShippingInfoCardProps {
  order: OrderRecord;
}

export default function ShippingInfoCard({ order }: ShippingInfoCardProps) {
  const notifyParty = order.third_party_notify;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <MapPin size={16} className="text-primary" />
          <span>Shipping &amp; Destination Details</span>
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded border border-border/50">
          Order Snapshot Data
        </span>
      </div>

      <div className="space-y-3 text-xs">
        {/* Recipient & Full Address */}
        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
            Consignee / Destination Address
          </span>
          <div className="mt-1 p-3 rounded-2xl bg-secondary/30 border border-border/60 text-foreground leading-relaxed">
            <span className="font-bold block">{order.shipping_name}</span>
            {order.shipping_company && (
              <span className="block text-muted-foreground font-medium">
                {order.shipping_company}
              </span>
            )}
            <span className="block mt-0.5">{order.shipping_address1}</span>
            {order.shipping_address2 && (
              <span className="block">{order.shipping_address2}</span>
            )}
            <span className="block">
              {order.shipping_city}
              {order.shipping_region ? `, ${order.shipping_region}` : ""}{" "}
              <span className="font-mono">{order.shipping_postal_code}</span>
            </span>
            <span className="block font-bold uppercase mt-0.5 text-primary">
              {order.shipping_country_code}
            </span>
          </div>
        </div>

        {/* Port & Logistics Specifications */}
        {(order.destination_port || order.transport_method || order.shipping_service_type) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {order.destination_port && (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Anchor size={12} />
                  <span>Destination Port</span>
                </span>
                <span className="font-bold text-foreground block">
                  {order.destination_port}
                </span>
              </div>
            )}

            {order.transport_method && (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Transport Method
                </span>
                <span className="font-bold text-foreground uppercase block">
                  {order.transport_method}
                </span>
              </div>
            )}

            {order.shipping_service_type && (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-0.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Service / Incoterm
                </span>
                <span className="font-bold text-foreground block">
                  {order.shipping_service_type}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Third-Party Notify Party */}
        {notifyParty && (notifyParty.name || notifyParty.address) && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
              <FileText size={12} />
              <span>Third-Party Notify Party (Export)</span>
            </span>
            <div className="mt-1 p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-0.5 text-xs">
              {notifyParty.name && <span className="font-bold block text-foreground">{notifyParty.name}</span>}
              {notifyParty.address && <span className="text-muted-foreground block">{notifyParty.address}</span>}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
              <AlertCircle size={12} />
              <span>Special Handling Instructions</span>
            </span>
            <p className="mt-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
              {order.special_instructions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
