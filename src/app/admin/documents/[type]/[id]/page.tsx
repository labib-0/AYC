"use client";

import { use, useState, useEffect } from "react";
import { getCommercialDocument } from "@/lib/services/quotations";
import { CommercialDocument, CommercialDocType } from "@/types/b2b";
import { 
  Printer, 
  ArrowLeft, 
  Building2, 
  ShieldCheck, 
  Truck, 
  Box, 
  Package, 
  AlertCircle,
  Lock,
  FileCheck,
  CheckCircle2,
  ExternalLink,
  Download,
} from "lucide-react";
import Link from "next/link";
import BrandName from "@/components/common/BrandName";
import BUSINESS_PROFILE from "@/config/business-profile";
import { downloadCommercialDocumentPDF } from "@/lib/pdf-generator";
import CommercialProductGallery from "@/components/admin/documents/CommercialProductGallery";
import BeneficiaryBankDetails from "@/components/admin/documents/BeneficiaryBankDetails";

export default function CommercialDocumentPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = use(params);
  const [doc, setDoc] = useState<CommercialDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCommercialDocument(type as CommercialDocType, id);
        setDoc(data);
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (doc) {
      await downloadCommercialDocumentPDF(doc);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Generating commercial document...</span>
      </div>
    );
  }

  if (errorMsg || !doc) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-card border border-border text-center space-y-4 shadow-xl">
        <AlertCircle size={40} className="text-destructive mx-auto" />
        <h2 className="text-lg font-bold uppercase text-foreground">Document Unavailable</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {errorMsg || "The requested commercial document could not be found."}
        </p>
        <Link href="/admin/orders" className="text-primary hover:underline mt-2 inline-block text-xs font-bold uppercase">
          ← Back to Orders List
        </Link>
      </div>
    );
  }

  const isCommercialInvoice = doc.docType === "COMMERCIAL_INVOICE";
  const isPackingList = doc.docType === "PACKING_LIST";
  const isOrderSheet = doc.docType === "ORDER_SHEET";
  const isPI = doc.docType === "PROFORMA_INVOICE";
  const snapshot = doc.shipping_snapshot;
  const isGated = Boolean(doc.is_gated);

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4 sm:px-6 print:p-0 print:bg-white">
      
      {/* Top Floating Print Controls (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={doc.orderNumber ? `/admin/orders/${doc.order_id || doc.orderNumber}` : "/admin/quotations"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={13} />
          <span>{doc.orderNumber ? `Back to Order #${doc.orderNumber}` : "Back to Quotations"}</span>
        </Link>

        <div className="flex items-center gap-3">
          {isGated && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-500/20">
              <Lock size={12} />
              <span>Draft Preview (Payment Pending)</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md cursor-pointer"
          >
            <Download size={14} />
            <span>Download PDF (A4)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md cursor-pointer"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT SHEET CONTAINER (A4 Formatted Commercial Container) */}
      <div className="max-w-4xl mx-auto bg-card text-foreground border border-border/80 rounded-3xl p-8 sm:p-12 shadow-xl print:shadow-none print:border-0 print:p-0 print:text-black print:bg-white space-y-6 font-sans">
        
        {/* ========================================================================= */}
        {/* TYPE A: PACKING LIST LAYOUT                                                */}
        {/* ========================================================================= */}
        {isPackingList ? (
          <div className="space-y-6 text-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-foreground/90">
              <div>
                <div className="flex items-center gap-2">
                  <BrandName className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Shipping & Logistics
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
                <span className="text-2xl font-display font-black uppercase tracking-wider text-primary block">
                  COMMERCIAL PACKING LIST
                </span>
                <span className="font-mono text-base font-bold text-foreground block mt-1">
                  {doc.docNumber}
                </span>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Date of Issue: <strong className="text-foreground">{doc.date}</strong></div>
                  <div>Related Invoice: <strong className="text-foreground font-mono">{doc.related_invoice_number || doc.docNumber.replace('PL', 'INV')}</strong></div>
                  {doc.orderNumber && <div>Order Ref: <strong className="text-foreground font-mono">#{doc.orderNumber}</strong></div>}
                </div>
              </div>
            </div>

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
                  <div><strong>Port of Loading:</strong><br />{doc.logistics?.port_of_loading || "Hazrat Shahjalal Int'l Airport (DAC)"}</div>
                  <div><strong>Port of Discharge:</strong><br />{doc.logistics?.port_of_discharge || `${doc.buyerCountry} Port`}</div>
                  <div><strong>Shipment Mode:</strong><br />{doc.logistics?.mode_of_shipment || "Air Cargo Express"}</div>
                  <div><strong>AWB / Waybill No:</strong><br /><span className="font-mono font-bold text-primary">{snapshot?.tracking_number || "To Be Issued"}</span></div>
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
            <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-muted-foreground block text-[10px]">
                  Declaration of Export Packing
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  We hereby certify that the goods packed above have been inspected and verified against the official export purchase order. Cartons are sealed in standard export quality 5-ply cartons suitable for international freight transport.
                </p>
              </div>

              <div className="flex flex-col justify-end items-start sm:items-end text-right">
                <div className="w-48 border-b border-foreground mb-2" />
                <span className="font-bold text-xs uppercase text-foreground">
                  Warehouse Quality & Dispatch Supervisor
                </span>
                <span className="text-xs text-muted-foreground">
                  Ayaan Clothing Logistics Hub
                </span>
              </div>
            </div>
          </div>
        ) : isCommercialInvoice ? (
          /* ========================================================================= */
          /* TYPE B: COMMERCIAL INVOICE LAYOUT                                          */
          /* ========================================================================= */
          <div className="space-y-6 text-xs">
            {/* Company Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-foreground/90">
              <div>
                <div className="flex items-center gap-2">
                  <BrandName className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Commercial Invoice
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
                <span className="text-2xl font-display font-black uppercase tracking-wider text-primary block">
                  COMMERCIAL INVOICE
                </span>
                <span className="font-mono text-base font-bold text-foreground block mt-1">
                  {doc.docNumber}
                </span>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Invoice Date: <strong className="text-foreground">{doc.date}</strong></div>
                  {doc.orderNumber && <div>Order Ref: <strong className="text-foreground font-mono">#{doc.orderNumber}</strong></div>}
                  {doc.validUntil && <div className="text-rose-600 dark:text-rose-400 font-semibold">Valid Until: {doc.validUntil}</div>}
                </div>
              </div>
            </div>

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
                    <th className="py-2.5 px-3 border-r border-border">Marks & Nos</th>
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
                  <span className="font-bold text-foreground block">Packaging & Freight Summary:</span>
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
                  <span>Shipping & Freight:</span>
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
              {doc.bankDetails && (
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Official Export Wire Information (USD)
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Beneficiary: <strong className="text-foreground">{doc.bankDetails.beneficiaryName}</strong><br />
                    {doc.bankDetails.isConfigured && doc.bankDetails.bankName ? (
                      <>
                        Bank: {doc.bankDetails.bankName}<br />
                        Account No: <strong className="font-mono text-foreground">{doc.bankDetails.accountNumber}</strong><br />
                        SWIFT Code: <strong className="font-mono text-foreground">{doc.bankDetails.swiftCode}</strong><br />
                        Branch: {doc.bankDetails.branch}
                      </>
                    ) : (
                      <span className="italic text-muted-foreground">
                        Official banking & wire instructions will be provided upon contract / order confirmation.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-col justify-end items-start sm:items-end text-right">
                <div className="w-48 border-b border-foreground mb-2" />
                <span className="font-bold text-xs uppercase text-foreground">
                  Authorized Signatory & Official Stamp
                </span>
                <span className="text-xs text-muted-foreground">
                  Ayaan Clothing Export Division
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TYPE C: ORDER SHEET & PROFORMA INVOICE (PI) LAYOUT                        */
          /* ========================================================================= */
          <div className="space-y-6 text-xs">
            {/* Company Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-foreground/80">
              <div>
                <div className="flex items-center gap-2">
                  <BrandName className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    {isPI ? "Proforma Invoice" : "Commercial Order Sheet"}
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
                <span className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wide text-primary block">
                  {doc.title}
                </span>
                <span className="font-mono text-base font-bold text-foreground block mt-1">
                  {doc.docNumber}
                </span>
                <span className="text-xs text-muted-foreground block mt-1">
                  Issue Date: {doc.date}
                </span>
                {doc.orderNumber && (
                  <span className="text-xs font-mono font-bold text-primary block mt-0.5">
                    Order Ref: #{doc.orderNumber}
                  </span>
                )}
                {doc.validUntil && (
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block mt-0.5">
                    Valid Until: {doc.validUntil}
                  </span>
                )}
              </div>
            </div>

            {/* Offer Sheet / Order Sheet Product Visual Gallery */}
            {isOrderSheet && (
              <CommercialProductGallery
                images={doc.product_gallery || doc.items?.[0]?.product_images}
                primaryImageUrl={doc.items?.[0]?.product_image_url}
                productName={doc.items?.[0]?.description}
              />
            )}

            {/* Bill To & Logistics Snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {isOrderSheet ? "Offered To / Consignee" : "Commercial Buyer / Consignee"}
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

              {isOrderSheet ? (
                /* Strictly ZERO shipping information on Offer Sheet */
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
              ) : (
                /* Proforma Invoice Logistics Snapshot */
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
              )}
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
                                className="w-12 h-14 object-cover rounded-lg border border-border/80 bg-secondary shrink-0"
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
                                  {breakdown.map((bd: any, bIdx: number) => (
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
                  {isOrderSheet && (
                    <strong className="text-amber-700 dark:text-amber-400 block mt-1">
                      4. Offer Sheet note: Strictly FOB Dhaka basis. Freight charges to be negotiated separately.
                    </strong>
                  )}
                </p>
              </div>

              <div className="w-full sm:w-80 space-y-2 shrink-0 bg-secondary/20 p-4 rounded-2xl border border-border/60 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Goods Value (Subtotal):</span>
                  <span className="font-bold text-foreground">${(doc.goods_value ?? doc.subtotal).toFixed(2)}</span>
                </div>

                {!isOrderSheet && (
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
                )}

                {Number(doc.other_charges || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Other Charges:</span>
                    <span className="font-bold text-foreground">${Number(doc.other_charges).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold text-foreground pt-2.5 border-t-2 border-foreground">
                  <span>
                    {isOrderSheet
                      ? "OFFER VALUE (USD):"
                      : doc.shipping > 0
                      ? "TOTAL PAYABLE:"
                      : "MERCHANDISE TOTAL:"}
                  </span>
                  <span>
                    ${(isOrderSheet ? (doc.goods_value ?? doc.subtotal) : (doc.total_payable ?? doc.grandTotal)).toFixed(2)} {doc.currency}
                    {!isOrderSheet && !doc.shipping && (
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium text-right">
                        + freight (to be confirmed)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details & Signature */}
            <div className="pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {isPI ? (
                <BeneficiaryBankDetails bankDetails={doc.bankDetails} />
              ) : (
                <div />
              )}

              <div className="flex flex-col justify-end items-start sm:items-end text-right">
                <div className="w-48 border-b border-foreground mb-2" />
                <span className="font-bold text-xs uppercase text-foreground">
                  Authorized Signatory
                </span>
                <span className="text-xs text-muted-foreground">
                  Ayaan Clothing Export Division
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
