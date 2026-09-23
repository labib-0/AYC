import React from "react";
import Link from "next/link";
import { RfqRecord } from "@/types/b2b";
import RfqStatusBadge from "./RfqStatusBadge";
import { Eye, Globe2 } from "lucide-react";
import { formatRfqDate, formatRfqTime } from "@/lib/rfq-datetime";

export interface RfqTableRowProps {
  rfq: RfqRecord;
  detailBaseUrl?: string;
}

export default function RfqTableRow({
  rfq,
  detailBaseUrl = "/rfq",
}: RfqTableRowProps) {
  const detailHref = `${detailBaseUrl}/${rfq.id}`;
  const totalUnits = (rfq.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
  const itemsCount = (rfq.items || []).length;

  const initials = rfq.buyerName
    ? rfq.buyerName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "BY";

  const formattedDate = formatRfqDate(rfq.createdAt);
  const formattedTime = formatRfqTime(rfq.createdAt);

  return (
    <tr className="border-b border-border/60 hover:bg-secondary/20 transition-colors group">
      {/* RFQ Number */}
      <td className="py-3 px-4">
        <Link
          href={detailHref}
          className="font-mono font-bold text-foreground text-xs hover:text-primary transition-colors block"
        >
          {rfq.rfqNumber}
        </Link>
        {rfq.requestTitle && (
          <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
            {rfq.requestTitle}
          </span>
        )}
      </td>

      {/* Buyer */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <span className="text-foreground font-semibold text-xs block truncate max-w-[140px]">
              {rfq.buyerName}
            </span>
            <span className="text-[10px] text-muted-foreground block truncate font-mono max-w-[140px]">
              {rfq.buyerEmail}
            </span>
          </div>
        </div>
      </td>

      {/* Company */}
      <td className="py-3 px-3">
        <span className="text-foreground font-medium text-xs truncate block max-w-[150px]">
          {rfq.companyName || "—"}
        </span>
        {rfq.businessType && (
          <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
            {rfq.businessType}
          </span>
        )}
      </td>

      {/* Country */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
          <Globe2 size={13} className="text-muted-foreground shrink-0" />
          <span className="truncate max-w-[120px]">{rfq.destinationCountry}</span>
        </div>
        {rfq.destinationCity && (
          <span className="text-[10px] text-muted-foreground block pl-5 truncate max-w-[120px]">
            {rfq.destinationCity}
          </span>
        )}
      </td>

      {/* Items Count */}
      <td className="py-3 px-3 text-center">
        <span className="font-mono text-xs text-muted-foreground font-medium">
          {itemsCount} {itemsCount === 1 ? "item" : "items"}
        </span>
      </td>

      {/* Total Units */}
      <td className="py-3 px-3 text-right">
        <span className="font-mono font-bold text-xs text-foreground">
          {totalUnits.toLocaleString()} pcs
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-3 text-center">
        <RfqStatusBadge status={rfq.status} size="sm" />
      </td>

      {/* Submitted Date & Time */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="flex flex-col items-end">
          <span className="font-medium text-foreground text-xs">{formattedDate}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{formattedTime}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all shadow-2xs group-hover:border-primary/50"
        >
          <Eye size={12} className="text-primary" />
          <span>View</span>
        </Link>
      </td>
    </tr>
  );
}
