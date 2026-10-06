import React from "react";
import { CommercialDocument } from "@/types/b2b";
import DocumentHeader from "./DocumentHeader";
import DocumentSignatory from "./DocumentSignatory";

export interface QuotationDocumentProps {
  doc: CommercialDocument;
}

export default function QuotationDocument({ doc }: QuotationDocumentProps) {
  const isChalan = doc.docType === "CHALAN";

  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Header */}
      <DocumentHeader
        badgeText={isChalan ? "Delivery Chalan" : "Commercial Quotation"}
        title={doc.title || (isChalan ? "DELIVERY CHALAN / GATE PASS" : "COMMERCIAL QUOTATION")}
        docNumber={doc.docNumber}
        date={doc.date}
        orderNumber={doc.orderNumber}
        validUntil={doc.validUntil || "30 Days from date of issuance"}
        exporterProfile={doc.exporter}
      />

      {/* Buyer & Terms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            {isChalan ? "Consignee / Recipient" : "Prospective Buyer / Consignee"}
          </span>
          <span className="font-bold text-sm text-foreground block">
            {doc.companyName}
          </span>
          <p className="text-muted-foreground leading-relaxed">
            Attn: {doc.buyerName}<br />
            Address: {doc.buyerAddress}<br />
            Country: {doc.buyerCountry}<br />
            Email: {doc.buyerEmail} • Phone: {doc.buyerPhone || "N/A"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Quotation &amp; Export Parameters
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
            <div><strong className="text-foreground">Terms:</strong> {doc.incoterm || "FOB Dhaka"}</div>
            <div><strong className="text-foreground">Payment:</strong> {doc.paymentTerms || "T/T Advance"}</div>
            <div><strong className="text-foreground">Validity:</strong> {doc.validUntil || "30 Days"}</div>
            <div><strong className="text-foreground">Port of Loading:</strong> {doc.port_of_loading || doc.document_defaults?.default_port_of_loading || "Hazrat Shahjalal DAC"}</div>
            {doc.rfqNumber && (
              <div className="col-span-2 text-primary font-mono font-bold">
                RFQ Reference: #{doc.rfqNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b-2 border-foreground bg-secondary/50 uppercase text-xs font-bold tracking-wider text-foreground">
              <th className="py-3 px-3">Item &amp; Specifications</th>
              <th className="py-3 px-3">SKU</th>
              <th className="py-3 px-3 text-right">Quantity</th>
              <th className="py-3 px-3 text-right">Unit Price ({doc.currency})</th>
              <th className="py-3 px-3 text-right">Total ({doc.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.items.map((item, idx) => (
              <tr key={idx} className="font-medium text-foreground">
                <td className="py-3.5 px-3">
                  <div className="flex items-start gap-3">
                    {item.product_image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.product_image_url}
                        alt={item.description}
                        className="w-12 aspect-[3/4] object-contain rounded-lg border border-border/80 bg-secondary shrink-0"
                      />
                    )}
                    <div className="space-y-1 min-w-0">
                      <span className="font-bold block text-foreground">{item.description}</span>
                      {item.details && (
                        <span className="text-xs text-muted-foreground block">{item.details}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 font-mono text-muted-foreground">{item.sku}</td>
                <td className="py-3.5 px-3 text-right font-bold">{item.quantity.toLocaleString()} pcs</td>
                <td className="py-3.5 px-3 text-right font-bold">${Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-bold">${Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4 border-t border-border">
        <div className="flex-1 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Commercial Terms &amp; Notes
          </span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            1. Official export quotation issued by Ayaan Clothing Export Division.<br />
            2. Production lead time: 30–45 days upon receipt of advance payment and approved samples.<br />
            3. Price valid for 30 calendar days from date of issue.
          </p>
        </div>

        <div className="w-full sm:w-80 space-y-2 shrink-0 bg-secondary/20 p-4 rounded-2xl border border-border/60 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-bold text-foreground">${Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-foreground pt-2.5 border-t-2 border-foreground">
            <span>TOTAL ESTIMATE (USD):</span>
            <span>${Number(doc.total_payable ?? doc.grandTotal ?? 0).toFixed(2)} {doc.currency || "USD"}</span>
          </div>
        </div>
      </div>

      {/* Signatory */}
      <div className="pt-6 border-t border-border">
        <DocumentSignatory
          title={doc.document_defaults?.signatory_title || doc.exporter?.signatory_title || "Authorized Merchandiser / Commercial Head"}
          division={doc.document_defaults?.signatory_division || doc.exporter?.signatory_division || "Ayaan Clothing Export Merchandising Division"}
        />
      </div>
    </div>
  );
}
