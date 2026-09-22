import React from "react";
import { CommercialDocument } from "@/types/b2b";
import BUSINESS_PROFILE from "@/config/business-profile";
import DocumentHeader from "./DocumentHeader";
import DocumentSignatory from "./DocumentSignatory";
import BeneficiaryBankDetails from "./BeneficiaryBankDetails";

export interface CommercialInvoiceDocumentProps {
  doc: CommercialDocument;
}

export default function CommercialInvoiceDocument({ doc }: CommercialInvoiceDocumentProps) {
  const snapshot = doc.shipping_snapshot;

  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Header */}
      <DocumentHeader
        badgeText="Commercial Invoice"
        title="COMMERCIAL INVOICE"
        docNumber={doc.docNumber}
        date={doc.date}
        orderNumber={doc.orderNumber}
        validUntil={doc.validUntil}
      />

      {/* Shipper, Buyer & Shipment Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Exporter / Shipper
          </span>
          <span className="font-bold text-sm text-foreground block">
            {BUSINESS_PROFILE.name}
          </span>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {BUSINESS_PROFILE.description}<br />
            {BUSINESS_PROFILE.address.formatted}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Buyer / Consignee
          </span>
          <span className="font-bold text-sm text-foreground block">
            {doc.companyName}
          </span>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Attn: {doc.buyerName}<br />
            Address: {doc.buyerAddress}<br />
            Country: {doc.buyerCountry} • Email: {doc.buyerEmail}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-1 sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Shipment & Delivery Terms
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-muted-foreground pt-1">
            <div><strong>Country of Origin:</strong><br />Bangladesh</div>
            <div><strong>Port of Loading:</strong><br />{doc.logistics?.port_of_loading || "Hazrat Shahjalal Int'l Airport (DAC)"}</div>
            <div><strong>Final Destination:</strong><br />{doc.buyerCountry}</div>
            <div><strong>Incoterm / Terms:</strong><br />{doc.incoterm || "DAP (Delivered at Place)"}</div>
            <div><strong>Mode of Transport:</strong><br />{doc.logistics?.mode_of_shipment || "Air Cargo Express"}</div>
            <div><strong>Carrier:</strong><br />{snapshot?.carrier || "Aramex"}</div>
            <div><strong>AWB / Tracking:</strong><br /><span className="font-mono font-bold text-primary">{snapshot?.tracking_number || "Pending Dispatch"}</span></div>
            <div><strong>Payment Terms:</strong><br />{doc.paymentTerms || "100% T/T Advance"}</div>
          </div>
        </div>
      </div>

      {/* Goods Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-border">
          <thead>
            <tr className="border-b-2 border-foreground bg-secondary/60 uppercase text-[11px] font-bold tracking-wider text-foreground">
              <th className="py-2.5 px-3 border-r border-border">Marks &amp; Nos</th>
              <th className="py-2.5 px-3 border-r border-border">HS Code</th>
              <th className="py-2.5 px-3 border-r border-border">Description of Goods</th>
              <th className="py-2.5 px-3 text-right border-r border-border">Quantity</th>
              <th className="py-2.5 px-3 text-right border-r border-border">Unit Price ({doc.currency})</th>
              <th className="py-2.5 px-3 text-right">Amount ({doc.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.items.map((item, idx) => (
              <tr key={idx} className="font-medium text-foreground">
                <td className="py-2.5 px-3 border-r border-border font-mono text-muted-foreground">
                  {item.marks_and_numbers || `AYN/${doc.orderNumber}/0${idx + 1}`}
                </td>
                <td className="py-2.5 px-3 border-r border-border font-mono font-bold text-primary">
                  {item.hs_code || "6105.10.00"}
                </td>
                <td className="py-2.5 px-3 border-r border-border">
                  <span className="font-bold block">{item.description}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-bold border-r border-border">
                  {item.quantity.toLocaleString()} pcs
                </td>
                <td className="py-2.5 px-3 text-right font-bold border-r border-border">
                  ${item.unitPrice.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold">
                  ${item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Summary & Say in Words */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
        <div className="flex-1 space-y-3">
          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Amount Say in Words (USD)
            </span>
            <span className="font-bold text-foreground text-xs leading-relaxed block italic">
              &ldquo;{doc.amount_in_words || `US Dollars ${(doc.total_payable ?? doc.grandTotal).toFixed(2)} Only`}&rdquo;
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border/60 text-[11px] text-muted-foreground space-y-1">
            <span className="font-bold text-foreground block">Packaging &amp; Freight Summary:</span>
            <div>Total Cartons: <strong className="text-foreground">{snapshot?.carton_count || 1} Master Export Cartons</strong></div>
            <div>Gross Weight: <strong className="text-foreground">{snapshot?.gross_weight || 20} kg</strong> • Net Weight: <strong className="text-foreground">{snapshot?.net_weight || 18} kg</strong></div>
            <div>Total Volume: <strong className="text-foreground">{snapshot?.cbm || 0.072} CBM</strong></div>
          </div>
        </div>

        <div className="w-full sm:w-80 space-y-2 shrink-0 bg-secondary/20 p-4 rounded-2xl border border-border/70 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Goods Value (Subtotal):</span>
            <span className="font-bold text-foreground">${(doc.goods_value ?? doc.subtotal).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Shipping &amp; Freight:</span>
            <span className="font-bold text-foreground">
              {doc.shipping === 0 ? "FREE" : `$${doc.shipping.toFixed(2)}`}
            </span>
          </div>

          {Number(doc.other_charges || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Other Charges:</span>
              <span className="font-bold text-foreground">${Number(doc.other_charges).toFixed(2)}</span>
            </div>
          )}

          {Number(doc.tax || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax / Customs Surcharge:</span>
              <span className="font-bold text-foreground">${Number(doc.tax).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-foreground pt-2.5 border-t-2 border-foreground">
            <span>TOTAL PAYABLE:</span>
            <span>${(doc.total_payable ?? doc.grandTotal).toFixed(2)} {doc.currency}</span>
          </div>
        </div>
      </div>

      {/* Official Bank Wire Information & Signature */}
      <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <BeneficiaryBankDetails bankDetails={doc.bankDetails} />

        <DocumentSignatory
          title="Authorized Signatory & Official Stamp"
          division="Ayaan Clothing Export Division"
        />
      </div>
    </div>
  );
}
