import React from "react";
import Link from "next/link";
import { RfqRecord } from "@/types/b2b";
import { Building2, Mail, Phone, Globe, Shield, ExternalLink } from "lucide-react";

export interface RfqBuyerCardProps {
  rfq: RfqRecord;
  customerBaseUrl?: string;
}

export default function RfqBuyerCard({
  rfq,
  customerBaseUrl = "/customers",
}: RfqBuyerCardProps) {
  const customerHref = rfq.userId ? `${customerBaseUrl}/${rfq.userId}` : null;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Building2 size={15} className="text-primary" />
          <span>Buyer & Company Profile</span>
        </h2>

        {customerHref && (
          <Link
            href={customerHref}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            <span>View Account</span>
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {/* Name and Company */}
        <div>
          <span className="text-base font-bold text-foreground block">
            {rfq.buyerName}
          </span>
          <span className="text-xs text-muted-foreground font-medium block">
            {rfq.companyName || "No Company Specified"}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          {/* Email */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
              <Mail size={11} />
              <span>Email</span>
            </span>
            <a
              href={`mailto:${rfq.buyerEmail}`}
              className="text-foreground font-mono hover:text-primary transition-colors block truncate"
            >
              {rfq.buyerEmail || "—"}
            </a>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
              <Phone size={11} />
              <span>Phone</span>
            </span>
            <span className="text-foreground font-mono block">
              {rfq.buyerPhone || "—"}
            </span>
          </div>

          {/* Business Type */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
              <Building2 size={11} />
              <span>Business Type</span>
            </span>
            <span className="text-foreground font-medium block">
              {rfq.businessType || "Wholesale Buyer"}
            </span>
          </div>

          {/* Tax ID */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
              <Shield size={11} />
              <span>Tax / VAT ID</span>
            </span>
            <span className="text-foreground font-mono block">
              {rfq.taxNumber || "—"}
            </span>
          </div>

          {/* Website */}
          {rfq.website && (
            <div className="space-y-1 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                <Globe size={11} />
                <span>Website</span>
              </span>
              <a
                href={rfq.website.startsWith("http") ? rfq.website : `https://${rfq.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-mono text-xs block truncate"
              >
                {rfq.website}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
