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
  exporterProfile?: {
    name?: string;
    company_name?: string;
    tagline?: string;
    business_type?: string;
    address?: string;
    office_address?: string;
    est_year?: number | string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    whatsapp_display?: string;
    reg_number?: string;
    tin_number?: string;
    bin_number?: string;
    [key: string]: any;
  };
}

export default function DocumentHeader({
  badgeText,
  title,
  docNumber,
  date,
  orderNumber,
  validUntil,
  relatedInvoiceNumber,
  exporterProfile,
}: DocumentHeaderProps) {
  const companyName = exporterProfile?.company_name || exporterProfile?.name || BUSINESS_PROFILE.name;
  const description = exporterProfile?.tagline || exporterProfile?.business_type || BUSINESS_PROFILE.description;
  const address = exporterProfile?.address || exporterProfile?.office_address || BUSINESS_PROFILE.address.formatted;
  const phone = exporterProfile?.whatsapp_display || exporterProfile?.whatsapp || exporterProfile?.phone || BUSINESS_PROFILE.contact.phone;
  const estYear = exporterProfile?.est_year || BUSINESS_PROFILE.establishedYear;

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
          <strong className="text-foreground font-semibold">{companyName}</strong><br />
          {description}<br />
          {address}<br />
          {phone && <span>Contact / WA: {phone} • </span>}
          Est. {estYear} • Country of Origin: Bangladesh
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
