import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import BUSINESS_PROFILE from "@/config/business-profile";
import { OrderRecord } from "@/services/order.service";
import { CommercialDocument } from "@/types/b2b";
import { deduplicateMediaUrls, getCanonicalMediaKey } from "@/lib/media";
import { OFFICIAL_AYC_SITE_LOGO_DATA_URL, OFFICIAL_AYC_SITE_LOGO_PATH } from "@/lib/site-logo";
import {
  extractProductSpecifications,
  extractProductPricingTiers,
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

/**
 * Helper to safely load image data URL in browser environment for jsPDF embedding
 */
export async function loadImageAsDataUrl(url?: string): Promise<string | null> {
  if (!url || typeof window === "undefined") return null;
  if (url.startsWith("data:image/")) return url;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 400;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
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
    });

  if (options?.existingDoc && (options?.pageIndex === undefined || options?.pageIndex > 1)) {
    doc.addPage();
  }

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // 1. Header Background Accent Band (Deep Navy)
  doc.setFillColor(15, 23, 42); // slate-900 / dark corporate navy
  doc.rect(margin, y, contentWidth, 24, "F");

  // Header Title & Exporter info
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(offerData.seller.name, margin + 4, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `${offerData.seller.description} • Est. ${offerData.seller.establishedYear}`,
    margin + 4,
    y + 12.5
  );
  doc.text(`${offerData.seller.address}`, margin + 4, y + 16.5);
  doc.text(
    `Origin: Bangladesh • Export Desk: www.ayaanclothing.com • ${offerData.seller.email}`,
    margin + 4,
    y + 20.5
  );

  // Document Badge on top right
  const badgeW = 46;
  doc.setFillColor(234, 88, 12); // Brand Orange
  doc.roundedRect(pageWidth - margin - badgeW - 2, y + 4, badgeW, 16, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    "OFFER SHEET",
    pageWidth - margin - badgeW - 2 + (badgeW - doc.getTextWidth("OFFER SHEET")) / 2,
    y + 10
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const badgeSub = "Direct Manufacturer Offer";
  doc.text(
    badgeSub,
    pageWidth - margin - badgeW - 2 + (badgeW - doc.getTextWidth(badgeSub)) / 2,
    y + 14.5
  );

  y += 28;

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
        value: offerData.validUntil.includes("(")
          ? offerData.validUntil
          : `30 Days (${offerData.validUntil})`,
        highlight: true,
        valueColor: [194, 65, 12],
      },
    ],
  });

  y = offerHeaderResult.finalY + 4;

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
    if (pIdx > 0 && y + 115 > 297 - margin) {
      doc.addPage();
      y = margin;
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(
        `AYAAN CLOTHING • Offer Sheet Reference: ${offerData.docNumber} (Continued)`,
        margin + 4,
        y + 4.8
      );
      y += 11;
    }

    // Product Sub-Header (matches preview component)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12); // Brand Orange
    const brandStr = (product.brand || "AYAAN CLOTHING").toUpperCase();
    doc.text(brandStr, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const brandWidth = doc.getTextWidth(brandStr);
    doc.text(" • SKU: ", margin + brandWidth, y);
    const skuPrefixWidth = doc.getTextWidth(" • SKU: ");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(product.sku, margin + brandWidth + skuPrefixWidth, y);
    y += 5;

    // Product Title (with automatic wrapping to prevent collision or truncation)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const splitTitle = doc.splitTextToSize(product.name, contentWidth);
    doc.text(splitTitle, margin, y);
    y += splitTitle.length * 4.8 + 3.5;

    // Visual Gallery
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PRODUCT GALLERY", margin, y);
    y += 3.5;

    const galleryImages = product.images || [];

    if (galleryImages.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("No product images available.", margin + 4, y + 7.5);
      y += 16;
    } else {
      // Modestly larger tiles: 3 cols if <= 3 images, 4 cols if 4 images, 5 cols if 5+ images
      const cols = galleryImages.length <= 3 ? 3 : galleryImages.length === 4 ? 4 : 5;
      const gap = galleryImages.length <= 3 ? 3.5 : 3;
      const tileW = (contentWidth - (cols - 1) * gap) / cols;
      const tileH = tileW * (5 / 4); // Canonical 4:5 ratio matching website gallery

      let curCol = 0;

      for (let i = 0; i < galleryImages.length; i++) {
        const imgData = galleryImages[i];

        if (i > 0 && i % cols === 0) {
          if (y + tileH + gap + tileH > 297 - margin - 15) {
            doc.addPage();
            y = margin;
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, y, contentWidth, 7, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.text(
              `PRODUCT GALLERY (CONTINUED) • Ref: ${offerData.docNumber}`,
              margin + 4,
              y + 4.8
            );
            y += 11;
          } else {
            y += tileH + gap;
          }
          curCol = 0;
        }

        const tileX = margin + curCol * (tileW + gap);
        const tileY = y;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(tileX, tileY, tileW, tileH, 1.5, 1.5, "FD");

        const pad = 1.2;
        const innerW = tileW - pad * 2;
        const innerH = tileH - pad * 2;

        try {
          const props = (doc as any).getImageProperties(imgData);
          const imgRatio = (props?.width || 1) / (props?.height || 1);
          let drawW = innerW;
          let drawH = drawW / imgRatio;
          if (drawH > innerH) {
            drawH = innerH;
            drawW = drawH * imgRatio;
          }
          const drawX = tileX + pad + (innerW - drawW) / 2;
          const drawY = tileY + pad + (innerH - drawH) / 2;
          doc.addImage(imgData, "JPEG", drawX, drawY, drawW, drawH);
        } catch {
          try {
            doc.addImage(imgData, "JPEG", tileX + pad, tileY + pad, innerW, innerH);
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
            doc.addImage(effectiveLogoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
          } catch {
            try {
              doc.addImage(effectiveLogoDataUrl, logoX, logoY, logoSize, logoSize);
            } catch {}
          }
        }

        curCol++;
      }

      y += tileH + 6;
    }

    // Specifications Section
    if (y + 45 > 297 - margin) {
      doc.addPage();
      y = margin;
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(
        `AYAAN CLOTHING • Offer Sheet Reference: ${offerData.docNumber} (Continued)`,
        margin + 4,
        y + 4.8
      );
      y += 11;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("1. PRODUCT SPECIFICATION & DETAILS", margin, y);
    y += 3;

    const specsRows = product.specifications.map((s: any) => [s.label, s.value]);

    if (specsRows.length > 0) {
      applyAutoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Specification Parameter", "Configured Value / Specification"]],
        body: specsRows,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: 1.6,
        },
        bodyStyles: {
          fontSize: 6.8,
          cellPadding: 1.4,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 46, fontStyle: "bold", textColor: [51, 65, 85] },
          1: { cellWidth: contentWidth - 46 },
        },
      });
      y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : y + 35;
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Standard commercial garment specifications apply.", margin + 4, y + 6.5);
      y += 14;
    }

    // Pricing Schedule Section
    if (y + 40 > 297 - margin) {
      doc.addPage();
      y = margin;
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(
        `AYAAN CLOTHING • Offer Sheet Reference: ${offerData.docNumber} (Continued)`,
        margin + 4,
        y + 4.8
      );
      y += 11;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("2. PRODUCT PRICING SCHEDULE (USD)", margin, y);
    y += 3;

    const pricingRows: string[][] = product.pricingTiers.map((t: any) => [
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
          : [["Standard", `Per ${product.unit || "PCS"}`, "$0.00", "—"]],
      theme: "striped",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" },
        1: { cellWidth: 64 },
        2: { cellWidth: 45, fontStyle: "bold", textColor: [15, 23, 42], halign: "right" },
        3: { cellWidth: 45, fontStyle: "bold", textColor: [194, 65, 12], halign: "right" },
      },
    });

    y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 28;
  }

  // Commercial Terms Section (Unified, strictly no ISO99)
  if (y + 40 > 297 - margin) {
    doc.addPage();
    y = margin;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(
      `AYAAN CLOTHING • Offer Sheet Reference: ${offerData.docNumber} (Continued)`,
      margin + 4,
      y + 4.8
    );
    y += 11;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  const termsBoxH = 22;
  doc.roundedRect(margin, y, contentWidth, termsBoxH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("COMMERCIAL TERMS", margin + 3, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  offerData.commercialTerms.forEach((line: string, lineIdx: number) => {
    doc.text(`• ${line}`, margin + 3, y + 8 + lineIdx * 3.1);
  });

  y += termsBoxH + 4;

  // Signatures
  const sigX = pageWidth - margin - 60;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 10, sigX + 58, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(offerData.seller.signatoryTitle, sigX, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(offerData.seller.signatoryDivision, sigX, y + 17.5);

  // Dynamic Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const pgIndex =
      options?.pageIndex !== undefined && options?.totalPages !== undefined
        ? `${options.pageIndex}.${i}`
        : `${i}`;
    const pgTotal =
      options?.totalPages !== undefined ? `${options.totalPages}` : `${pageCount}`;
    doc.text(
      `AYAAN CLOTHING • Offer Sheet Reference: ${offerData.docNumber} • Generated on ${new Date().toISOString().slice(0, 10)} • Page ${pgIndex} of ${pgTotal}`,
      margin,
      297 - 6
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

  // If 0 or 1 image provided, enrich with authoritative product images from product service / store
  if (imageSources.length <= 1 && (product.id || product.sku || product.name)) {
    try {
      const { getProductBySlugOrId } = await import("@/lib/services/products");
      const authoritativeProduct = await getProductBySlugOrId(product.id || product.sku || product.name);
      if (authoritativeProduct && authoritativeProduct.images && authoritativeProduct.images.length > 0) {
        const combined = [
          authoritativeProduct.images[0] || imageSources[0],
          ...authoritativeProduct.images,
          ...imageSources,
        ];
        imageSources = deduplicateMediaUrls(combined);
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
        if (found && found.images && found.images.length > 0) {
          const combined = [
            found.images[0] || imageSources[0],
            ...found.images,
            ...imageSources,
          ];
          imageSources = deduplicateMediaUrls(combined);
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

/**
 * Trigger download of a combined Offer Sheets PDF containing multiple products.
 */
export async function downloadCombinedProductOfferSheetsPDF(
  order: OrderRecord,
  buyerInfo?: { name?: string; company?: string; email?: string; country?: string }
) {
  if (!order.items || order.items.length === 0) return;

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

    // Enrich if item has <= 1 image
    const itemProductId = (item as any).product_id || item.sku || item.product_name;
    if (imageSources.length <= 1 && itemProductId) {
      try {
        const { getProductBySlugOrId } = await import("@/lib/services/products");
        const authoritativeProduct = await getProductBySlugOrId(itemProductId);
        if (authoritativeProduct && authoritativeProduct.images && authoritativeProduct.images.length > 0) {
          const combined = [
            authoritativeProduct.images[0] || imageSources[0],
            ...authoritativeProduct.images,
            ...imageSources,
          ];
          imageSources = deduplicateMediaUrls(combined);
        }
      } catch {}
    }

    const loadedUrls = await Promise.all(
      imageSources.map((s) => loadImageAsDataUrl(s))
    );
    const galleryDataUrls = loadedUrls.filter((u): u is string => Boolean(u));
    const mainDataUrl = galleryDataUrls[0] || (imageSource ? await loadImageAsDataUrl(imageSource) : null);

    const logoDataUrl = (await loadImageAsDataUrl(OFFICIAL_AYC_SITE_LOGO_PATH)) || OFFICIAL_AYC_SITE_LOGO_DATA_URL;

    const productInput: OfferSheetProductInput = {
      name: item.product_name || "Garment",
      sku: item.sku,
      price: item.unit_price || 0,
      moq: item.quantity,
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
    const filename = `AYAAN_CLOTHING_Offer_Sheets_${order.order_number}.pdf`;
    doc.save(filename);
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
  options?: { exporter?: any; bankDetails?: any; bank_details?: any } | CommercialDocument
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const optExp = (options as any)?.exporter;
  const expName = optExp?.company_name || optExp?.name || BUSINESS_PROFILE.name;
  const expDesc = optExp?.tagline || optExp?.business_type || BUSINESS_PROFILE.description;
  const expEst = optExp?.est_year || BUSINESS_PROFILE.establishedYear;
  const expAddress = optExp?.address || optExp?.office_address || BUSINESS_PROFILE.address.formatted;
  const expEmail = optExp?.email || BUSINESS_PROFILE.contact.email || "export@ayaanclothing.com";
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
  doc.setFontSize(15);
  doc.text(expName, margin + 4, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
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

  // Document Badge
  doc.setFillColor(30, 58, 138); // blue-900 / dark corporate blue
  doc.roundedRect(pageWidth - margin - 56, y + 4, 52, 16, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PROFORMA INVOICE", pageWidth - margin - 54, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Official PI (USD)", pageWidth - margin - 54, y + 15);

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
  const merchandisePayable = Math.max(0, order.subtotal - discountVal);
  const grandTotal = isAramex ? merchandisePayable + shippingAmount : merchandisePayable;

  // 2. Exporter / Buyer Details (Two Columns)
  const colWidth = (contentWidth - 6) / 2;

  // Box 1: Shipper / Exporter
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, colWidth, 34, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("EXPORTER / BENEFICIARY:", margin + 3, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(expName, margin + 3, y + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(expAddress.slice(0, 45), margin + 3, y + 13.5);
  doc.text("Country of Origin: Bangladesh", margin + 3, y + 17.5);
  doc.text(`Contact: ${expEmail} • WA: ${expPhone}`, margin + 3, y + 21.5);
  doc.text(`Reg: ${optExp?.reg_number || optExp?.tin_number || "BGMEA Certified"}`, margin + 3, y + 25.5);

  // Box 2: Consignee / Buyer
  const buyerX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(buyerX, y, colWidth, 34, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("CONSIGNEE / BUYER:", buyerX + 3, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text((order.shipping_company || order.shipping_name || "Valued Customer").slice(0, 32), buyerX + 3, y + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Attn: ${order.shipping_name || "Purchasing Manager"}`, buyerX + 3, y + 13.5);
  doc.text(`${(order.shipping_address1 || "Destination Address").slice(0, 36)}`, buyerX + 3, y + 17.5);
  doc.text(
    `${order.shipping_city || ""}, ${order.shipping_postal_code || ""}, ${order.shipping_country_code || "US"}`,
    buyerX + 3,
    y + 21.5
  );
  doc.text(`Email: ${order.email || "N/A"}`, buyerX + 3, y + 25.5);
  doc.text(`Phone: ${order.shipping_phone || "N/A"}`, buyerX + 3, y + 29.5);

  y += 37;

  // 3. Invoice Reference Bar (Robust non-overlapping Grid with dynamic height)
  const piNumber = `PI-${order.order_number}`;
  const issueDate = formatDate(order.placed_at || order.created_at);
  const validityDate = getExpiryDate(order.placed_at || order.created_at);
  const customShipping =
    (options as any)?.shippingArrangement ||
    (options as any)?.shipping_arrangement;
  const shippingArrangementText = customShipping
    ? customShipping
    : isAramex
    ? (order.shipping_cost && order.shipping_cost > 0
        ? `Air Cargo Express (Aramex - $${Number(order.shipping_cost).toFixed(2)})`
        : "Air Cargo Express (Aramex)")
    : (order.shipping_snapshot?.mode_title || "To Be Confirmed Separately");
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
      { label: "Shipping Arrangement", value: shippingArrangementText },
      { label: "Payment Terms", value: paymentTermsText },
    ],
  });

  y = headerResult.finalY + 4;

  // 4. Multi-Product Items Table (Contains ALL order items)
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
      fillColor: [30, 41, 59], // slate-800
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
      2: { cellWidth: 26, fontStyle: "bold" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 19, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
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

  // Left side: Shipping note & packaging
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Shipping & Delivery Information:", margin, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);

  if (isAramex) {
    const snap = order.shipping_snapshot;
    doc.text(`• Selected Carrier: ${order.carrier || "Aramex Priority Air Express"}`, margin, y + 8.5);
    doc.text(`• Total Items: ${totalQty} pcs in ${snap?.carton_count || Math.max(1, Math.ceil(totalQty / 50))} cartons`, margin, y + 12.5);
    doc.text(`• Estimated Gross Weight: ~${snap?.gross_weight || (totalQty * 0.35).toFixed(1)} kg`, margin, y + 16.5);
    doc.text("• Aramex Air Shipping charge is itemized in the Proforma Invoice total.", margin, y + 20.5);
  } else {
    // Manual shipping
    doc.setTextColor(194, 65, 12); // amber-700
    doc.setFont("helvetica", "bold");
    doc.text("• Shipping arrangements to be confirmed separately.", margin, y + 8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`• Total Order Items: ${totalQty} pcs scheduled for export packaging.`, margin, y + 12.5);
    doc.text("• Shipping charges are NOT included in the merchandise total below.", margin, y + 16.5);
    doc.text("• Contact our export logistics desk to arrange carrier booking.", margin, y + 20.5);
  }

  // Right side: Financial Totals Box
  const hasDiscount = discountVal > 0;
  const boxHeight = (isAramex ? 25 : 20) + (hasDiscount ? 4.5 : 0);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, y, summaryWidth, boxHeight, 1.5, 1.5, "FD");

  let subY = y + 4.5;
  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Goods Value / Subtotal:", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(fmtUSD(order.subtotal), summaryX + summaryWidth - 3, subY, { align: "right" });

  if (hasDiscount) {
    subY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 101, 52); // green-800
    const promoLabel = order.coupon_code || order.promo_code ? `Discount (${order.coupon_code || order.promo_code}):` : "Discount Applied:";
    doc.text(promoLabel, summaryX + 3, subY);
    doc.setFont("helvetica", "bold");
    doc.text(`-${fmtUSD(discountVal)}`, summaryX + summaryWidth - 3, subY, { align: "right" });
  }

  if (isAramex) {
    subY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Air Shipping — Aramex:", summaryX + 3, subY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(fmtUSD(shippingAmount), summaryX + summaryWidth - 3, subY, { align: "right" });
  }

  subY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Estimated Tax (B2B Export):", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("$0.00 (Zero Rated)", summaryX + summaryWidth - 3, subY, { align: "right" });

  // Divider
  subY += 2.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, subY, summaryX + summaryWidth - 3, subY);

  // Grand Total
  subY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(isAramex ? "TOTAL PAYABLE:" : "MERCHANDISE TOTAL:", summaryX + 3, subY);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`${fmtUSD(grandTotal)} USD`, summaryX + summaryWidth - 3, subY, { align: "right" });

  y += boxHeight + 5;

  // 6. BENEFICIARY BANK DETAILS Block (Exact Pubali Bank Limited credentials)
  const bankBlockHeight = 24;
  if (y + bankBlockHeight + 25 > 297 - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, bankBlockHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("BENEFICIARY BANK DETAILS", margin + 3, y + 4.5);

  doc.setFontSize(7);
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
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(optExp?.signatory_title || "Authorized Signatory & Export Seal", sigX, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(optExp?.signatory_division || "Ayaan Clothing Ltd • Dhaka, Bangladesh", sigX, y + 15.5);

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
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
  doc.text(expName, margin + 3, y + 9);
  doc.text(expAddress.slice(0, 45), margin + 3, y + 12.5);
  doc.text("Country of Origin: Bangladesh", margin + 3, y + 16);
  doc.text(`Email: ${expEmail} • WA: ${expPhone}`, margin + 3, y + 19.5);
  doc.text(`Reg: ${expReg}`, margin + 3, y + 23);

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
  doc.text(buyerComp, buyerX, y + 9);
  doc.text(`Attn: ${buyerName}`, buyerX, y + 12.5);
  doc.text(order.shipping_address1 || commercialDoc?.buyerAddress || "Destination Address", buyerX, y + 16);
  doc.text(`${order.shipping_city || ""} ${order.shipping_postal_code || ""}, ${order.shipping_country_code || commercialDoc?.buyerCountry || "US"}`, buyerX, y + 19.5);
  doc.text(`Email: ${order.email || commercialDoc?.buyerEmail || ""}`, buyerX, y + 23);

  // Document & Transport Parameters
  const docParamX = margin + 130;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE & SHIPPING TERMS:", docParamX, y + 5);

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
  doc.text("Incoterm:", docParamX, y + 19.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text("DAP (Delivered at Place)", docParamX + 18, y + 19.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Carrier:", docParamX, y + 23);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(order.carrier || order.shipping_snapshot?.carrier || "Aramex Express Air", docParamX + 18, y + 23);

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

  // 4. Financial Totals & Say in Words
  const summaryBoxWidth = 75;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const subtotal = Number(order.subtotal || 0);
  const shipping = Number(order.shipping_cost || 0);
  const discount = Number(order.discount_amount || 0);
  const grandTotal = Number(order.total_amount || (subtotal + shipping - discount));

  // Financial totals box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryX, y, summaryBoxWidth, 24, 1.5, 1.5, "FD");

  let subY = y + 4.5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Merchandise Subtotal:", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(fmtUSD(subtotal), summaryX + summaryBoxWidth - 3, subY, { align: "right" });

  subY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Shipping & Export Freight:", summaryX + 3, subY);
  doc.setFont("helvetica", "bold");
  doc.text(shipping === 0 ? "FREE" : fmtUSD(shipping), summaryX + summaryBoxWidth - 3, subY, { align: "right" });

  if (discount > 0) {
    subY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 101, 52);
    doc.text("Discount Applied:", summaryX + 3, subY);
    doc.setFont("helvetica", "bold");
    doc.text(`-${fmtUSD(discount)}`, summaryX + summaryBoxWidth - 3, subY, { align: "right" });
  }

  subY += 4.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, subY - 1, summaryX + summaryBoxWidth - 3, subY - 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL INVOICE (USD):", summaryX + 3, subY + 2.5);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`${fmtUSD(grandTotal)} USD`, summaryX + summaryBoxWidth - 3, subY + 2.5, { align: "right" });

  // 5. DEDICATED PAYMENT DETAILS BOX (Verified & Confirmed)
  const paymentBoxWidth = summaryX - margin - 5;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin, y, paymentBoxWidth, 24, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text("PAYMENT DETAILS (VERIFIED & CONFIRMED)", margin + 3, y + 4.5);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Status:", margin + 3, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("PAID", margin + 18, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Method:", margin + 35, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDetails?.payment_method || order.payment_method || "Bank Wire Transfer", margin + 49, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Txn ID:", margin + 3, y + 13.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDetails?.transaction_id || "N/A", margin + 18, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Payer:", margin + 55, y + 13.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDetails?.payer_name || buyerComp, margin + 67, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank:", margin + 3, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDetails?.bank_name || "Pubali Bank Limited", margin + 18, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Paid Date:", margin + 55, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDetails?.payment_date || issueDate, margin + 72, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Amount Paid:", margin + 3, y + 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${fmtUSD(paymentDetails?.payment_amount ?? grandTotal)} USD`, margin + 22, y + 22);

  if (paymentDetails?.receipt_original_name) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Ref: ${paymentDetails.receipt_original_name}`, margin + 55, y + 22);
  }

  y += 28;

  // 6. Beneficiary Bank Details & Signatory
  const bankBlockHeight = 22;
  if (y + bankBlockHeight + 20 > 297 - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, bankBlockHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SETTLEMENT BANK (BENEFICIARY)", margin + 3, y + 4.5);

  const optBank = commercialDoc?.bankDetails || (commercialDoc as any)?.bank_details;
  const ciBankName = optBank?.bank_name || optBank?.bankName || BUSINESS_PROFILE.banking.bankName || "Pubali Bank Limited";
  const ciAccTitle = optBank?.account_title || optBank?.accountTitle || optBank?.beneficiary_name || optBank?.account_name || BUSINESS_PROFILE.banking.accountTitle || "M/S AYAAN CLOTHING";
  const ciAccNo = optBank?.account_no || optBank?.accountNo || optBank?.account_number || BUSINESS_PROFILE.banking.accountNo || "1788-901-044316";
  const ciSwift = optBank?.swift_code || optBank?.swiftCode || BUSINESS_PROFILE.banking.swiftCode || "PUBABDDH210";
  const ciAddress = optBank?.bank_address || optBank?.bankAddress || optBank?.branch || optBank?.branch_name || "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh";

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Name:", margin + 3, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ciBankName, margin + 22, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account Title:", margin + 80, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ciAccTitle, margin + 102, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account No:", margin + 3, y + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(ciAccNo, margin + 22, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("SWIFT CODE:", margin + 80, y + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(ciSwift, margin + 102, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Address:", margin + 3, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ciAddress.replace(/\n/g, ", "), margin + 22, y + 18);

  y += bankBlockHeight + 4;

  // Signatory & Seal
  const sigX = pageWidth - margin - 65;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 7, sigX + 60, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(optExp?.signatory_title || "Authorized Signatory & Export Seal", sigX, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(optExp?.signatory_division || "Ayaan Clothing Ltd • Dhaka, Bangladesh", sigX, y + 14.5);

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AYAAN CLOTHING • Commercial Invoice Ref: ${invNumber} • Order: ${order.order_number} • Payment Status: PAID • Page ${i} of ${pageCount}`,
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
// 3. GENERIC COMMERCIAL DOCUMENT PDF (For Document Viewer & Admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function downloadCommercialDocumentPDF(docData: CommercialDocument) {
  if (docData.docType === "OFFER_SHEET" || docData.docType === "ORDER_SHEET") {
    // Generate as canonical Offer Sheet using authoritative OfferSheetData matching web preview
    const offerData = buildOfferSheetData(docData);

    // Preload image data URLs for products in offerData
    for (const prod of offerData.products) {
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
    doc.save(filename);
    return;
  }

  if (docData.docType === "COMMERCIAL_INVOICE" || docData.docType === "INVOICE") {
    const pseudoOrder: OrderRecord = {
      id: docData.order_id || docData.id,
      order_number: docData.orderNumber || docData.docNumber.replace(/^INV-/, ""),
      status: "processing",
      payment_status: "paid",
      fulfillment_status: "processing",
      currency: docData.currency || "USD",
      email: docData.buyerEmail || "",
      shipping_name: docData.buyerName || "",
      shipping_company: docData.companyName || "",
      shipping_address1: docData.buyerAddress || "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_country_code: docData.buyerCountry || "US",
      payment_method: docData.payment_details?.payment_method || "bank_transfer",
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
    downloadCommercialInvoicePDF(pseudoOrder, docData);
    return;
  }

  // Otherwise generate as Proforma Invoice
  const pseudoOrder: OrderRecord = {
    id: docData.order_id || docData.id,
    order_number: docData.orderNumber || docData.docNumber.replace(/^PI-/, ""),
    status: "processing",
    payment_status: "pending",
    fulfillment_status: "processing",
    currency: docData.currency || "USD",
    email: docData.buyerEmail || "",
    shipping_name: docData.buyerName || "",
    shipping_company: docData.companyName || "",
    shipping_address1: docData.buyerAddress || "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country_code: docData.buyerCountry || "US",
    payment_method: "proforma_invoice",
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

  downloadProformaInvoicePDF(pseudoOrder, docData);
}
