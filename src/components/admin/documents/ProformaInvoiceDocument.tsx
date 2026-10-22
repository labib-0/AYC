import React from "react";
import { CommercialDocument } from "@/types/b2b";
import DocumentHeader from "./DocumentHeader";
import DocumentSignatory from "./DocumentSignatory";
import BeneficiaryBankDetails from "./BeneficiaryBankDetails";

export interface ProformaInvoiceDocumentProps {
  doc: CommercialDocument;
}

export default function ProformaInvoiceDocument({ doc }: ProformaInvoiceDocumentProps) {
  const snapshot = doc.shipping_snapshot;

  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Header */}
      <DocumentHeader
        badgeText="PROFORMA INVOICE"
        title="PROFORMA INVOICE"
        subtitle="Official PI (USD)"
        docNumber={doc.docNumber}
        date={doc.date}
        orderNumber={doc.orderNumber}
        validUntil={doc.validUntil || "30 Days from date of issuance"}
        shippingArrangement={
          snapshot?.carrier
            ? `${snapshot.carrier} (${Number(doc.shipping || 0) > 0 ? `$${Number(doc.shipping).toFixed(2)} USD` : "Freight Confirmed Separately"})`
            : Number(doc.shipping || 0) > 0
            ? "Air Cargo Express (Aramex)"
            : "To Be Confirmed Separately"
        }
        paymentTerms={doc.paymentTerms || "100% Advance T/T Wire"}
        exporterProfile={doc.exporter}
      />

      {/* Bill To & Logistics Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Commercial Buyer / Consignee
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

        {/* Proforma Invoice Logistics & Shipping Notice */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Shipping &amp; Delivery Terms</span>
            <span className="text-[10px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
              Excluded From Total
            </span>
          </span>
          <div className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground font-bold">Shipping &amp; Delivery:</strong> Arrangements and carrier booking to be confirmed via WhatsApp or email.{" "}
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Shipping charges are excluded from the merchandise total.</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground pt-1 text-[11px]">
            <div><strong className="text-foreground">Total CBM:</strong> {snapshot?.cbm ? `${Number(snapshot.cbm).toFixed(4)} m³` : "Pending Package Profile"}</div>
            <div><strong className="text-foreground">Gross Weight:</strong> {snapshot?.gross_weight ? `${Number(snapshot.gross_weight).toFixed(0)} KG` : "Pending Package Profile"}</div>
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
                          className="w-12 aspect-[3/4] object-contain rounded-lg border border-border/80 bg-secondary shrink-0"
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
                  <td className="py-3.5 px-3 text-right font-bold">${Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2)}</td>
                  <td className="py-3.5 px-3 text-right font-bold">${Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4 border-t border-border">
        <div className="flex-1 space-y-3">
          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 text-xs leading-relaxed">
            <strong className="text-foreground font-bold">Shipping &amp; Delivery:</strong> Arrangements and carrier booking to be confirmed via WhatsApp or email.{" "}
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Shipping charges are excluded from the merchandise total.</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Commercial Terms &amp; Notes
            </span>
            <p className="text-muted-foreground text-xs leading-relaxed">
              1. Goods manufactured in compliance with ISO 9001 and OEKO-TEX Standard 100 quality standards.<br />
              2. Official export documentation package includes Commercial Invoice, Packing List, and Certificate of Origin.<br />
              3. Payment Terms: {doc.paymentTerms || "100% Advance T/T or L/C at sight"}.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-80 space-y-2 shrink-0 bg-secondary/20 p-4 rounded-2xl border border-border/60 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Goods Value (Subtotal):</span>
            <span className="font-bold text-foreground">${Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)}</span>
          </div>

          {Number(doc.discount || (doc as any).coupon_discount || (doc as any).manual_discount || 0) > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Discounts:</span>
              <span className="font-bold">-${Number(doc.discount || ((doc as any).coupon_discount || 0) + ((doc as any).manual_discount || 0)).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <span>Shipping / Freight:</span>
              {snapshot?.is_provisional && (
                <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">Est</span>
              )}
            </span>
            <span className="font-bold text-foreground">
              {Number(doc.shipping || 0) > 0 ? (
                `$${Number(doc.shipping).toFixed(2)}`
              ) : (
                <span className="text-muted-foreground font-semibold">Excluded</span>
              )}
            </span>
          </div>

          {Number(doc.other_charges || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Other Charges:</span>
              <span className="font-bold text-foreground">${Number(doc.other_charges).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold text-foreground pt-2.5 border-t-2 border-foreground">
            <span>
              MERCHANDISE TOTAL:
            </span>
            <span>
              ${(doc.total_payable ?? doc.grandTotal).toFixed(2)} {doc.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Official Beneficiary Bank Details & Signature */}
      <div className="pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <BeneficiaryBankDetails bankDetails={doc.bankDetails || (doc as any).bank_details} />

        <DocumentSignatory
          title={doc.document_defaults?.signatory_title || doc.exporter?.signatory_title || "Authorized Signatory"}
          division={doc.document_defaults?.signatory_division || doc.exporter?.signatory_division || "Ayaan Clothing Export Division"}
        />
      </div>
    </div>
  );
}
