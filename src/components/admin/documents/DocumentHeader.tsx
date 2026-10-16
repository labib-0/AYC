import React from "react";
import BrandName from "@/components/common/BrandName";
import BUSINESS_PROFILE from "@/config/business-profile";

export interface DocumentHeaderMetadataField {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

export interface DocumentHeaderProps {
  badgeText: string;
  title: string;
  docNumber: string;
  date: string;
  orderNumber?: string;
  validUntil?: string;
  relatedInvoiceNumber?: string;
  shippingArrangement?: string;
  paymentTerms?: string;
  metadataFields?: DocumentHeaderMetadataField[];
  showInformationBar?: boolean;
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
  shippingArrangement,
  paymentTerms,
  metadataFields,
  showInformationBar = true,
  exporterProfile,
}: DocumentHeaderProps) {
  const companyName = exporterProfile?.company_name || exporterProfile?.name || BUSINESS_PROFILE.name;
  const description = exporterProfile?.tagline || exporterProfile?.business_type || BUSINESS_PROFILE.description;
  const address = exporterProfile?.address || exporterProfile?.office_address || BUSINESS_PROFILE.address.formatted;
  const phone = exporterProfile?.whatsapp_display || exporterProfile?.whatsapp || exporterProfile?.phone || BUSINESS_PROFILE.contact.phone;
  const estYear = exporterProfile?.est_year || BUSINESS_PROFILE.establishedYear;

  // Resolve metadata fields with non-overlapping CSS grid layout
  const effectiveFields: DocumentHeaderMetadataField[] = React.useMemo(() => {
    if (metadataFields && metadataFields.length > 0) {
      return metadataFields;
    }

    if (!showInformationBar) return [];

    const isOffer = badgeText.toLowerCase().includes("offer") || title.toLowerCase().includes("offer");
    const isPI = badgeText.toLowerCase().includes("proforma") || title.toLowerCase().includes("proforma");

    if (isPI) {
      return [
        { label: "P.I. Number", value: docNumber },
        { label: "Order Reference", value: orderNumber ? `#${orderNumber}` : "N/A" },
        { label: "Issue Date", value: date },
        { label: "Validity", value: validUntil || "30 Days from date of issuance", highlight: true },
        { label: "Shipping Arrangement", value: shippingArrangement || "To Be Confirmed Separately" },
        { label: "Payment Terms", value: paymentTerms || "100% Advance T/T Wire" },
      ];
    }

    if (isOffer) {
      return [
        { label: "Offer Reference", value: docNumber },
        { label: "Order Reference", value: orderNumber ? `#${orderNumber}` : "Commercial Inquiry" },
        { label: "Issue Date", value: date },
        { label: "Validity", value: validUntil || "30 Days", highlight: true },
        { label: "Shipping Arrangement", value: shippingArrangement || "To Be Confirmed Separately (FOB Dhaka)" },
        { label: "Payment Terms", value: paymentTerms || "100% Advance T/T or L/C at Sight" },
      ];
    }

    // Default metadata fields for other commercial documents
    const fields: DocumentHeaderMetadataField[] = [
      { label: "Document No", value: docNumber },
      ...(orderNumber ? [{ label: "Order Reference", value: `#${orderNumber}` }] : []),
      { label: "Issue Date", value: date },
    ];
    if (validUntil) {
      fields.push({ label: "Validity", value: validUntil, highlight: true });
    }
    if (shippingArrangement) {
      fields.push({ label: "Shipping Arrangement", value: shippingArrangement });
    }
    if (paymentTerms) {
      fields.push({ label: "Payment Terms", value: paymentTerms });
    }
    if (relatedInvoiceNumber) {
      fields.push({ label: "Related Invoice", value: relatedInvoiceNumber });
    }
    return fields;
  }, [
    metadataFields,
    showInformationBar,
    badgeText,
    title,
    docNumber,
    orderNumber,
    date,
    validUntil,
    shippingArrangement,
    paymentTerms,
    relatedInvoiceNumber,
  ]);

  return (
    <div className="space-y-4">
      {/* Top row: Exporter & Document Title */}
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
          {!showInformationBar && (
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
          )}
        </div>
      </div>

      {/* Document Information Header Bar (Reference Bar) - Non-overlapping CSS Grid */}
      {effectiveFields.length > 0 && (
        <div className="rounded-2xl bg-secondary/40 border border-border/80 p-3.5 sm:p-4 print:p-3 print:bg-slate-50 print:border-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 print:grid-cols-3 print:gap-3">
            {effectiveFields.map((field, idx) => (
              <div key={idx} className="min-w-0 space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block print:text-slate-500">
                  {field.label}
                </span>
                <div
                  className={`text-xs sm:text-sm font-semibold break-words leading-snug print:text-xs print:leading-tight ${
                    field.highlight
                      ? "text-orange-600 dark:text-orange-400 print:text-orange-700 font-bold"
                      : "text-foreground print:text-slate-900"
                  }`}
                >
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
