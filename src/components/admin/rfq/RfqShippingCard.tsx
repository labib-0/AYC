import React from "react";
import { RfqRecord } from "@/types/b2b";
import { Globe2, Anchor, Calendar, FileText } from "lucide-react";

export interface RfqShippingCardProps {
  rfq: RfqRecord;
}

export default function RfqShippingCard({ rfq }: RfqShippingCardProps) {
  const formattedDeliveryDate = rfq.targetDeliveryDate
    ? new Date(rfq.targetDeliveryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Flexible / To be agreed";

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Globe2 size={15} className="text-primary" />
          <span>Shipping & Destination Requirements</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        {/* Destination Country & City */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
            <Globe2 size={11} />
            <span>Destination</span>
          </span>
          <span className="text-foreground font-semibold block">
            {rfq.destinationCity ? `${rfq.destinationCity}, ` : ""}
            {rfq.destinationCountry}
          </span>
        </div>

        {/* Shipping Port */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
            <Anchor size={11} />
            <span>Designated Port / Airport</span>
          </span>
          <span className="text-foreground font-medium block">
            {rfq.shippingPort || "To be arranged"}
          </span>
        </div>

        {/* Target Delivery Date */}
        <div className="space-y-1 sm:col-span-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
            <Calendar size={11} />
            <span>Target Delivery Date</span>
          </span>
          <span className="text-foreground font-mono block">
            {formattedDeliveryDate}
          </span>
        </div>

        {/* General Buyer Notes */}
        {rfq.generalNotes && (
          <div className="space-y-1 sm:col-span-2 pt-2 border-t border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
              <FileText size={11} />
              <span>Buyer Instructions & Packaging Notes</span>
            </span>
            <p className="text-xs text-foreground bg-secondary/30 p-3 rounded-xl border border-border/50 leading-relaxed">
              {rfq.generalNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
