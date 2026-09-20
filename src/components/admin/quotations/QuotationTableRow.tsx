import React from "react";
import Link from "next/link";
import { QuotationRecord } from "@/types/b2b";
import QuotationStatusBadge from "./QuotationStatusBadge";
import { Printer, Globe2, ExternalLink } from "lucide-react";

export interface QuotationTableRowProps {
  quotation: QuotationRecord;
  rfqBaseUrl?: string;
  documentBaseUrl?: string;
}

export default function QuotationTableRow({
  quotation,
  rfqBaseUrl = "/rfq",
  documentBaseUrl = "/documents",
}: QuotationTableRowProps) {
  const documentHref = `${documentBaseUrl}/QUOTATION/${quotation.id}`;
  const rfqHref = `${rfqBaseUrl}/${quotation.rfqId}`;

  const formattedDate = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <tr className="border-b border-border/60 hover:bg-secondary/20 transition-colors group">
      {/* Quotation Number */}
      <td className="py-3 px-4">
        <Link
          href={documentHref}
          target="_blank"
          className="font-mono font-bold text-foreground text-xs hover:text-primary transition-colors block"
        >
          {quotation.quotationNumber}
        </Link>
        <span className="text-[10px] text-muted-foreground block font-mono">
          Rev. {quotation.revisionNumber || 1} • {quotation.incoterm || "FOB"}
        </span>
      </td>

      {/* RFQ Reference */}
      <td className="py-3 px-3">
        <Link
          href={rfqHref}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline font-semibold"
        >
          <span>{quotation.rfqNumber}</span>
          <ExternalLink size={10} />
        </Link>
      </td>

      {/* Buyer & Company */}
      <td className="py-3 px-3">
        <span className="text-foreground font-semibold text-xs block truncate max-w-[150px]">
          {quotation.buyerName}
        </span>
        <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
          {quotation.companyName || "—"}
        </span>
      </td>

      {/* Destination */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
          <Globe2 size={13} className="text-muted-foreground shrink-0" />
          <span className="truncate max-w-[120px]">{quotation.destinationCountry}</span>
        </div>
        {quotation.destinationCity && (
          <span className="text-[10px] text-muted-foreground block pl-5 truncate max-w-[120px]">
            {quotation.destinationCity}
          </span>
        )}
      </td>

      {/* Grand Total */}
      <td className="py-3 px-3 text-right">
        <span className="font-mono font-bold text-xs text-foreground">
          ${Number(quotation.grandTotal || 0).toFixed(2)}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono block">
          USD
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-3 text-center">
        <QuotationStatusBadge status={quotation.status} size="sm" />
      </td>

      {/* Valid Until */}
      <td className="py-3 px-3 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
        {formattedDate}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <Link
          href={documentHref}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all shadow-2xs group-hover:border-primary/50"
        >
          <Printer size={12} className="text-primary" />
          <span>View</span>
        </Link>
      </td>
    </tr>
  );
}
