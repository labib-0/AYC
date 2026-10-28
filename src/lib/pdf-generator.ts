import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import BUSINESS_PROFILE from "@/config/business-profile";
import { OrderRecord } from "@/services/order.service";
import { CommercialDocument } from "@/types/b2b";
import { deduplicateMediaUrls, getCanonicalMediaKey } from "@/lib/media";
import { OFFICIAL_AYC_SITE_LOGO_DATA_URL, OFFICIAL_AYC_SITE_LOGO_PATH } from "@/lib/site-logo";
import {
  extractProductSpecifications,
  extractProductSpecificationTiles,
  extractProductLogistics,
  extractProductPricingTiers,
  cleanOfferSheetProductTitle,
  normalizeOfferSheetUnicode,
  CONSOLIDATED_OFFER_SHEET_COMMERCIAL_TERMS,
  lookupProductRecord,
  buildOfferSheetData,
  OfferSheetData,
} from "@/lib/offer-sheet";

/**
 * Robust caller for jspdf-autotable across different bundler module resolutions.
 */
function applyAutoTable(doc: jsPDF, options: any) {
  if (typeof autoTable === "function") {
    autoTable(doc, options);
  } else if ((autoTable as any)?.default && typeof (autoTable as any).default === "function") {
    (autoTable as any).default(doc, options);
  } else if (typeof (doc as any).autoTable === "function") {
    (doc as any).autoTable(options);
  } else {
    console.error("jspdf-autotable could not be invoked.");
  }
}

/**
 * Format currency in USD without invented decimals
 */
function fmtUSD(num: number | undefined | null): string {
  if (num === null || num === undefined || isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date nicely
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  } catch {
    return dateStr;
  }
}

/**
 * Helper to compute 30 days from date
 */
function getExpiryDate(dateStr?: string): string {
  const base = dateStr ? new Date(dateStr) : new Date();
  const valid = isNaN(base.getTime()) ? new Date() : base;
  valid.setDate(valid.getDate() + 30);
  return valid.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const imageDataUrlCache = new Map<string, string>();

/**
 * Helper to safely load image data URL in browser environment for jsPDF embedding.
 * Sized appropriately for PDF display physical dimensions (480px max dimension)
 * and cached in memory to avoid repeated network decoding or large memory buffers.
 */
export async function loadImageAsDataUrl(url?: string): Promise<string | null> {
  if (!url || typeof window === "undefined") return null;
  if (imageDataUrlCache.has(url)) return imageDataUrlCache.get(url)!;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 480; // High resolution on 40mm PDF cell (~300 DPI) while keeping payload < 30KB
          let w = img.naturalWidth || img.width || 400;
          let h = img.naturalHeight || img.height || 400;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.max(1, Math.round((h * MAX_DIM) / w));
              w = MAX_DIM;
            } else {
              w = Math.max(1, Math.round((w * MAX_DIM) / h));
              h = MAX_DIM;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            imageDataUrlCache.set(url, dataUrl);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Fallback if canvas tainted
        }
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Formats package breakdown into a concise, readable representation
 */
function formatPackageBreakdownText(
  breakdown?: any,
  moq?: number
): string {
  if (!breakdown) {
    return `${moq || 10} pcs standard export assortment`;
  }
  if (typeof breakdown === "string") return breakdown;

  if (Array.isArray(breakdown)) {
    const items = breakdown
      .filter((b) => b && (b.quantity || b.qty || b.count))
      .map((b) => {
        const color = b.color ? `${b.color} ` : "";
        const size = b.size ? `${b.size}` : "";
        const qty = b.quantity || b.qty || b.count || 0;
        return `${color}${size}: ${qty}`.trim();
      });
    if (items.length > 0) {
      return items.join(" • ");
    }
  }

  if (typeof breakdown === "object") {
    const entries = Object.entries(breakdown);
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(" • ");
    }
  }

  return `${moq || 10} pcs standard assortment`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT INFORMATION HEADER / REFERENCE BAR (NON-OVERLAPPING GRID)
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentInformationField {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: [number, number, number];
}

export interface DrawDocumentInformationHeaderOptions {
  startY: number;
  margin?: number;
  contentWidth?: number;
  columns?: number;
  fillColor?: [number, number, number];
  borderColor?: [number, number, number];
  fields: DocumentInformationField[];
}

export interface DrawDocumentInformationHeaderResult {
  finalY: number;
  boxHeight: number;
}

/**
 * Draws a multi-column document information header (Reference Bar) with
 * robust column isolation, explicit gutters, dynamic multi-line wrapping,
 * and automatic vertical height expansion so that text NEVER collides horizontally
 * or clips vertically.
 */
export function drawDocumentInformationHeader(
  doc: jsPDF,
  options: DrawDocumentInformationHeaderOptions
): DrawDocumentInformationHeaderResult {
  const margin = options.margin ?? 14;
  const contentWidth =
    options.contentWidth ?? (doc.internal.pageSize.getWidth() - margin * 2);
  const columns = options.columns && options.columns > 0 ? options.columns : 3;
  const fillColor = options.fillColor ?? [248, 250, 252];
  const borderColor = options.borderColor ?? [226, 232, 240];
  const fields = options.fields || [];

  if (fields.length === 0) {
    return { finalY: options.startY, boxHeight: 0 };
  }

  const paddingX = 4;
  const paddingY = 3.5;
  const gutter = 5.5;
  const rowGap = 3.5;
  const labelFontSize = 6.5;
  const valueFontSize = 7.5;
  const labelLineHeight = 3.0;
  const valueLineHeight = 3.5;
  const labelToValueGap = 1.2;

  // Available width for each column strictly bounded inside contentWidth
  const totalGutters = (columns - 1) * gutter;
  const colWidth = Math.max(
    10,
    (contentWidth - paddingX * 2 - totalGutters) / columns
  );
  // Safe text wrap width with 1.2mm margin to guarantee zero horizontal collision
  const safeTextWidth = Math.max(8, colWidth - 1.2);

  // Group fields into rows of `columns`
  const rows: DocumentInformationField[][] = [];
  for (let i = 0; i < fields.length; i += columns) {
    rows.push(fields.slice(i, i + columns));
  }

  // Pre-calculate wrapped lines and row heights
  const rowWrappedData = rows.map((row) => {
    return row.map((field) => {
      // 1. Wrap label safely
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      const labelStr = String(field.label ?? "").toUpperCase();
      const labelLines: string[] = doc.splitTextToSize(labelStr, safeTextWidth);

      // 2. Wrap value safely using the exact font family, size & weight used for drawing
      doc.setFont("helvetica", "bold");
      doc.setFontSize(valueFontSize);
      const valStr = String(field.value ?? "—").trim() || "—";
      const valueLines: string[] = doc.splitTextToSize(valStr, safeTextWidth);

      const cellHeight =
        labelLines.length * labelLineHeight +
        labelToValueGap +
        valueLines.length * valueLineHeight;

      return {
        field,
        labelLines,
        valueLines,
        cellHeight,
      };
    });
  });

  const rowHeights = rowWrappedData.map((row) => {
    return Math.max(10, ...row.map((item) => item.cellHeight));
  });

  const totalInnerHeight =
    rowHeights.reduce((sum, h) => sum + h, 0) +
    Math.max(0, rows.length - 1) * rowGap;
  const boxHeight = totalInnerHeight + paddingY * 2;

  // 1. Draw background container box
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, options.startY, contentWidth, boxHeight, 1.5, 1.5, "FD");

  // 2. Render each row's fields with strict horizontal bounds and stacked labels/values
  let currentY = options.startY + paddingY;

  rowWrappedData.forEach((row, rowIdx) => {
    const rowHeight = rowHeights[rowIdx];

    row.forEach((item, colIdx) => {
      const colX = margin + paddingX + colIdx * (colWidth + gutter);

      // Label (Uppercase, Slate-500, Bold 6.5pt)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      doc.setTextColor(100, 116, 139);
      item.labelLines.forEach((lText: string, lIdx: number) => {
        doc.text(lText, colX, currentY + 2.4 + lIdx * labelLineHeight);
      });

      // Value (Wrapped within safeTextWidth, Bold 7.5pt)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(valueFontSize);
      if (item.field.highlight) {
        const c = item.field.valueColor ?? [194, 65, 12]; // orange-700
        doc.setTextColor(c[0], c[1], c[2]);
      } else {
        const c = item.field.valueColor ?? [30, 41, 59]; // slate-800
        doc.setTextColor(c[0], c[1], c[2]);
      }

      const valStartY =
        currentY +
        2.4 +
        item.labelLines.length * labelLineHeight +
        labelToValueGap;

      item.valueLines.forEach((vText: string, vIdx: number) => {
        doc.text(vText, colX, valStartY + vIdx * valueLineHeight);
      });
    });

    currentY += rowHeight + rowGap;
  });

  return {
    finalY: options.startY + boxHeight,
    boxHeight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OFFER SHEET PDF GENERATOR (Product-Level, STRICTLY ZERO SHIPPING INFO)
// ─────────────────────────────────────────────────────────────────────────────

export interface OfferSheetProductInput {
  id?: string;
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  categoryId?: string;
  audience?: string;
  price: number;
  moq?: number;
  fabric?: string;
  gsm?: number | string;
  fit?: string;
  composition?: string;
  sizes?: string[] | string;
  color?: string | string[];
  colors?: string[];
  packagingSpecs?: string;
  packageBreakdown?: any;
  leadTimeDays?: number;
  pricingTiers?: any[];
  imageUrl?: string;
  image?: string;
  images?: string[];
  imageDataUrl?: string | null;
  galleryDataUrls?: string[];
  logoDataUrl?: string | null;
  cartonDimensions?: { length: number; width: number; height: number; unit?: string };
  grossWeight?: number | string;
  netWeight?: number | string;
  cbm?: number | string;
  weight?: string | number;
  wholesalePrice?: number;
  bulkPricingEnabled?: boolean;
  bulkPrice?: number;
  bulkThreshold?: number;
  fullStockPrice?: number;
  availableStock?: number;
  shippingPackageProfiles?: any;
  designType?: string;
  material?: string;
  sizeDescription?: string;
  colourDescription?: string;
  [key: string]: any;
}

/**
/**
 * Generates an authoritative vector A4 PDF Offer Sheet matching the preview exactly.
 * Invariant: Product-based ONLY. Never contains buyer/customer info or freight charges.
 * Free of fabricated specifications (no GSM, no fake certifications).
 * Includes complete Pricing Schedule (Standard, Bulk, Full Stock).
 * Modestly larger product image gallery.
 * Consolidated COMMERCIAL TERMS (no ISO99).
 */
export function generateOfferSheetPDFDoc(
  offerData: OfferSheetData,
  options?: {
    existingDoc?: jsPDF;
    pageIndex?: number;
    totalPages?: number;
    logoDataUrl?: string | null;
  }
): jsPDF {
  const doc =
    options?.existingDoc ||
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

  if (options?.existingDoc && (options?.pageIndex === undefined || options?.pageIndex > 1)) {
    doc.addPage();
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const pageBottomSafeY = 268; // Safe boundary leaving >20mm clearance before footer (289mm)
  let y = margin;

  const printContinuationHeader = (subtitle?: string) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, "FD");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const titleText = subtitle
      ? `OFFER SHEET • ${subtitle} • Ref: ${offerData.docNumber}`
      : `OFFER SHEET • Ref: ${offerData.docNumber} (Continued)`;
    doc.text(titleText, margin + 4, y + 4.8);
    y += 11;
  };

  // 1. Compact Header: No Company Information (Orange OFFER SHEET heading on top right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(234, 88, 12); // Brand Orange #ea580c
  const headerTitle = "OFFER SHEET";
  doc.text(headerTitle, pageWidth - margin, y + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("DIRECT MANUFACTURER OFFER", pageWidth - margin, y + 10.5, { align: "right" });

  y += 14;

  // 2. Metadata Card (Reference, Date, Validity) - Product-based, strictly NO customer/buyer data
  const offerHeaderResult = drawDocumentInformationHeader(doc, {
    startY: y,
    margin,
    contentWidth,
    columns: 3,
    fillColor: [248, 250, 252],
    borderColor: [226, 232, 240],
    fields: [
      { label: "Offer Reference", value: offerData.docNumber },
      { label: "Date of Issue", value: offerData.date },
      {
        label: "Validity",
        value: offerData.validUntil || "7 Days from date of issuance",
        highlight: true,
        valueColor: [194, 65, 12],
      },
    ],
  });

  y = offerHeaderResult.finalY + 5;

  const effectiveLogoDataUrl = options?.logoDataUrl || OFFICIAL_AYC_SITE_LOGO_DATA_URL;

  // 3. Render Each Product in Offer Sheet
  for (let pIdx = 0; pIdx < offerData.products.length; pIdx++) {
    const product = offerData.products[pIdx];
    const unitLabel = product.unit
      ? product.unit.toLowerCase() === "pcs"
        ? "pc"
        : product.unit.toLowerCase()
      : "pc";

    // If subsequent product and not enough vertical space, start on a fresh page
    if (pIdx > 0 && y + 90 > pageBottomSafeY) {
      doc.addPage();
      y = margin;
      printContinuationHeader();
    }

    // 3. Product Title, Brand Identifier, and SKU (Distinct hierarchy, target 17pt)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);
    const cleanProdName = normalizeOfferSheetUnicode(product.name);
    const splitTitle = doc.splitTextToSize(cleanProdName, contentWidth);

    // Ensure product title block fits comfortably before page bottom
    if (y + splitTitle.length * 7 + 25 > pageBottomSafeY) {
      doc.addPage();
      y = margin;
      printContinuationHeader();
    }

    doc.text(splitTitle, margin, y + 5);
    y += splitTitle.length * 7 + 2;

    // Brand and SKU in a clean separate metadata row (no overlapping arrows, explicit gap)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(234, 88, 12); // Brand Orange
    const brandStr = normalizeOfferSheetUnicode(product.brand || "AYAAN CLOTHING").toUpperCase();
    doc.text(brandStr, margin, y);
    const brandWidth = doc.getTextWidth(brandStr);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("  •  ", margin + brandWidth, y);
    const sepWidth = doc.getTextWidth("  •  ");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("SKU: ", margin + brandWidth + sepWidth, y);
    const skuLabelWidth = doc.getTextWidth("SKU: ");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(normalizeOfferSheetUnicode(product.sku), margin + brandWidth + sepWidth + skuLabelWidth, y);
    y += 7.5;

    // 4. Product Gallery — Four Images Per Row, plain background, contain-style scaling
    const galleryImages = product.images || [];

    if (galleryImages.length === 0) {
      if (y + 20 > pageBottomSafeY) {
        doc.addPage();
        y = margin;
        printContinuationHeader();
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("PRODUCT GALLERY", margin, y);
      y += 4;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("No product images available.", margin + 4, y + 7.5);
      y += 16;
    } else {
      // Exactly 4 columns per row with Storefront 4:5 portrait card ratio (Width:Height = 4:5 => Height = Width * 1.25)
      const cols = 4;
      const gap = 2.5;
      const tileW = (contentWidth - (cols - 1) * gap) / cols;
      const tileH = tileW * 1.25;

      // Ensure gallery heading + first row fit together
      if (y + 10 + tileH > pageBottomSafeY) {
        doc.addPage();
        y = margin;
        printContinuationHeader();
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("PRODUCT GALLERY", margin, y);
      y += 4.5;

      for (let i = 0; i < galleryImages.length; i += cols) {
        const row = galleryImages.slice(i, i + cols);

        // Move entire complete row to next page when it cannot fit within safe content area
        if (y + tileH > pageBottomSafeY) {
          doc.addPage();
          y = margin;
          printContinuationHeader();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text("PRODUCT GALLERY (CONTINUED)", margin, y);
          y += 4.5;
        }

        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const imgData = row[colIdx];
          const tileX = margin + colIdx * (tileW + gap);
          const tileY = y;

          // Draw card background and subtle border matching approved styling
          doc.setFillColor(244, 246, 249);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.roundedRect(tileX, tileY, tileW, tileH, 1.2, 1.2, "FD");

          const padding = 1.0;
          const innerW = tileW - padding * 2;
          const innerH = tileH - padding * 2;
          const innerX = tileX + padding;
          const innerY = tileY + padding;

          try {
            const props = (doc as any).getImageProperties(imgData);
            const imgRatio = (props?.width || 1) / (props?.height || 1);
            let drawW = innerW;
            let drawH = drawW / imgRatio;
            if (drawH > innerH) {
              drawH = innerH;
              drawW = drawH * imgRatio;
            }
            const drawX = innerX + (innerW - drawW) / 2;
            const drawY = innerY + (innerH - drawH) / 2;
            doc.addImage(imgData, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");
          } catch {
            try {
              doc.addImage(imgData, "JPEG", innerX, innerY, innerW, innerH, undefined, "FAST");
            } catch {
              // safe fallback
            }
          }

          const logoInset = 1.2;
          const logoSize = 4.2;
          const logoX = tileX + tileW - logoInset - logoSize;
          const logoY = tileY + logoInset;

          if (effectiveLogoDataUrl) {
            try {
              doc.addImage(effectiveLogoDataUrl, "PNG", logoX, logoY, logoSize, logoSize, "AYC_LOGO", "FAST");
            } catch {
              try {
                doc.addImage(effectiveLogoDataUrl, logoX, logoY, logoSize, logoSize, "AYC_LOGO", "FAST");
              } catch {}
            }
          }
        }

        y += tileH + gap;
      }

      y += 3;
    }

    // 5. Product Specifications (Natural Flow)
    if (y + 35 > pageBottomSafeY) {
      doc.addPage();
      y = margin;
      printContinuationHeader();
    }

    const isMissingVal = (v: any): boolean => {
      if (v === undefined || v === null) return true;
      const s = String(v).trim();
      return (
        !s ||
        s === "—" ||
        s === "-" ||
        s === "–" ||
        s.toLowerCase() === "n/a" ||
        s.toLowerCase() === "in description" ||
        s.toLowerCase() === "not configured" ||
        s.toLowerCase() === "see description"
      );
    };

    const specRows: string[][] = [];
    if (!isMissingVal(product.brand)) specRows.push(["Brand", String(product.brand).trim()]);
    if (!isMissingVal(product.specificationTiles?.colour)) specRows.push(["Colours", String(product.specificationTiles?.colour).trim()]);
    if (!isMissingVal(product.specificationTiles?.size)) specRows.push(["Available Sizes", String(product.specificationTiles?.size).trim()]);
    if (!isMissingVal(product.specificationTiles?.material)) specRows.push(["Fabric / Composition", String(product.specificationTiles?.material).trim()]);
    if (!isMissingVal(product.specificationTiles?.designType)) specRows.push(["Design Type", String(product.specificationTiles?.designType).trim()]);

    if (specRows.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("PRODUCT SPECIFICATIONS", margin, y);
      y += 4;

      applyAutoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        body: specRows,
        theme: "plain",
        styles: {
          fontSize: 7.8,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
          lineColor: [226, 232, 240],
          lineWidth: 0.25,
        },
        columnStyles: {
          0: {
            cellWidth: 46,
            fontStyle: "bold",
            textColor: [71, 85, 105],
            fillColor: [248, 250, 252],
          },
          1: {
            cellWidth: contentWidth - 46,
            fontStyle: "normal",
            textColor: [15, 23, 42],
            fillColor: [255, 255, 255],
          },
        },
      });

      y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : y + 26;
    }

    // 6. Pricing Schedule Table
    if (y + 20 > pageBottomSafeY) {
      doc.addPage();
      y = margin;
      printContinuationHeader();
    }

    const pricingRows: string[][] = (product.pricingTiers || []).map((t: any) => [
      t.tierName,
      t.quantityBasis,
      `${fmtUSD(t.unitPrice)} / ${unitLabel}`,
      t.totalPrice !== null ? `${fmtUSD(t.totalPrice)} USD` : "—",
    ]);

    applyAutoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Pricing Tier", "Minimum Quantity / Basis", "Unit Price (USD)", "Total Price (USD)"]],
      body:
        pricingRows.length > 0
          ? pricingRows
          : [["Standard", `Per ${product.unit || "PCS"} (Minimum Order)`, "$0.00", "—"]],
      theme: "striped",
      showHead: "everyPage",
      pageBreak: "auto",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 56 },
        2: { cellWidth: 45, fontStyle: "bold", textColor: [15, 23, 42], halign: "right" },
        3: { cellWidth: 45, fontStyle: "bold", textColor: [194, 65, 12], halign: "right" },
      },
      didParseCell: (data: any) => {
        if (data.column.index === 2 || data.column.index === 3) {
          data.cell.styles.halign = "right";
        }
      },
    });

    y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 26;
  }

  // Dynamic Footer and Subtle Border Outline on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Border stroke removed per commercial audit, retaining exact 7mm geometry
    // Clean, unbranded footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    const pgIndex =
      options?.pageIndex !== undefined && options?.totalPages !== undefined
        ? options.pageIndex + (i - 1)
        : i;
    const pgTotal =
      options?.totalPages !== undefined ? options.totalPages : pageCount;
    doc.text(
      `Offer Sheet Reference: ${offerData.docNumber} • Generated on ${new Date().toISOString().slice(0, 10)} • Page ${pgIndex} of ${pgTotal}`,
      margin,
      297 - 8
    );
  }

  return doc;
}

/**
 * Generates an official vector A4 PDF Offer Sheet for a single product.
 * Invariant: NEVER contains shipping information or freight quotes.
 */
export function generateProductOfferSheetDoc(
  product: OfferSheetProductInput,
  buyerInfo?: {
    name?: string;
    company?: string;
    email?: string;
    country?: string;
    exporter?: any;
    orderNumber?: string;
    order_number?: string;
    shippingArrangement?: string;
    shipping_arrangement?: string;
    deliveryTerms?: string;
    paymentTerms?: string;
    payment_terms?: string;
    [key: string]: any;
  },
  selectedQty?: number,
  existingDoc?: jsPDF,
  pageIndex?: number,
  totalPages?: number
): jsPDF {
  const exp = buyerInfo?.exporter || (product as any).exporter;
  const signatoryTitle = exp?.signatory_title || "Authorized Representative";
  const signatoryDivision = exp?.signatory_division || "Ayaan Clothing Ltd • Dhaka, Bangladesh";

  const offerData = buildOfferSheetData({
    ...product,
    name: product.name || (product as any).title,
    exporter: {
      ...exp,
      signatory_title: exp?.signatory_title || signatoryTitle,
      signatory_division: exp?.signatory_division || signatoryDivision,
    },
  });

  // If specific galleryDataUrls or imageDataUrl/imageUrl were provided on product, assign to product 0
  if (offerData.products.length > 0) {
    const rawList: string[] = [];
    if (product.imageDataUrl) rawList.push(product.imageDataUrl);
    if (product.imageUrl) rawList.push(product.imageUrl);
    if (product.image) rawList.push(product.image);
    if (product.galleryDataUrls) rawList.push(...product.galleryDataUrls);
    if (product.images) rawList.push(...product.images);
    if (rawList.length > 0) {
      offerData.products[0].images = deduplicateMediaUrls(rawList);
    }
  }

  return generateOfferSheetPDFDoc(offerData, {
    existingDoc,
    pageIndex,
    totalPages,
    logoDataUrl: product.logoDataUrl || undefined,
  });
}

/**
 * Trigger download of Offer Sheet PDF in browser (asynchronously loads image gallery if available).
 */
export async function downloadProductOfferSheetPDF(
  product: OfferSheetProductInput,
  buyerInfo?: {
    name?: string;
    company?: string;
    email?: string;
    country?: string;
    exporter?: any;
    orderNumber?: string;
    order_number?: string;
    shippingArrangement?: string;
    shipping_arrangement?: string;
    deliveryTerms?: string;
    paymentTerms?: string;
    payment_terms?: string;
    [key: string]: any;
  },
  selectedQty?: number
) {
  // Canonical Path: Stream backend pre-generated and compressed Offer Sheet
  if (product.id && typeof window !== "undefined") {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const forceParam = attempt === 2 ? "&force=1" : "";
        const res = await fetch(`${apiUrl}/products/${product.id}/offer-sheet?download=1${forceParam}`, {
          headers: { Accept: "application/pdf" },
        });

        if (res.ok && res.headers.get("content-type")?.includes("application/pdf")) {
          const blob = await res.blob();
          if (blob.size > 0) {
            const cleanSku = (product.sku || product.name || "garment")
              .replace(/[^a-zA-Z0-9_-]/g, "_")
              .slice(0, 30);
            const filename = `AYAAN_Offer_Sheet_${cleanSku}.pdf`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return;
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.message || `Offer Sheet download failed with status HTTP ${res.status}`);
        }
      } catch (e: any) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    // Do NOT silently produce a divergent client-side document for published products
    console.error("[AYC] Authoritative Offer Sheet download failed:", lastError);
    throw (
      lastError ||
      new Error(`Unable to download the official Offer Sheet for product "${product.name || product.sku}". Please retry.`)
    );
  }
  // Collect all available image sources for gallery: primary first, followed by secondary images
  let imageSources: string[] = [];
  const primarySrc = product.imageUrl || product.image;
  if (primarySrc && typeof primarySrc === "string" && primarySrc.trim().length > 0) {
    imageSources.push(primarySrc);
  }
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && typeof img === "string" && img.trim().length > 0) {
        imageSources.push(img);
      }
    });
  }

  // Deduplicate before loading data URLs
  imageSources = deduplicateMediaUrls(imageSources);

  // Enrich with authoritative product details (complete pricing tiers, specifications, logistics, images)
  if (product.id || product.sku || product.name) {
    try {
      const { getProductBySlugOrId } = await import("@/lib/services/products");
      const authoritativeProduct = await getProductBySlugOrId(product.id || product.sku || product.name);
      if (authoritativeProduct) {
        product = {
          ...authoritativeProduct,
          ...product,
          moq: authoritativeProduct.moq ?? product.moq,
          wholesalePrice: authoritativeProduct.wholesalePrice ?? product.wholesalePrice,
          bulkPricingEnabled: authoritativeProduct.bulkPricingEnabled ?? product.bulkPricingEnabled,
          bulkPrice: authoritativeProduct.bulkPrice ?? product.bulkPrice,
          bulkThreshold: authoritativeProduct.bulkThreshold ?? product.bulkThreshold,
          fullStockPrice: authoritativeProduct.fullStockPrice ?? product.fullStockPrice,
          availableStock: authoritativeProduct.availableStock ?? product.availableStock,
          pricingTiers: authoritativeProduct.pricingTiers ?? product.pricingTiers,
          shippingPackageProfiles: authoritativeProduct.shippingPackageProfiles ?? product.shippingPackageProfiles,
          cbm: (authoritativeProduct as any).cbm ?? product.cbm,
          grossWeight: (authoritativeProduct as any).grossWeight ?? product.grossWeight,
          designType: authoritativeProduct.designType ?? product.designType,
          material: authoritativeProduct.material ?? product.material,
          sizeDescription: authoritativeProduct.sizeDescription ?? product.sizeDescription,
          colourDescription: authoritativeProduct.colourDescription ?? product.colourDescription,
        };
        if (authoritativeProduct.images && authoritativeProduct.images.length > 0) {
          const combined = [
            authoritativeProduct.images[0] || imageSources[0],
            ...authoritativeProduct.images,
            ...imageSources,
          ];
          imageSources = deduplicateMediaUrls(combined);
        }
      }
    } catch {
      // Fallback: check mockStore
      try {
        const { mockStore } = await import("@/lib/mock-data/mock-store");
        const found = mockStore.getProducts().find(
          (p) =>
            (product.sku && p.sku?.toUpperCase() === product.sku.toUpperCase()) ||
            (product.name && p.name.toLowerCase() === product.name.toLowerCase())
        );
        if (found) {
          product = {
            ...found,
            ...product,
            moq: found.moq ?? product.moq,
            wholesalePrice: found.wholesalePrice ?? product.wholesalePrice,
            bulkPricingEnabled: found.bulkPricingEnabled ?? product.bulkPricingEnabled,
            bulkPrice: found.bulkPrice ?? product.bulkPrice,
            bulkThreshold: found.bulkThreshold ?? product.bulkThreshold,
            fullStockPrice: found.fullStockPrice ?? product.fullStockPrice,
            availableStock: found.availableStock ?? product.availableStock,
            pricingTiers: found.pricingTiers ?? product.pricingTiers,
            shippingPackageProfiles: (found as any).shippingPackageProfiles ?? (product as any).shippingPackageProfiles,
            cbm: (found as any).cbm ?? (product as any).cbm,
            grossWeight: (found as any).grossWeight ?? (product as any).grossWeight,
            designType: (found as any).designType ?? (product as any).designType,
            material: (found as any).material ?? (product as any).material,
            sizeDescription: (found as any).sizeDescription ?? (product as any).sizeDescription,
            colourDescription: (found as any).colourDescription ?? (product as any).colourDescription,
          };
          if (found.images && found.images.length > 0) {
            const combined = [
              found.images[0] || imageSources[0],
              ...found.images,
              ...imageSources,
            ];
            imageSources = deduplicateMediaUrls(combined);
          }
        }
      } catch {}
    }
  }

  let galleryDataUrls: string[] = [];
  if (product.galleryDataUrls && product.galleryDataUrls.length > 0) {
    galleryDataUrls = deduplicateMediaUrls(product.galleryDataUrls);
  } else if (imageSources.length > 0) {
    const loaded = await Promise.all(
      imageSources.map((s) => loadImageAsDataUrl(s))
    );
    galleryDataUrls = loaded.filter((u): u is string => Boolean(u));
  }

  const mainDataUrl = product.imageDataUrl || (galleryDataUrls.length > 0 ? galleryDataUrls[0] : null);

  // Load official website logo data URL
  let logoDataUrl = product.logoDataUrl || null;
  if (!logoDataUrl) {
    logoDataUrl = (await loadImageAsDataUrl(OFFICIAL_AYC_SITE_LOGO_PATH)) || OFFICIAL_AYC_SITE_LOGO_DATA_URL;
  }

  const doc = generateProductOfferSheetDoc(
    {
      ...product,
      imageDataUrl: mainDataUrl,
      galleryDataUrls,
      logoDataUrl: logoDataUrl || OFFICIAL_AYC_SITE_LOGO_DATA_URL,
    },
    buyerInfo,
    selectedQty
  );
  const cleanSku = (product.sku || product.name || "garment")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);
  const filename = `AYAAN_Offer_Sheet_${cleanSku}.pdf`;
  doc.save(filename);
}

interface CachedCombinedOfferSheetsArtifact {
  blob: Blob;
  filename: string;
  fingerprint: string;
}

const combinedOfferSheetsCache = new Map<string, CachedCombinedOfferSheetsArtifact>();

export function clearCombinedOfferSheetsCache(orderKey?: string) {
  if (orderKey) {
    combinedOfferSheetsCache.delete(orderKey);
  } else {
    combinedOfferSheetsCache.clear();
  }
}

/**
 * Trigger download of a combined Offer Sheets PDF containing multiple products.
 * Reuses validated cached PDF artifact for repeated downloads to make repeat requests instant.
 */
export async function downloadCombinedProductOfferSheetsPDF(
  order: OrderRecord,
  buyerInfo?: { name?: string; company?: string; email?: string; country?: string }
) {
  if (!order.items || order.items.length === 0) return;

  const orderKey = String(order.id || order.order_number || "order");
  const fingerprint = `${orderKey}_${order.updated_at || order.created_at || ""}_${order.total_amount || ""}_${order.items.length}_${order.items.map((it) => `${it.sku || it.product_name}-${it.quantity}`).join("_")}`;

  const cached = combinedOfferSheetsCache.get(orderKey);
  if (cached && cached.fingerprint === fingerprint) {
    if (typeof document !== "undefined") {
      const url = URL.createObjectURL(cached.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cached.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
  }

  // Canonical Path: Retrieve backend merged canonical Offer Sheets
  if (order.items && order.items.length > 0 && typeof window !== "undefined") {
    const productIds = order.items
      .map((it: any) => it.product_id)
      .filter((id: any): id is number => typeof id === "number" && id > 0);

    if (productIds.length > 0) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
      let lastBulkError: Error | null = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const forceParam = attempt === 2 ? "?force=1" : "";
          const res = await fetch(`${apiUrl}/products/bulk-offer-sheet?download=1${forceParam}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/pdf",
            },
            body: JSON.stringify({ product_ids: productIds }),
          });

          if (res.ok && res.headers.get("content-type")?.includes("application/pdf")) {
            const blob = await res.blob();
            if (blob.size > 0) {
              const filename = `AYAAN_CLOTHING_Offer_Sheets_${order.order_number || "ORDER"}.pdf`;
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              return;
            }
          } else {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson?.message || `Bulk Offer Sheet merge failed with status HTTP ${res.status}`);
          }
        } catch (e: any) {
          lastBulkError = e instanceof Error ? e : new Error(String(e));
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }

      console.error("[AYC] Authoritative Bulk Offer Sheet merge failed:", lastBulkError);
      throw (
        lastBulkError ||
        new Error(`Unable to prepare combined Offer Sheets for Order ${order.order_number || ""}. Please retry.`)
      );
    }
  }

  let doc: jsPDF | undefined;
  const totalItems = order.items.length;

  for (let i = 0; i < totalItems; i++) {
    const item = order.items[i];
    
    let imageSources: string[] = [];
    const imageSource = item.product_image_url || null;
    if (imageSource && typeof imageSource === "string" && imageSource.trim().length > 0) {
      imageSources.push(imageSource);
    }
    if (item.product_images && item.product_images.length > 0) {
      item.product_images.forEach((img: string) => {
        if (img && typeof img === "string" && img.trim().length > 0) {
          imageSources.push(img);
        }
      });
    }

    imageSources = deduplicateMediaUrls(imageSources);

    // Enrich with authoritative product details if available
    const itemProductId = (item as any).product_id || item.sku || item.product_name;
    let authProduct: any = null;
    if (itemProductId) {
      try {
        const { getProductBySlugOrId } = await import("@/lib/services/products");
        authProduct = await getProductBySlugOrId(itemProductId);
      } catch {}
      if (!authProduct) {
        try {
          const { mockStore } = await import("@/lib/mock-data/mock-store");
          authProduct = mockStore.getProducts().find(
            (p) =>
              (item.sku && p.sku?.toUpperCase() === item.sku.toUpperCase()) ||
              (item.product_name && p.name.toLowerCase() === item.product_name.toLowerCase())
          );
        } catch {}
      }
      if (authProduct && authProduct.images && authProduct.images.length > 0) {
        const combined = [
          authProduct.images[0] || imageSources[0],
          ...authProduct.images,
          ...imageSources,
        ];
        imageSources = deduplicateMediaUrls(combined);
      }
    }

    const loadedUrls = await Promise.all(
      imageSources.map((s) => loadImageAsDataUrl(s))
    );
    const galleryDataUrls = loadedUrls.filter((u): u is string => Boolean(u));
    const mainDataUrl = galleryDataUrls[0] || (imageSource ? await loadImageAsDataUrl(imageSource) : null);

    const logoDataUrl = (await loadImageAsDataUrl(OFFICIAL_AYC_SITE_LOGO_PATH)) || OFFICIAL_AYC_SITE_LOGO_DATA_URL;

    const productInput: OfferSheetProductInput = {
      ...(authProduct || {}),
      name: item.product_name || authProduct?.name || "Garment",
      sku: item.sku || authProduct?.sku,
      price: authProduct?.wholesalePrice ?? item.unit_price ?? 0,
      wholesalePrice: authProduct?.wholesalePrice ?? item.unit_price ?? 0,
      moq: authProduct?.moq ?? item.quantity,
      bulkPricingEnabled: authProduct?.bulkPricingEnabled,
      bulkPrice: authProduct?.bulkPrice,
      bulkThreshold: authProduct?.bulkThreshold,
      fullStockPrice: authProduct?.fullStockPrice,
      availableStock: authProduct?.availableStock,
      pricingTiers: authProduct?.pricingTiers,
      shippingPackageProfiles: authProduct?.shippingPackageProfiles,
      cbm: authProduct?.cbm,
      grossWeight: authProduct?.grossWeight,
      designType: authProduct?.designType,
      material: authProduct?.material,
      sizeDescription: authProduct?.sizeDescription,
      colourDescription: authProduct?.colourDescription,
      imageUrl: imageSource || undefined,
      images: imageSources,
      imageDataUrl: mainDataUrl,
      galleryDataUrls,
      logoDataUrl,
      packageBreakdown: item.package_breakdown || (item as any).packageBreakdown,
    };

    doc = generateProductOfferSheetDoc(
      productInput,
      buyerInfo,
      item.quantity,
      doc,
      i + 1,
      totalItems
    );
  }

  if (doc) {
    const filename = `AYAAN_CLOTHING_Offer_Sheets_${order.order_number || "ORDER"}.pdf`;
    let blob: Blob;
    try {
      const rawBlob = doc.output("blob");
      blob = rawBlob && rawBlob.size > 0 ? rawBlob : new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
    } catch {
      blob = new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
    }
    combinedOfferSheetsCache.set(orderKey, { blob, filename, fingerprint });

    if (typeof document !== "undefined") {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      doc.save(filename);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROFORMA INVOICE PDF GENERATOR (Order-Level, All Items, Conditional Shipping)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an official vector A4 PDF Proforma Invoice for an order.
 * Conditionally includes Aramex shipping or explicitly states "To be confirmed separately".
 * Zero domestic 5% tax.
 * Multi-product support with automatic multi-page overflow handling.
 */
export function generateProformaInvoiceDoc(
  order: OrderRecord,
  options?: ({ exporter?: any; bankDetails?: any; bank_details?: any; shipment_summary?: any } & Record<string, any>) | CommercialDocument
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const optExp = (options as any)?.exporter;
  const expName = optExp?.company_name || optExp?.name || BUSINESS_PROFILE.name;
  const expDesc = optExp?.tagline || optExp?.business_type || BUSINESS_PROFILE.description;
  const expEst = optExp?.est_year || BUSINESS_PROFILE.establishedYear;
  const expAddress = optExp?.address || optExp?.office_address || BUSINESS_PROFILE.address.formatted;
  const expEmail = optExp?.email || BUSINESS_PROFILE.contact.email || "sales@ayaanclothing.com";
  const expPhone = optExp?.whatsapp_display || optExp?.phone || BUSINESS_PROFILE.contact.phone;

  const optBank = (options as any)?.bankDetails || (options as any)?.bank_details;
  const bankName = optBank?.bank_name || optBank?.bankName || BUSINESS_PROFILE.banking.bankName || "Pubali Bank Limited";
  const accountTitle = optBank?.account_title || optBank?.accountTitle || optBank?.beneficiary_name || optBank?.account_name || BUSINESS_PROFILE.banking.accountTitle || "M/S AYAAN  CLOTHING";
  const accountNo = optBank?.account_no || optBank?.accountNo || optBank?.account_number || BUSINESS_PROFILE.banking.accountNo || "1788-901-044316";
  const swiftCode = optBank?.swift_code || optBank?.swiftCode || BUSINESS_PROFILE.banking.swiftCode || "PUBABDDH210";
  const bankAddress = optBank?.bank_address || optBank?.bankAddress || optBank?.branch || optBank?.branch_name || BUSINESS_PROFILE.banking.bankAddress || "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh";

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // 1. Header Background Accent Band
  doc.setFillColor(15, 23, 42); // slate-900 / dark corporate navy
  doc.rect(margin, y, contentWidth, 24, "F");

  // Header Title & Exporter info
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(expName, margin + 4, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${expDesc} • Est. ${expEst}`,
    margin + 4,
    y + 12.5
  );
  doc.text(
    `${expAddress}`,
    margin + 4,
    y + 16.5
  );
  doc.text(
    `Port of Loading: Dhaka Airport (DAC) / Chittagong Port • Web: www.ayaanclothing.com`,
    margin + 4,
    y + 20.5
  );

  // Document Badge (Preserve exact position and dimensions: x = pageWidth - margin - 56, y = y + 4, w = 52, h = 16)
  const badgeX = pageWidth - margin - 56;
  const badgeY = y + 4;
  const badgeW = 52;
  const badgeH = 16;
  doc.setFillColor(30, 58, 138); // blue-900 / dark corporate blue
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F");

  // Center title and subtitle horizontally and vertically inside the unchanged blue box
  const badgeCenterX = badgeX + badgeW / 2;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("PROFORMA INVOICE", badgeCenterX, badgeY + 6.6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text("Official PI (USD)", badgeCenterX, badgeY + 11.6, { align: "center" });

  y += 28;

  // Detect shipping type: Aramex vs Manual
  const isAramex =
    order.shipping_snapshot?.provider === "aramex" ||
    order.shipping_snapshot?.mode === "air" ||
    (Boolean(order.carrier && order.carrier.toLowerCase().includes("aramex")) && Boolean(order.shipping_cost && order.shipping_cost > 0));

  const _isManual =
    order.shipping_snapshot?.provider === "manual" ||
    order.shipping_snapshot?.mode === "manual" ||
    !isAramex;

  const shippingAmount = isAramex ? (order.shipping_cost || 0) : 0;
  const discountVal = Number(order.discount_amount || 0);
  const taxVal = 0; // Mandatory B2B Export zero-rated tax
  const merchandisePayable = Math.max(0, Number(order.subtotal || 0) - discountVal);
  const grandTotal = isAramex && shippingAmount > 0 ? merchandisePayable + shippingAmount : merchandisePayable;

  // 2. Exporter / Buyer Details (Two Columns)
  const colWidth = (contentWidth - 6) / 2;

  // Box 1: Shipper / Exporter
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, colWidth, 34, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("EXPORTER / BENEFICIARY:", margin + 3, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(expName, margin + 3, y + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(expAddress.slice(0, 45), margin + 3, y + 13.5);
  doc.text("Country of Origin: Bangladesh", margin + 3, y + 17.5);
  doc.text(`Contact: ${expEmail}`, margin + 3, y + 21.5);
  doc.text(`WhatsApp: ${expPhone}`, margin + 3, y + 25.5);
  doc.text(`Reg: ${optExp?.reg_number || optExp?.tin_number || "TRAD/DNCC/012458/2022"}`, margin + 3, y + 29.5);

  // Box 2: Consignee / Buyer
  const buyerX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(buyerX, y, colWidth, 34, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("CONSIGNEE / BUYER:", buyerX + 3, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text((order.shipping_company || order.shipping_name || "Valued Customer").slice(0, 32), buyerX + 3, y + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Attn: ${order.shipping_name || "Purchasing Manager"}`, buyerX + 3, y + 13.5);
  doc.text(`${(order.shipping_address1 || "Destination Address").slice(0, 36)}`, buyerX + 3, y + 17.5);
  const buyerDest = [order.shipping_city, order.shipping_postal_code, order.shipping_country_code || "US"].filter(Boolean).join(", ");
  doc.text(buyerDest || "International", buyerX + 3, y + 21.5);
  doc.text(`Email: ${order.email || "N/A"}`, buyerX + 3, y + 25.5);
  doc.text(`Phone: ${order.shipping_phone || "N/A"}`, buyerX + 3, y + 29.5);

  y += 37;

  // 3. Invoice Reference Bar (Robust non-overlapping Grid with dynamic height)
  const piNumber = `PI-${order.order_number}`;
  const issueDate = formatDate(order.placed_at || order.created_at);
  const validityDate = getExpiryDate(order.placed_at || order.created_at);
  const optShipment = (options as any)?.shipment_summary || (options as any)?.estimated_shipping_data || {};
  const totalCbmFormatted =
    optShipment?.total_cbm_formatted ||
    (options as any)?.total_cbm_formatted ||
    (order.shipping_snapshot?.cbm ? `${Number(order.shipping_snapshot.cbm).toFixed(4)} m³` : "Pending Package Profile");

  const totalGrossWeightFormatted =
    optShipment?.total_gross_weight_formatted ||
    (options as any)?.total_gross_weight_formatted ||
    (order.shipping_snapshot?.gross_weight ? `${Number(order.shipping_snapshot.gross_weight).toFixed(0)} KG` : "Pending Package Profile");

  const paymentTermsText =
    (options as any)?.paymentTerms ||
    (options as any)?.payment_terms ||
    "100% Advance T/T Wire";

  const headerResult = drawDocumentInformationHeader(doc, {
    startY: y,
    margin,
    contentWidth,
    columns: 3,
    fillColor: [241, 245, 249],
    borderColor: [203, 213, 225],
    fields: [
      { label: "P.I. Number", value: piNumber },
      { label: "Order Reference", value: order.order_number },
      { label: "Issue Date", value: issueDate },
      {
        label: "Validity",
        value: `30 Days (${validityDate})`,
        highlight: true,
        valueColor: [194, 65, 12],
      },
      { label: "Total CBM / Gross Weight", value: `${totalCbmFormatted} • ${totalGrossWeightFormatted}` },
      { label: "Payment Terms", value: paymentTermsText },
    ],
  });

  y = headerResult.finalY + 4;

  // 4. Multi-Product Items Table (Contains ALL order items)
  const items = order.items || [];
  const itemsRows = items.map((item, idx) => {
    const desc = item.product_name || "Garment Product";
    const sku = item.sku || `AYN-${idx + 101}`;
    const qty = `${(item.quantity || 1).toLocaleString()} pcs`;
    const uPrice = fmtUSD(item.unit_price);
    const lineTotal = fmtUSD(item.line_total || (item.unit_price || 0) * (item.quantity || 1));

    return [String(idx + 1), desc, sku, "6109.10.00", qty, uPrice, lineTotal];
  });

  applyAutoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Description of Goods", "SKU / Style", "HS Code", "Quantity", "Unit Price", "Amount (USD)"]],
    body: itemsRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 26, fontStyle: "bold" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 19, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 20, halign: "right", fontSize: 8.8 },
      6: { cellWidth: 20, halign: "right", fontStyle: "bold", fontSize: 8.8 },
    },
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : y + 45;

  // Check if we need to add a new page if remaining vertical space is tight
  if (y > 235) {
    doc.addPage();
    y = margin;
  }

  // 5. Financial Summary Block (Right) + Shipping Notice (Left)
  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const summaryWidth = 85;
  const summaryX = pageWidth - margin - summaryWidth;

  // Left side: Shipping note
  const shipTitle = "Shipping & Delivery: ";
  const shipPart1 = "Arrangements and carrier booking to be";
  const shipPart2 = "confirmed via WhatsApp or email.";
  const shipAlert = "Shipping charges are excluded from the merchandise total.";

  doc.setFontSize(8.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(shipTitle, margin, y + 4.5);
  const shipTitleW = doc.getTextWidth(shipTitle);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(shipPart1, margin + shipTitleW, y + 4.5);
  doc.text(shipPart2, margin, y + 9);

  doc.setTextColor(194, 65, 12); // amber-700 / orange accent
  doc.text(shipAlert, margin, y + 13.5);

  // Right side: Financial Totals Box
  const hasDiscount = discountVal > 0;
  const boxHeight = (isAramex ? 25 : 20) + (hasDiscount ? 4.5 : 0);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, y, summaryWidth, boxHeight, 1.5, 1.5, "FD");

  let subY = y + 4.5;
  doc.setFontSize(8.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Goods Value / Subtotal:", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.setTextColor(15, 23, 42);
  doc.text(fmtUSD(order.subtotal), summaryX + summaryWidth - 3, subY, { align: "right" });

  if (hasDiscount) {
    subY += 4.5;
    doc.setFontSize(8.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 101, 52); // green-800
    const promoLabel = order.coupon_code || order.promo_code ? `Discount (${order.coupon_code || order.promo_code}):` : "Discount Applied:";
    doc.text(promoLabel, summaryX + 3, subY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.text(`-${fmtUSD(discountVal)}`, summaryX + summaryWidth - 3, subY, { align: "right" });
  }

  if (isAramex) {
    subY += 4.5;
    doc.setFontSize(8.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Air Shipping — Aramex:", summaryX + 3, subY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(fmtUSD(shippingAmount), summaryX + summaryWidth - 3, subY, { align: "right" });
  }

  subY += 4.5;
  doc.setFontSize(8.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Shipping Charge:", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Excluded", summaryX + summaryWidth - 3, subY, { align: "right" });

  // Divider
  subY += 2.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, subY, summaryX + summaryWidth - 3, subY);

  // Grand Total
  subY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(isAramex && shippingAmount > 0 ? "TOTAL PAYABLE:" : "MERCHANDISE TOTAL:", summaryX + 3, subY);
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`${fmtUSD(grandTotal)} USD`, summaryX + summaryWidth - 3, subY, { align: "right" });

  y += boxHeight + 5;

  // 6. BENEFICIARY BANK DETAILS Block (Exact Pubali Bank Limited credentials)
  const bankBlockHeight = 25;
  if (y + bankBlockHeight + 25 > 297 - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, bankBlockHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("BENEFICIARY BANK DETAILS", margin + 3, y + 4.5);

  doc.setFontSize(8);
  // Row 1: Bank Name & Account Title
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Name:", margin + 3, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(bankName, margin + 24, y + 9.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account Title:", margin + 85, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(accountTitle, margin + 108, y + 9.5);

  // Row 2: Account No & SWIFT CODE
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account No:", margin + 3, y + 14.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(accountNo, margin + 24, y + 14.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("SWIFT CODE:", margin + 85, y + 14.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(swiftCode, margin + 108, y + 14.5);

  // Row 3: Bank Address
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Address:", margin + 3, y + 19.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(bankAddress.replace(/\n/g, ", "), margin + 24, y + 19.5);

  y += bankBlockHeight + 4;

  // 7. Signatory & Seal Block
  const sigX = pageWidth - margin - 65;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 8, sigX + 60, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(optExp?.signatory_title || "Authorized Signatory", sigX, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(optExp?.signatory_division || "Ayaan Clothing Ltd • Dhaka, Bangladesh", sigX, y + 15.5);

  // Footer & border on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Border stroke removed per commercial audit, retaining exact 7mm geometry

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AYAAN CLOTHING • Proforma Invoice Ref: ${piNumber} • Generated on ${new Date().toISOString().slice(0, 10)} • Page ${i} of ${pageCount}`,
      margin,
      297 - 6
    );
  }

  return doc;
}

/**
 * Generate official Commercial Invoice jsPDF document including verified PAYMENT DETAILS.
 */
export function generateCommercialInvoiceDoc(order: OrderRecord, commercialDoc?: CommercialDocument): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const invNumber = commercialDoc?.docNumber || `INV-${new Date().getFullYear()}-${(order.order_number || "0000").slice(-6)}`;
  const issueDate = formatDate(commercialDoc?.date || order.payment_confirmed_at || order.placed_at || order.created_at);
  const paymentDetails = commercialDoc?.payment_details || order.payment_details;

  const optExp = commercialDoc?.exporter;
  const expName = optExp?.company_name || optExp?.name || "AYAAN CLOTHING";
  const expDesc = optExp?.tagline || optExp?.business_type || "Ready-made Garments Manufacturer & Global Exporter • Dhaka, Bangladesh";
  const expAddress = optExp?.address || optExp?.office_address || "House #33, Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh";
  const expEmail = optExp?.email || "export@ayaanclothing.com";
  const expPhone = optExp?.whatsapp_display || optExp?.phone || "+880 1620-853502";
  const expReg = optExp?.tin_number || optExp?.reg_number || "BGMEA / EPB Certified Exporter";

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(expName, margin + 5, y + 8);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(expDesc, margin + 5, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text("COMMERCIAL INVOICE", pageWidth - margin - 5, y + 8, { align: "right" });

  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("PAYMENT STATUS: PAID", pageWidth - margin - 5, y + 13.5, { align: "right" });

  y += 22;

  // 2. Metadata Grid (Exporter, Buyer, Logistics)
  const metaBoxHeight = 36;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 1.5, 1.5, "FD");

  // Exporter Column
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("EXPORTER / SHIPPER:", margin + 3, y + 5);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(expName.slice(0, 36), margin + 3, y + 9);
  doc.text(expAddress.slice(0, 40), margin + 3, y + 12.5);
  doc.text("Country of Origin: Bangladesh", margin + 3, y + 16);
  doc.text(`Email: ${expEmail}`.slice(0, 36), margin + 3, y + 19.5);
  doc.text(`WhatsApp: ${expPhone}`.slice(0, 36), margin + 3, y + 23);
  doc.text(`Trade Reg: ${expReg}`.slice(0, 36), margin + 3, y + 26.5);

  // Buyer / Consignee Column
  const buyerX = margin + 65;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BUYER / CONSIGNEE:", buyerX, y + 5);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const buyerName = commercialDoc?.buyerName || order.shipping_name || "Valued Buyer";
  const buyerComp = commercialDoc?.companyName || order.shipping_company || buyerName;
  doc.text(buyerComp.slice(0, 36), buyerX, y + 9);
  doc.text(`Attn: ${buyerName}`.slice(0, 36), buyerX, y + 12.5);
  doc.text((order.shipping_address1 || commercialDoc?.buyerAddress || "Destination Address").slice(0, 36), buyerX, y + 16);
  doc.text(`${order.shipping_city || ""} ${order.shipping_postal_code || ""}, ${order.shipping_country_code || commercialDoc?.buyerCountry || "US"}`.slice(0, 36), buyerX, y + 19.5);
  doc.text(`Email: ${order.email || commercialDoc?.buyerEmail || ""}`.slice(0, 36), buyerX, y + 23);

  // Pre-calculate Total CBM and Total Gross Weight from ordered items & packaging profiles
  let totalCbm = 0;
  let totalGrossWeight = 0;
  let hasMissingPackage = false;

  for (const item of order.items || []) {
    const qty = Number(item.quantity || 0);
    const pkg = item.package_breakdown || (item as any).packageBreakdown;
    const pkgQty = Number(pkg?.package_quantity || pkg?.packageQuantity || 0);
    const cartons = Number(pkg?.cartons || pkg?.carton_count || 1);
    const cbm = Number(pkg?.cbm_per_carton || pkg?.cbm || 0);
    const weight = Number(pkg?.weight_per_carton || pkg?.gross_weight_per_carton || pkg?.gross_weight || 0);

    if (pkgQty > 0 && cbm > 0) {
      const multiplier = Math.max(1, Math.ceil(qty / pkgQty));
      const totalCartons = multiplier * cartons;
      totalCbm += totalCartons * cbm;
      totalGrossWeight += totalCartons * weight;
    } else {
      hasMissingPackage = true;
    }
  }

  const shipmentSummary = (commercialDoc as any)?.shipment_summary;
  const shipmentCbmText = shipmentSummary?.total_cbm_formatted ||
    (hasMissingPackage && totalCbm === 0 ? "Pending Package Profile" : `${totalCbm.toFixed(4)} m³`);
  const shipmentWeightText = shipmentSummary?.total_gross_weight_formatted ||
    (hasMissingPackage && totalGrossWeight === 0 ? "Pending Package Profile" : `${Math.round(totalGrossWeight)} kg`);

  // Document & Transport Parameters
  const docParamX = margin + 130;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE & SHIPMENT DETAILS:", docParamX, y + 5);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Invoice No:", docParamX, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(invNumber, docParamX + 18, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Order Ref:", docParamX, y + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(order.order_number, docParamX + 18, y + 12.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Issue Date:", docParamX, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(issueDate, docParamX + 18, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL CBM:", docParamX, y + 19.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(shipmentCbmText, docParamX + 24, y + 19.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL GROSS WT:", docParamX, y + 23);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(shipmentWeightText, docParamX + 28, y + 23);

  y += metaBoxHeight + 4;

  // 3. Items Table
  const items = order.items || [];
  const itemsRows = items.map((item, idx) => {
    const pkgText = formatPackageBreakdownText(
      item.package_breakdown || (item as any).packageBreakdown,
      item.quantity
    );
    const desc = `${item.product_name || "Garment Product"}\nAssortment: ${pkgText}`;
    const sku = item.sku || `AYN-${idx + 101}`;
    const qty = `${(item.quantity || 1).toLocaleString()} pcs`;
    const uPrice = fmtUSD(item.unit_price);
    const lineTotal = fmtUSD(item.line_total || (item.unit_price || 0) * (item.quantity || 1));

    return [String(idx + 1), desc, sku, "6109.10.00", qty, uPrice, lineTotal];
  });

  applyAutoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Description of Goods & Package Assortment", "SKU / Style", "HS Code", "Quantity", "Unit Price", "Amount (USD)"]],
    body: itemsRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 23, halign: "right" },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY || y) + 5;

  const isPaid =
    order.payment_status === "paid" ||
    order.payment_details?.payment_status === "PAID" ||
    (commercialDoc as any)?.payment_details?.payment_status === "PAID";

  const subtotal = Number(order.subtotal || 0);
  const shipping = Number(order.shipping_cost || 0);
  const discount = Number(order.discount_amount || 0);
  const grandTotal = Math.max(0, subtotal - discount + shipping);

  const rawPaid = paymentDetails?.payment_amount !== undefined
    ? Number(paymentDetails.payment_amount)
    : order.paid_amount !== undefined && Number(order.paid_amount) > 0
    ? Number(order.paid_amount)
    : isPaid
    ? grandTotal
    : 0;
  const amountPaid = Number(rawPaid);
  const balanceDue = isPaid && amountPaid >= grandTotal - 0.01 ? 0 : Math.max(0, grandTotal - amountPaid);

  const colWidth = (contentWidth - 4) / 2; // 89mm
  const sideBySideHeight = 30;

  // Pagination check for lower sections
  if (y + sideBySideHeight + 35 > 297 - margin - 8) {
    doc.addPage();
    y = margin;
  }

  // 4. Side-by-Side: Left = PAYMENT & SETTLEMENT DETAILS, Right = BENEFICIARY BANK WIRE INSTRUCTIONS
  const leftX = margin;
  const rightX = margin + colWidth + 4;

  // Left Box: PAYMENT & SETTLEMENT DETAILS
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX, y, colWidth, sideBySideHeight, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("PAYMENT & SETTLEMENT DETAILS", leftX + 3, y + 4.5);

  let py = y + 9;
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Payment Method:", leftX + 3, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDetails?.payment_method || order.payment_method || "Direct Bank Wire (TT)", leftX + 26, py);

  py += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Payment Status:", leftX + 3, py);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPaid ? 16 : 220, isPaid ? 185 : 38, isPaid ? 129 : 38);
  doc.text(isPaid ? "PAID" : (order.payment_status?.toUpperCase() || "PENDING"), leftX + 26, py);

  py += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Payer Name:", leftX + 3, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text((paymentDetails?.payer_name || buyerComp).slice(0, 32), leftX + 26, py);

  py += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Payer Bank:", leftX + 3, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text((paymentDetails?.bank_name || "Pubali Bank Limited").slice(0, 32), leftX + 26, py);

  py += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Transaction ID:", leftX + 3, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text((paymentDetails?.transaction_id || "N/A").slice(0, 32), leftX + 26, py);

  // Right Box: BENEFICIARY BANK WIRE INSTRUCTIONS
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, colWidth, sideBySideHeight, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BENEFICIARY BANK WIRE INSTRUCTIONS", rightX + 3, y + 4.5);

  const optBank = commercialDoc?.bankDetails || (commercialDoc as any)?.bank_details;
  const ciBankName = optBank?.bank_name || optBank?.bankName || BUSINESS_PROFILE.banking.bankName || "Pubali Bank Limited";
  const ciAccTitle = optBank?.account_title || optBank?.accountTitle || optBank?.beneficiary_name || optBank?.account_name || BUSINESS_PROFILE.banking.accountTitle || "M/S AYAAN CLOTHING";
  const ciAccNo = optBank?.account_no || optBank?.accountNo || optBank?.account_number || BUSINESS_PROFILE.banking.accountNo || "1788-901-044316";
  const ciSwift = optBank?.swift_code || optBank?.swiftCode || BUSINESS_PROFILE.banking.swiftCode || "PUBABDDH210";
  const ciAddress = optBank?.bank_address || optBank?.bankAddress || optBank?.branch || optBank?.branch_name || "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh";

  let by = y + 9;
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Name:", rightX + 3, by);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ciBankName.slice(0, 32), rightX + 24, by);

  by += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account Title:", rightX + 3, by);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ciAccTitle.slice(0, 32), rightX + 24, by);

  by += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account No:", rightX + 3, by);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(ciAccNo, rightX + 24, by);

  by += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("SWIFT / BIC:", rightX + 3, by);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(ciSwift, rightX + 24, by);

  by += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Address:", rightX + 3, by);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ciAddress.replace(/\n/g, ", ").slice(0, 34), rightX + 24, by);

  y += sideBySideHeight + 5;

  // 5. Financial Summary Card (Positioned clearly on the right half)
  const summaryBoxWidth = colWidth;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const hasBalanceDue = balanceDue > 0.0001;
  const summaryBoxHeight = 28 + (discount > 0 ? 4.5 : 0) + (hasBalanceDue ? 4.5 : 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryX, y, summaryBoxWidth, summaryBoxHeight, 1.5, 1.5, "FD");

  let subY = y + 4.5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Goods Value / Subtotal:", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(fmtUSD(subtotal), summaryX + summaryBoxWidth - 3, subY, { align: "right" });

  if (discount > 0) {
    subY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 101, 52);
    doc.text("Applicable Discount:", summaryX + 3, subY);
    doc.setFont("helvetica", "bold");
    doc.text(`-${fmtUSD(discount)}`, summaryX + summaryBoxWidth - 3, subY, { align: "right" });
  }

  subY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Shipping Fee (Admin Confirmed):", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.text(shipping === 0 ? "$0.00" : fmtUSD(shipping), summaryX + summaryBoxWidth - 3, subY, { align: "right" });

  subY += 4.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, subY - 1, summaryX + summaryBoxWidth - 3, subY - 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Total Payable:", summaryX + 3, subY + 2.5);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`${fmtUSD(grandTotal)} USD`, summaryX + summaryBoxWidth - 3, subY + 2.5, { align: "right" });

  subY += 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Amount Paid:", summaryX + 3, subY);
  doc.setTextColor(15, 23, 42);
  doc.text(`${fmtUSD(amountPaid)} USD`, summaryX + summaryBoxWidth - 3, subY, { align: "right" });

  if (hasBalanceDue) {
    subY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("Balance Due:", summaryX + 3, subY);
    doc.text(`${fmtUSD(balanceDue)} USD`, summaryX + summaryBoxWidth - 3, subY, { align: "right" });
  }

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AYAAN CLOTHING • Commercial Invoice Ref: ${invNumber} • Order: ${order.order_number} • Payment Status: ${isPaid ? "PAID" : "PENDING"} • Page ${i} of ${pageCount}`,
      margin,
      297 - 6
    );
  }

  return doc;
}

/**
 * Trigger immediate download of official Commercial Invoice PDF in browser.
 */
export function downloadCommercialInvoicePDF(order: OrderRecord, commercialDoc?: CommercialDocument) {
  const doc = generateCommercialInvoiceDoc(order, commercialDoc);
  const cleanOrderNum = (order.order_number || "ORDER")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `AYAAN_Commercial_Invoice_${cleanOrderNum}.pdf`;
  doc.save(filename);
}

/**
 * Trigger immediate download of Proforma Invoice PDF in browser.
 */
export function downloadProformaInvoicePDF(
  order: OrderRecord,
  options?: { exporter?: any; bankDetails?: any; bank_details?: any } | CommercialDocument
) {
  const doc = generateProformaInvoiceDoc(order, options);
  const cleanOrderNum = (order.order_number || "ORDER")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `AYAAN_PI_${cleanOrderNum}.pdf`;
  doc.save(filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERIC COMMERCIAL DOCUMENT PDF (Authoritative Pipeline for View & Download)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCommercialDocumentPDFDoc(docData: CommercialDocument): Promise<{
  doc: jsPDF;
  filename: string;
}> {
  if (docData.docType === "OFFER_SHEET" || docData.docType === "ORDER_SHEET") {
    // Generate as canonical Offer Sheet using authoritative OfferSheetData matching web preview
    const offerData = buildOfferSheetData(docData);

    // Preload image data URLs and enrich product data for products in offerData
    for (const prod of offerData.products) {
      if ((!prod.pricingTiers || prod.pricingTiers.length <= 1) && (prod.id || prod.sku)) {
        try {
          const { getProductBySlugOrId } = await import("@/lib/services/products");
          const authProd = await getProductBySlugOrId(prod.id || prod.sku);
          if (authProd) {
            const tiers = extractProductPricingTiers(authProd);
            if (tiers.length > 0) prod.pricingTiers = tiers;
            prod.specificationTiles = extractProductSpecificationTiles(authProd);
            prod.logistics = extractProductLogistics(authProd);
          }
        } catch {}
      }

      if (prod.images && prod.images.length > 0) {
        const loadedUrls = await Promise.all(
          prod.images.map((s) => loadImageAsDataUrl(s))
        );
        prod.images = loadedUrls.filter((u): u is string => Boolean(u));
      }
    }

    const logoDataUrl = (await loadImageAsDataUrl(OFFICIAL_AYC_SITE_LOGO_PATH)) || OFFICIAL_AYC_SITE_LOGO_DATA_URL;

    const doc = generateOfferSheetPDFDoc(offerData, {
      logoDataUrl: logoDataUrl || undefined,
    });

    const cleanSku = (offerData.products[0]?.sku || offerData.docNumber || "OFFER")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const filename = `AYAAN_Offer_Sheet_${cleanSku}.pdf`;
    return { doc, filename };
  }

  const pseudoOrder: OrderRecord = {
    id: docData.order_id || docData.id,
    order_number: docData.orderNumber || docData.docNumber.replace(/^(INV|PI|PL|QT)-/, ""),
    status: "processing",
    payment_status: docData.docType === "COMMERCIAL_INVOICE" || docData.docType === "INVOICE" ? "paid" : "pending",
    fulfillment_status: "processing",
    currency: docData.currency || "USD",
    email: docData.buyerEmail || "",
    shipping_name: docData.buyerName || "",
    shipping_company: docData.companyName || "",
    shipping_address1: docData.buyerAddress || "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country_code: docData.buyerCountry || "US",
    payment_method: docData.payment_details?.payment_method || (docData.docType === "COMMERCIAL_INVOICE" ? "bank_transfer" : "proforma_invoice"),
    payment_details: docData.payment_details,
    subtotal: docData.subtotal || docData.goods_value || 0,
    subtotal_cents: Math.round((docData.subtotal || 0) * 100),
    shipping_cost: docData.shipping || 0,
    shipping_cents: Math.round((docData.shipping || 0) * 100),
    tax_amount: 0,
    tax_cents: 0,
    discount_amount: docData.discount || 0,
    discount_cents: 0,
    total_amount: docData.grandTotal || docData.total_payable || docData.subtotal,
    total_cents: Math.round((docData.grandTotal || 0) * 100),
    placed_at: docData.date || new Date().toISOString(),
    created_at: docData.date || new Date().toISOString(),
    updated_at: docData.date || new Date().toISOString(),
    shipping_snapshot: docData.shipping_snapshot,
    carrier: docData.shipping_snapshot?.carrier,
    items: (docData.items || []).map((it, idx) => ({
      product_name: it.description,
      sku: it.sku || `SKU-${idx + 1}`,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      unit_price_cents: Math.round(it.unitPrice * 100),
      line_total: it.total,
      line_total_cents: Math.round(it.total * 100),
      size: it.size,
      color: it.color,
      package_breakdown: it.package_breakdown,
    })),
  };

  if (docData.docType === "COMMERCIAL_INVOICE" || docData.docType === "INVOICE") {
    const doc = generateCommercialInvoiceDoc(pseudoOrder, docData);
    const cleanOrderNum = (pseudoOrder.order_number || "ORDER").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `AYAAN_Commercial_Invoice_${cleanOrderNum}.pdf`;
    return { doc, filename };
  }

  // Default: Proforma Invoice
  const doc = generateProformaInvoiceDoc(pseudoOrder, docData);
  const cleanOrderNum = (pseudoOrder.order_number || "ORDER").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `AYAAN_PI_${cleanOrderNum}.pdf`;
  return { doc, filename };
}

interface CachedPdfBlobArtifact {
  blob: Blob;
  url: string;
  filename: string;
  doc: jsPDF;
  fingerprint: string;
}

const commercialPdfArtifactCache = new Map<string, CachedPdfBlobArtifact>();

export function getCachedCommercialPdfArtifact(docId: string): CachedPdfBlobArtifact | undefined {
  return commercialPdfArtifactCache.get(docId);
}

export function clearCommercialPdfArtifactCache(docId?: string) {
  if (docId) {
    const existing = commercialPdfArtifactCache.get(docId);
    if (existing?.url && typeof window !== "undefined" && window.URL) {
      window.URL.revokeObjectURL(existing.url);
    }
    commercialPdfArtifactCache.delete(docId);
  } else {
    if (typeof window !== "undefined" && window.URL) {
      for (const item of commercialPdfArtifactCache.values()) {
        if (item.url) window.URL.revokeObjectURL(item.url);
      }
    }
    commercialPdfArtifactCache.clear();
  }
}

export async function generateCommercialDocumentPDFBlob(docData: CommercialDocument): Promise<{
  blob: Blob;
  url: string;
  filename: string;
  doc: jsPDF;
}> {
  const docId = docData.id || `${docData.docType}_${docData.order_id || docData.orderNumber || docData.docNumber}`;
  const fingerprint = `${docId}_${docData.date || ""}_${docData.grandTotal || ""}_${(docData.items || []).length}_${(docData.items || []).map((it) => it.quantity).join("-")}`;

  const cached = commercialPdfArtifactCache.get(docId);
  if (cached && cached.fingerprint === fingerprint) {
    return { blob: cached.blob, url: cached.url, filename: cached.filename, doc: cached.doc };
  }

  const { doc, filename } = await generateCommercialDocumentPDFDoc(docData);
  let blob: Blob;
  try {
    const rawBlob = doc.output("blob");
    if (rawBlob && rawBlob.size > 0 && rawBlob.type === "application/pdf") {
      blob = rawBlob;
    } else if (rawBlob && rawBlob.size > 0) {
      blob = new Blob([rawBlob], { type: "application/pdf" });
    } else {
      const arr = doc.output("arraybuffer");
      blob = new Blob([arr], { type: "application/pdf" });
    }
  } catch {
    const arr = doc.output("arraybuffer");
    blob = new Blob([arr], { type: "application/pdf" });
  }
  const url = typeof window !== "undefined" && window.URL ? window.URL.createObjectURL(blob) : "";

  const artifact = { blob, url, filename, doc, fingerprint };
  commercialPdfArtifactCache.set(docId, artifact);

  return { blob, url, filename, doc };
}

export async function downloadCommercialDocumentPDF(
  docData: CommercialDocument,
  existingBlob?: Blob,
  filename?: string
) {
  const docId = docData.id || `${docData.docType}_${docData.order_id || docData.orderNumber || docData.docNumber}`;
  const cached = commercialPdfArtifactCache.get(docId);
  const targetBlob = existingBlob || cached?.blob;
  const targetFilename = filename || cached?.filename;

  if (targetBlob && targetFilename && typeof document !== "undefined") {
    const url = URL.createObjectURL(targetBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = targetFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const res = await generateCommercialDocumentPDFBlob(docData);
  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    res.doc.save(res.filename);
  }
}
