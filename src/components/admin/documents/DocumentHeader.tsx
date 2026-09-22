import React from "react";
import BrandName from "@/components/common/BrandName";
import BUSINESS_PROFILE from "@/config/business-profile";

export interface DocumentHeaderProps {
  badgeText: string;
  title: string;
  docNumber: string;
  date: string;
  orderNumber?: string;
  validUntil?: string;
  relatedInvoiceNumber?: string;
}

export default function DocumentHeader({
  badgeText,
  title,
  docNumber,
  date,
  orderNumber,
  validUntil,
  relatedInvoiceNumber,
}: DocumentHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-foreground/90">
      <div>
        <div className="flex items-center gap-2">
          <BrandName className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded">
            {badgeText}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
          <strong className="text-foreground font-semibold">{BUSINESS_PROFILE.name}</strong><br />
          {BUSINESS_PROFILE.description}<br />
          {BUSINESS_PROFILE.address.formatted}<br />
          Est. {BUSINESS_PROFILE.establishedYear} • Country of Origin: Bangladesh
        </p>
      </div>

      <div className="text-left sm:text-right">
        <span className="text-xl sm:text-2xl font-display font-black uppercase tracking-wider text-primary block">
          {title}
        </span>
        <span className="font-mono text-base font-bold text-foreground block mt-1">
          {docNumber}
        </span>
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <div>Date of Issue: <strong className="text-foreground">{date}</strong></div>
          {relatedInvoiceNumber && (
            <div>Related Invoice: <strong className="text-foreground font-mono">{relatedInvoiceNumber}</strong></div>
          )}
          {orderNumber && (
            <div>Order Ref: <strong className="text-foreground font-mono">#{orderNumber}</strong></div>
          )}
          {validUntil && (
            <div className="text-rose-600 dark:text-rose-400 font-semibold">Valid Until: {validUntil}</div>
          )}
        </div>
      </div>
    </div>
  );
}
