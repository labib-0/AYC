import React from "react";
import Link from "next/link";
import { RfqRecord } from "@/types/b2b";
import RfqStatusBadge from "./RfqStatusBadge";
import { Eye } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface RfqTableRowProps {
  rfq: RfqRecord;
  detailBaseUrl?: string;
}

export default function RfqTableRow({
  rfq,
  detailBaseUrl = "/ayc/rfq",
}: RfqTableRowProps) {
  const { can } = useAdminAuth();
  const customerName = rfq.buyerName || "Guest Buyer";
  const companyName = rfq.companyName || null;
  const totalUnits = (rfq.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const createdDate = rfq.createdAt;
  const formattedDate = createdDate
    ? new Date(createdDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const detailHref = `${detailBaseUrl}/${rfq.id}`;

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors text-xs">
      {/* 1. RFQ # */}
      <td className="py-3 px-4">
        {can("rfq.view") ? (
          <Link
            href={detailHref}
            className="font-mono font-bold text-foreground hover:text-primary transition-colors block"
          >
            {rfq.rfqNumber}
          </Link>
        ) : (
          <span className="font-mono font-bold text-foreground block">
            {rfq.rfqNumber}
          </span>
        )}
      </td>

      {/* 2. Customer */}
      <td className="py-3 px-4">
        <span className="font-bold text-foreground block truncate max-w-[150px]">
          {customerName}
        </span>
        <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
          {rfq.buyerEmail}
        </span>
      </td>

      {/* 3. Company */}
      <td className="py-3 px-4">
        {companyName ? (
          <span className="text-foreground font-medium block truncate max-w-[140px]">
            {companyName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* 4. Date */}
      <td className="py-3 px-4">
        <span className="text-muted-foreground block font-mono">
          {formattedDate}
        </span>
      </td>

      {/* 5. Total Units */}
      <td className="py-3 px-4">
        <span className="font-mono font-bold text-foreground block">
          {totalUnits.toLocaleString()} pcs
        </span>
        <span className="text-[10px] text-muted-foreground block font-mono">
          {rfq.items?.length || 0} {rfq.items?.length === 1 ? "line" : "lines"}
        </span>
      </td>

      {/* 6. Status */}
      <td className="py-3 px-4">
        <RfqStatusBadge status={rfq.status} size="sm" />
      </td>

      {/* 7. Action */}
      <td className="py-3 px-4 text-right">
        {can("rfq.view") && (
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
            title="View RFQ details"
          >
            <Eye size={12} />
            <span>View</span>
          </Link>
        )}
      </td>
    </tr>
  );
}
