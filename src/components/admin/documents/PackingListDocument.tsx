import React from "react";
import { CommercialDocument } from "@/types/b2b";
import BUSINESS_PROFILE from "@/config/business-profile";
import DocumentHeader from "./DocumentHeader";
import DocumentSignatory from "./DocumentSignatory";

export interface PackingListDocumentProps {
  doc: CommercialDocument;
}

export default function PackingListDocument({ doc }: PackingListDocumentProps) {
  const snapshot = doc.shipping_snapshot;

  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Header */}
      <DocumentHeader
        badgeText="Shipping & Logistics"
        title="COMMERCIAL PACKING LIST"
        docNumber={doc.docNumber}
        date={doc.date}
        orderNumber={doc.orderNumber}
        relatedInvoiceNumber={doc.related_invoice_number || doc.docNumber.replace("PL", "INV")}
      />

      {/* Shipper, Consignee, Notify & Routing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            1. Exporter / Shipper
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
            2. Consignee / Buyer
          </span>
          <span className="font-bold text-sm text-foreground block">
            {doc.companyName}
          </span>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Attn: {doc.buyerName}<br />
            Address: {doc.buyerAddress}<br />
            Destination: {doc.buyerCountry} • Contact: {doc.buyerPhone || doc.buyerEmail}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-1 sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            3. Shipment & Transport Information
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-muted-foreground pt-1">
            <div>
              <strong>Port of Loading:</strong><br />
              {doc.logistics?.port_of_loading || "Hazrat Shahjalal Int'l Airport (DAC)"}
            </div>
            <div>
              <strong>Port of Discharge:</strong><br />
              {doc.logistics?.port_of_discharge || `${doc.buyerCountry} Port`}
            </div>
            <div>
              <strong>Shipment Mode:</strong><br />
              {doc.logistics?.mode_of_shipment || "Air Cargo Express"}
            </div>
            <div>
              <strong>AWB / Waybill No:</strong><br />
              <span className="font-mono font-bold text-primary">
                {snapshot?.tracking_number || "To Be Issued"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Packing Details Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-border">
          <thead>
            <tr className="border-b-2 border-foreground bg-secondary/60 uppercase text-[11px] font-bold tracking-wider text-foreground">
              <th className="py-2.5 px-3 border-r border-border">Carton / Mark No</th>
              <th className="py-2.5 px-3 border-r border-border">Description of Goods</th>
              <th className="py-2.5 px-3 text-right border-r border-border">Pcs / Ctn</th>
              <th className="py-2.5 px-3 border-r border-border">Carton Dimensions</th>
              <th className="py-2.5 px-3 text-right border-r border-border">Gross Wt (KG)</th>
              <th className="py-2.5 px-3 text-right border-r border-border">Net Wt (KG)</th>
              <th className="py-2.5 px-3 text-right">CBM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.packing_cartons && doc.packing_cartons.length > 0 ? (
              doc.packing_cartons.map((ctn, idx) => (
                <tr key={idx} className="font-medium text-foreground">
                  <td className="py-2.5 px-3 border-r border-border font-mono font-bold">
                    {ctn.carton_no}
                    <span className="text-[10px] text-muted-foreground block font-normal">{ctn.marks_and_numbers}</span>
                  </td>
                  <td className="py-2.5 px-3 border-r border-border">
                    <span className="font-bold block">{ctn.description}</span>
                    <span className="text-[10px] text-muted-foreground">{ctn.packaging}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold border-r border-border">
                    {ctn.quantity_pcs.toLocaleString()} pcs
                  </td>
                  <td className="py-2.5 px-3 border-r border-border font-mono text-muted-foreground">
                    {ctn.dimensions}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-border">
                    {ctn.gross_weight.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-border">
                    {ctn.net_weight.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {ctn.cbm.toFixed(4)}
                  </td>
                </tr>
              ))
            ) : (
              doc.items.map((item, idx) => (
                <tr key={idx} className="font-medium text-foreground">
                  <td className="py-2.5 px-3 border-r border-border font-mono font-bold">
                    CTN #{idx + 1}
                  </td>
                  <td className="py-2.5 px-3 border-r border-border">
                    <span className="font-bold">{item.description}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold border-r border-border">
                    {item.quantity.toLocaleString()} pcs
                  </td>
                  <td className="py-2.5 px-3 border-r border-border font-mono">
                    60x40x30 cm
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-border">
                    {(snapshot?.gross_weight || 20).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-border">
                    {(snapshot?.net_weight || 18).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {(snapshot?.cbm || 0.072).toFixed(4)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-secondary/70 font-bold border-t-2 border-foreground text-foreground">
              <td colSpan={2} className="py-3 px-3 uppercase text-[11px]">
                TOTAL SUMMARY ({doc.totals_summary?.total_cartons || snapshot?.carton_count || 1} Cartons)
              </td>
              <td className="py-3 px-3 text-right">
                {(doc.totals_summary?.total_quantity || doc.items.reduce((s, i) => s + i.quantity, 0)).toLocaleString()} pcs
              </td>
              <td className="py-3 px-3 text-muted-foreground">—</td>
              <td className="py-3 px-3 text-right font-mono">
                {(doc.totals_summary?.total_gross_weight ?? snapshot?.gross_weight ?? 20.0).toFixed(2)} KG
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {(doc.totals_summary?.total_net_weight ?? snapshot?.net_weight ?? 18.0).toFixed(2)} KG
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {(doc.totals_summary?.total_cbm ?? snapshot?.cbm ?? 0.072).toFixed(4)} m³
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Declaration & Signatures */}
      <DocumentSignatory
        notesTitle="Declaration of Export Packing"
        notes="We hereby certify that the goods packed above have been inspected and verified against the official export purchase order. Cartons are sealed in standard export quality 5-ply cartons suitable for international freight transport."
        title="Warehouse Quality & Dispatch Supervisor"
        division="Ayaan Clothing Logistics Hub"
      />
    </div>
  );
}
