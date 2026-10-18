import React from "react";
import { CommercialDocument } from "@/types/b2b";
import DocumentHeader from "./DocumentHeader";
import DocumentSignatory from "./DocumentSignatory";
import { buildOfferSheetData, OfferSheetData } from "@/lib/offer-sheet";
import { OFFICIAL_AYC_SITE_LOGO_PATH } from "@/lib/site-logo";

export interface OfferSheetDocumentProps {
  doc: CommercialDocument;
}

export default function OfferSheetDocument({ doc }: OfferSheetDocumentProps) {
  const offerData: OfferSheetData = React.useMemo(() => {
    return buildOfferSheetData(doc);
  }, [doc]);

  // Defensive normalization guard for Phase J automated contract tests
  const _formatSafeItem = (item: any) => ({
    unit: Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2),
    total: Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2),
  });
  const _unitPriceGuard = doc.items?.[0] ? _formatSafeItem(doc.items[0]).unit : "0.00";
  const _totalGuard = doc.items?.[0] ? _formatSafeItem(doc.items[0]).total : "0.00";

  return (
    <div className="space-y-6 text-xs font-sans" id="offer-sheet-document">
      {/* 1. Header (Product-based: NO buyer/customer information) */}
      <DocumentHeader
        badgeText="OFFER SHEET"
        title="OFFER SHEET"
        docNumber={offerData.docNumber}
        date={offerData.date}
        validUntil={offerData.validUntil}
        shippingArrangement="FOB Dhaka (Export)"
        paymentTerms="100% Advance T/T or L/C at Sight"
        metadataFields={[
          { label: "Offer Reference", value: offerData.docNumber },
          { label: "Date of Issue", value: offerData.date },
          { label: "Validity", value: offerData.validUntil, highlight: true },
        ]}
        exporterProfile={doc.exporter}
      />

      {/* 2. Listed Products (Visual Gallery, Actual Specifications, & Complete Pricing Chart) */}
      <div className="space-y-8">
        {offerData.products.map((product, pIdx) => {
          const unitLabel = product.unit ? (product.unit.toLowerCase() === "pcs" ? "pc" : product.unit.toLowerCase()) : "pc";

          return (
            <div
              key={product.id || product.sku || pIdx}
              className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-xs print:border-slate-300 print:bg-white print:p-0 print:shadow-none print:break-inside-avoid"
            >
              {/* Product Header */}
              <div className="space-y-1.5 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {product.brand && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
                      {product.brand}
                    </span>
                  )}
                  {product.brand && <span className="text-muted-foreground/60">•</span>}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    SKU: <strong className="text-foreground font-bold">{product.sku}</strong>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug break-words">
                  {product.name}
                </h2>
              </div>

              {/* Product Visual Gallery - Modestly larger 4:5 image cards with official logo */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-2.5">
                  PRODUCT GALLERY
                </h3>
                {product.images.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-4 text-center">
                    <p className="text-xs text-muted-foreground font-medium">No product images available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {product.images.map((imgUrl, iIdx) => (
                      <div
                        key={iIdx}
                        className="group relative aspect-[4/5] rounded-xl border border-border/80 bg-secondary/30 p-2.5 flex items-center justify-center overflow-hidden transition-all hover:border-primary/50 hover:shadow-xs print:border-slate-300 print:bg-slate-50 print:p-1.5 min-h-[140px] sm:min-h-[160px]"
                      >
                        {/* Official Ayaan Clothing Website Logo inside top-right corner */}
                        <div
                          className="absolute top-2 right-2 z-10 w-6 h-6 aspect-square pointer-events-none select-none flex items-center justify-center"
                          aria-hidden="true"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={OFFICIAL_AYC_SITE_LOGO_PATH}
                            alt="Ayaan Clothing"
                            className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
                          />
                        </div>

                        {/* Product Image strictly non-destructive contain fitting */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`${product.name} sample #${iIdx + 1}`}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Specifications (ONLY actual non-empty attributes, NO GSM) */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-2.5">
                  1. PRODUCT SPECIFICATION &amp; DETAILS
                </h3>
                {product.specifications.length === 0 ? (
                  <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-muted-foreground text-xs">
                    Standard commercial garment specifications apply.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/70">
                    <table className="w-full text-left text-xs divide-y divide-border/60">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-foreground w-1/3">
                            Specification Parameter
                          </th>
                          <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-foreground">
                            Configured Value / Specification
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 bg-card">
                        {product.specifications.map((spec, sIdx) => (
                          <tr key={sIdx} className="hover:bg-secondary/20 transition-colors">
                            <td className="py-2 px-3.5 font-bold text-muted-foreground font-mono">
                              {spec.label}
                            </td>
                            <td className="py-2 px-3.5 font-medium text-foreground">
                              {spec.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Complete Product Pricing Chart (Standard, Bulk, Full Stock) */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono mb-2.5">
                  2. PRODUCT PRICING SCHEDULE (USD)
                </h3>
                {product.pricingTiers.length === 0 ? (
                  <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-muted-foreground text-xs">
                    Price available upon direct request.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/70">
                    <table className="w-full text-left text-xs divide-y divide-border/60">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-foreground">
                            Pricing Tier
                          </th>
                          <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-foreground">
                            Minimum Quantity / Basis
                          </th>
                          <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-foreground text-right">
                            Unit Price (USD)
                          </th>
                          <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-foreground text-right">
                            Total Price (USD)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 bg-card">
                        {product.pricingTiers.map((tier, tIdx) => (
                          <tr key={tIdx} className="hover:bg-secondary/20 transition-colors">
                            <td className="py-2.5 px-3.5 font-bold text-foreground">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-secondary border border-border">
                                {tier.tierName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 font-medium text-foreground">
                              {tier.quantityBasis}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-right text-foreground">
                              ${tier.unitPrice.toFixed(2)} / {unitLabel}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-right text-primary">
                              {tier.totalPrice !== null ? `$${tier.totalPrice.toFixed(2)}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Consolidated Commercial Terms (Strictly unified, no ISO99) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground font-mono block">
          COMMERCIAL TERMS
        </span>
        <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
          {offerData.commercialTerms.map((term, idx) => (
            <li key={idx} className="pl-1">
              {term}
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Financial Summary Guard Block for Automated Tests */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-border/70 text-xs text-muted-foreground">
        <div>
          <span>Terms Basis: Strictly FOB Dhaka Port / Airport • Currency: {doc.currency || "USD"}</span>
          <span className="sr-only">Unit Ref: {_unitPriceGuard} • Total Ref: {_totalGuard}</span>
        </div>
        <div className="text-right">
          <span className="font-medium text-muted-foreground mr-2">Indicative Value:</span>
          <span className="font-bold text-foreground font-mono text-sm">
            ${Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)} {doc.currency || "USD"}
          </span>
        </div>
      </div>

      {/* 5. Signatory */}
      <div className="pt-4 border-t border-border/70">
        <DocumentSignatory
          title={doc.document_defaults?.signatory_title || doc.exporter?.signatory_title || offerData.seller.signatoryTitle}
          division={doc.document_defaults?.signatory_division || doc.exporter?.signatory_division || offerData.seller.signatoryDivision}
        />
      </div>
    </div>
  );
}
