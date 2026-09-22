import React from "react";
import { CommercialDocument } from "@/types/b2b";
import DocumentHeader from "./DocumentHeader";
import DocumentSignatory from "./DocumentSignatory";
import CommercialProductGallery from "./CommercialProductGallery";

export interface OfferSheetDocumentProps {
  doc: CommercialDocument;
}

export default function OfferSheetDocument({ doc }: OfferSheetDocumentProps) {
  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Header */}
      <DocumentHeader
        badgeText="Commercial Order Sheet"
        title={doc.title || "COMMERCIAL OFFER SHEET"}
        docNumber={doc.docNumber}
        date={doc.date}
        orderNumber={doc.orderNumber}
        validUntil={doc.validUntil || "30 Days from date of issuance"}
      />

      {/* Offer Sheet / Order Sheet Product Visual Gallery */}
      <CommercialProductGallery
        images={doc.product_gallery || doc.items?.[0]?.product_images}
        primaryImageUrl={doc.items?.[0]?.product_image_url}
        productName={doc.items?.[0]?.description}
        items={doc.items}
      />

      {/* Offered To & Offer Terms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Offered To / Consignee
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

        {/* Strictly ZERO shipping information on Offer Sheet */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Offer Terms &amp; Production Standards
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
            <div><strong className="text-foreground">Quality Standard:</strong> AQL 2.5 Major</div>
            <div><strong className="text-foreground">Terms:</strong> FOB Dhaka (Export)</div>
            <div><strong className="text-foreground">Validity:</strong> 30 Days</div>
            <div><strong className="text-foreground">Inspection:</strong> Pre-dispatch Welcome</div>
            <div className="col-span-2 text-amber-700 dark:text-amber-400 font-medium pt-1">
              Commercial Offer only — Not an invoice. Shipping arranged separately.
            </div>
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
            {doc.items.map((item, idx) => {
              const breakdown = typeof item.package_breakdown === "string" 
                ? JSON.parse(item.package_breakdown) 
                : item.package_breakdown;

              return (
                <tr key={idx} className="font-medium text-foreground">
                  <td className="py-3.5 px-3">
                    <div className="flex items-start gap-3">
                      {item.product_image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.product_image_url}
                          alt={item.description}
                          className="w-12 h-14 object-contain rounded-lg border border-border/80 bg-secondary shrink-0"
                        />
                      )}
                      <div className="space-y-1 min-w-0">
                        <span className="font-bold block text-foreground">{item.description}</span>
                        {item.details && (
                          <span className="text-xs text-muted-foreground block">{item.details}</span>
                        )}

                        {/* Matrix Breakdown if available */}
                        {Array.isArray(breakdown) && breakdown.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                            <span className="text-muted-foreground font-semibold">Breakdown:</span>
                            {breakdown.map((bd: { color?: string; size?: string; quantity?: number }, bIdx: number) => (
                              <span key={bIdx} className="bg-secondary px-1.5 py-0.5 rounded border border-border text-foreground font-mono">
                                {bd.color ? `${bd.color}/` : ""}{bd.size}: <strong>{bd.quantity}</strong> pcs
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-muted-foreground">{item.sku}</td>
                  <td className="py-3.5 px-3 text-right font-bold">{item.quantity.toLocaleString()} pcs</td>
                  <td className="py-3.5 px-3 text-right font-bold">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-3.5 px-3 text-right font-bold">${item.total.toFixed(2)}</td>
                </tr>
              );
            })}
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
            1. Goods manufactured in compliance with ISO 9001 and OEKO-TEX Standard 100 quality standards.<br />
            2. Official export documentation package includes Commercial Invoice, Packing List, and Certificate of Origin.<br />
            3. Payment Terms: {doc.paymentTerms || "100% Advance T/T or L/C at sight"}.<br />
            <strong className="text-amber-700 dark:text-amber-400 block mt-1">
              4. Offer Sheet note: Strictly FOB Dhaka basis. Freight charges to be negotiated separately.
            </strong>
          </p>
        </div>

        <div className="w-full sm:w-80 space-y-2 shrink-0 bg-secondary/20 p-4 rounded-2xl border border-border/60 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Goods Value (Subtotal):</span>
            <span className="font-bold text-foreground">${(doc.goods_value ?? doc.subtotal).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-foreground pt-2.5 border-t-2 border-foreground">
            <span>OFFER VALUE (USD):</span>
            <span>${(doc.goods_value ?? doc.subtotal).toFixed(2)} {doc.currency}</span>
          </div>
        </div>
      </div>

      {/* Signatory */}
      <div className="pt-6 border-t border-border">
        <DocumentSignatory
          title="Authorized Signatory"
          division="Ayaan Clothing Export Division"
        />
      </div>
    </div>
  );
}
