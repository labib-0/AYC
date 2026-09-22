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
        badgeText="Proforma Invoice"
        title={doc.title || "PROFORMA INVOICE"}
        docNumber={doc.docNumber}
        date={doc.date}
        orderNumber={doc.orderNumber}
        validUntil={doc.validUntil}
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

        {/* Proforma Invoice Logistics Snapshot */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Physical Shipment &amp; Logistics</span>
            {snapshot?.is_provisional && (
              <span className="text-[10px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                Estimated Shipping
              </span>
            )}
          </span>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
            <div><strong className="text-foreground">Carrier:</strong> {snapshot?.carrier || (doc.shipping > 0 ? "Aramex Express Air" : "To be confirmed")}</div>
            <div><strong className="text-foreground">Cartons:</strong> {snapshot?.carton_count || 1} ctn</div>
            <div><strong className="text-foreground">Gross Wt:</strong> {snapshot?.gross_weight ? `${snapshot.gross_weight} kg` : "N/A"}</div>
            <div><strong className="text-foreground">Volume:</strong> {snapshot?.cbm ? `${snapshot.cbm} m³` : "0.072 m³"}</div>
            <div className="col-span-2"><strong className="text-foreground">Terms:</strong> {doc.incoterm || "FOB Dhaka / CIF"}</div>
            {snapshot?.tracking_number && (
              <div className="col-span-2 text-primary font-mono font-bold">
                AWB Tracking: {snapshot.tracking_number}
              </div>
            )}
            {!doc.shipping && (
              <div className="col-span-2 text-amber-600 dark:text-amber-400 font-semibold pt-1">
                Freight charges to be confirmed directly by export desk.
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
            3. Payment Terms: {doc.paymentTerms || "100% Advance T/T or L/C at sight"}.
          </p>
        </div>

        <div className="w-full sm:w-80 space-y-2 shrink-0 bg-secondary/20 p-4 rounded-2xl border border-border/60 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Goods Value (Subtotal):</span>
            <span className="font-bold text-foreground">${(doc.goods_value ?? doc.subtotal).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <span>Shipping / Freight:</span>
              {snapshot?.is_provisional && (
                <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">Est</span>
              )}
            </span>
            <span className="font-bold text-foreground">
              {doc.shipping && doc.shipping > 0 ? (
                `$${doc.shipping.toFixed(2)}`
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">To be confirmed</span>
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
              {doc.shipping > 0 ? "TOTAL PAYABLE:" : "MERCHANDISE TOTAL:"}
            </span>
            <span>
              ${(doc.total_payable ?? doc.grandTotal).toFixed(2)} {doc.currency}
              {!doc.shipping && (
                <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium text-right">
                  + freight (to be confirmed)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Official Beneficiary Bank Details & Signature */}
      <div className="pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <BeneficiaryBankDetails bankDetails={doc.bankDetails} />

        <DocumentSignatory
          title="Authorized Signatory"
          division="Ayaan Clothing Export Division"
        />
      </div>
    </div>
  );
}
