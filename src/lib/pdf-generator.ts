import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import BUSINESS_PROFILE from "@/config/business-profile";
import { OrderRecord } from "@/services/order.service";
import { CommercialDocument } from "@/types/b2b";

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
  msrpPrice?: number;
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
  cartonDimensions?: { length: number; width: number; height: number; unit?: string };
  grossWeight?: number | string;
  netWeight?: number | string;
  cbm?: number | string;
  weight?: string | number;
}

/**
 * Generates an official vector A4 PDF Offer Sheet for a single product.
 * Invariant: NEVER contains shipping information or freight quotes.
 */
export function generateProductOfferSheetDoc(
  product: OfferSheetProductInput,
  buyerInfo?: { name?: string; company?: string; email?: string; country?: string },
  selectedQty?: number,
  existingDoc?: jsPDF,
  pageIndex?: number,
  totalPages?: number
): jsPDF {
  const doc = existingDoc || new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  if (existingDoc) {
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
  doc.text(BUSINESS_PROFILE.name, margin + 4, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `${BUSINESS_PROFILE.description} • Est. ${BUSINESS_PROFILE.establishedYear}`,
    margin + 4,
    y + 12.5
  );
  doc.text(
    `${BUSINESS_PROFILE.address.formatted}`,
    margin + 4,
    y + 16.5
  );
  doc.text(
    `Origin: Bangladesh • Export Desk: www.ayaanclothing.com • ${BUSINESS_PROFILE.contact.email || "export@ayaanclothing.com"}`,
    margin + 4,
    y + 20.5
  );

  // Document Badge on top right
  doc.setFillColor(234, 88, 12); // Brand Orange
  doc.roundedRect(pageWidth - margin - 58, y + 4, 54, 16, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("COMMERCIAL OFFER SHEET", pageWidth - margin - 56, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Direct Manufacturer Product Offer", pageWidth - margin - 56, y + 15);

  y += 28;

  // 2. Metadata Card (Reference, Date, Buyer, Terms)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "FD");

  const offerDate = formatDate();
  const validUntil = getExpiryDate();
  const cleanSku = (product.sku || "PROD").toUpperCase();
  const offerNumber = `OF-${cleanSku}-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  // Left col
  doc.setFont("helvetica", "bold");
  doc.text("Offer Reference:", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(offerNumber, margin + 28, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Date of Issue:", margin + 4, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(offerDate, margin + 28, y + 12);

  // Center col
  doc.setFont("helvetica", "bold");
  doc.text("Validity:", margin + 68, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(194, 65, 12); // orange-700
  doc.text(`30 Days (${validUntil})`, margin + 82, y + 6);
  doc.setTextColor(71, 85, 105);

  doc.setFont("helvetica", "bold");
  doc.text("Delivery Terms:", margin + 68, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text("FOB Dhaka / Ex-Factory (Export Standard)", margin + 88, y + 12);

  // Right col: Buyer info
  doc.setFont("helvetica", "bold");
  doc.text("Issued To:", margin + 138, y + 6);
  doc.setFont("helvetica", "normal");
  const recipient = buyerInfo?.company || buyerInfo?.name || "Prospective Buyer";
  doc.text(recipient.slice(0, 20), margin + 154, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Destination:", margin + 138, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(buyerInfo?.country || "Worldwide Export", margin + 156, y + 12);

  y += 22;

  // 3. PRODUCT IMAGE GALLERY (Prominent Main Image + Thumbnails Row)
  const galleryImages: string[] = [];
  if (product.imageDataUrl && !galleryImages.includes(product.imageDataUrl)) {
    galleryImages.push(product.imageDataUrl);
  }
  if (product.galleryDataUrls && product.galleryDataUrls.length > 0) {
    product.galleryDataUrls.forEach((g) => {
      if (g && !galleryImages.includes(g)) galleryImages.push(g);
    });
  }

  const hasGallery = galleryImages.length > 0;
  if (hasGallery) {
    // Gallery Header Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES", margin, y);
    y += 2.5;

    // Main Large Product Image Frame (Centered, Aspect Ratio Preserved)
    const mainBoxWidth = 80;
    const mainBoxHeight = 44;
    const mainImgData = galleryImages[0];

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, mainBoxHeight + 4, 1.5, 1.5, "FD");

    try {
      const props = (doc as any).getImageProperties(mainImgData);
      const imgRatio = (props?.width || 1) / (props?.height || 1);
      let drawW = mainBoxWidth;
      let drawH = drawW / imgRatio;
      if (drawH > mainBoxHeight) {
        drawH = mainBoxHeight;
        drawW = drawH * imgRatio;
      }
      const drawX = (pageWidth - drawW) / 2;
      const drawY = y + 2 + (mainBoxHeight - drawH) / 2;
      doc.addImage(mainImgData, "JPEG", drawX, drawY, drawW, drawH);
    } catch {
      const mainFrameX = (pageWidth - mainBoxWidth) / 2;
      doc.addImage(mainImgData, "JPEG", mainFrameX, y + 2, mainBoxWidth, mainBoxHeight);
    }

    y += mainBoxHeight + 6;

    // Small Thumbnail Images (Canonical 4:5 Aspect Ratio Bounding Frames: 12mm x 15mm)
    if (galleryImages.length > 1) {
      const thumbW = 12;
      const thumbH = 15; // Canonical 4:5 ratio (12 x 15)
      const thumbSpacing = 2.5;
      const availableWidth = contentWidth - 4;
      const maxPerRow = Math.max(1, Math.floor((availableWidth + thumbSpacing) / (thumbW + thumbSpacing)));

      // Group all gallery images into rows
      const thumbRows: string[][] = [];
      for (let i = 0; i < galleryImages.length; i += maxPerRow) {
        thumbRows.push(galleryImages.slice(i, i + maxPerRow));
      }

      const totalThumbBoxHeight = thumbRows.length * thumbH + (thumbRows.length - 1) * 3 + 4;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, totalThumbBoxHeight, 1.5, 1.5, "FD");

      let rowY = y + 2;
      let globalIdx = 0;

      thumbRows.forEach((row) => {
        const rowTotalWidth = row.length * thumbW + (row.length - 1) * thumbSpacing;
        let startThumbX = (pageWidth - rowTotalWidth) / 2;
        if (startThumbX < margin + 2) startThumbX = margin + 2;

        row.forEach((tImg, colIdx) => {
          const curX = startThumbX + colIdx * (thumbW + thumbSpacing);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(
            globalIdx === 0 ? 234 : 203,
            globalIdx === 0 ? 88 : 213,
            globalIdx === 0 ? 12 : 225
          );
          doc.roundedRect(curX, rowY, thumbW, thumbH, 1, 1, "FD");

          try {
            const tProps = (doc as any).getImageProperties(tImg);
            const tRatio = (tProps?.width || 1) / (tProps?.height || 1);
            let tDrawW = thumbW - 2;
            let tDrawH = tDrawW / tRatio;
            if (tDrawH > thumbH - 2) {
              tDrawH = thumbH - 2;
              tDrawW = tDrawH * tRatio;
            }
            const tDrawX = curX + 1 + (thumbW - 2 - tDrawW) / 2;
            const tDrawY = rowY + 1 + (thumbH - 2 - tDrawH) / 2;
            doc.addImage(tImg, "JPEG", tDrawX, tDrawY, tDrawW, tDrawH);
          } catch {
            doc.addImage(tImg, "JPEG", curX + 1, rowY + 1, thumbW - 2, thumbH - 2);
          }

          globalIdx++;
        });

        rowY += thumbH + 3;
      });

      y += totalThumbBoxHeight + 5;
    } else {
      y += 2;
    }
  }

  // 4. Section 1: Product Overview & Specifications
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("1. PRODUCT SPECIFICATION & DETAILS", margin, y);
  y += 3;

  const rawSizes = Array.isArray(product.sizes)
    ? product.sizes.join(", ")
    : product.sizes || "S, M, L, XL, XXL (Assorted)";
  const rawColors = Array.isArray(product.colors)
    ? product.colors.join(", ")
    : Array.isArray(product.color)
    ? product.color.join(", ")
    : product.color || "Standard Export Assortment";

  const formattedPkgBreakdown = formatPackageBreakdownText(
    product.packageBreakdown,
    product.moq
  );

  const dimensionText = product.cartonDimensions
    ? `${product.cartonDimensions.length} × ${product.cartonDimensions.width} × ${product.cartonDimensions.height} ${product.cartonDimensions.unit || "cm"}`
    : "60 × 40 × 35 cm (Standard Export Master Carton)";

  const grossWtText = product.grossWeight
    ? `${product.grossWeight} kg`
    : product.weight
    ? `${product.weight}`
    : "Approx. 10.5 kg / Master Carton";

  const specsRows: [string, string][] = [
    ["Product Name", product.name || "Commercial Garment Export"],
    ["Style / SKU Code", (product.sku || "AYN-EXP-001").toUpperCase()],
    ["Brand / Manufacturer", `${product.brand || "AYAAN CLOTHING"} (Bangladesh)`],
    ["Target Demographic / Audience", product.audience ? `${product.audience} Apparel` : "Unisex Adult Apparel"],
    ["Minimum Order Qty (MOQ)", `${product.moq || 10} pcs`],
    ["Fabric / Composition", product.composition || product.fabric || "100% Combed Compact Cotton (Single Jersey)"],
    ["Fabric Weight (GSM)", `${product.gsm || "180"} GSM (±5 GSM)`],
    ["Fit & Construction", product.fit || "Export Standard Regular Fit, Reinforced Neckband, Twin Needle Stitching"],
    ["Available Sizes", rawSizes],
    ["Standard Colors", rawColors],
    ["Package Breakdown", formattedPkgBreakdown],
    ["Carton Dimensions & Weight", `${dimensionText} • Gross Wt: ${grossWtText}`],
    ["Export Packaging", product.packagingSpecs || "1 pc / Individual Polybag, 50 pcs / 7-Ply Heavy Duty Master Export Carton"],
    ["Production Lead Time", `${product.leadTimeDays || 14} - 21 Business Days from PO Approval`],
  ];

  const tableWidth = contentWidth;

  applyAutoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Specification Parameter", "Manufacturer Details & Export Standard"]],
    body: specsRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
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
      1: { cellWidth: tableWidth - 46 },
    },
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 60;

  // Sensible pagination: Check if remaining sections require a clean page 2
  if (y + 80 > 297 - margin) {
    doc.addPage();
    y = margin;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`AYAAN CLOTHING • Commercial Offer Reference: ${offerNumber} (Continued)`, margin + 4, y + 5.5);
    y += 12;
  }

  // 4. Section 2: Applicable Wholesale Pricing
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("2. APPLICABLE WHOLESALE PRICING (USD)", margin, y);
  y += 3;

  const basePrice = Number(product.price) || 12;
  const tiers = product.pricingTiers && product.pricingTiers.length > 0
    ? product.pricingTiers.map((t: any) => ({
        minQuantity: t.minQuantity ?? t.min_quantity ?? 10,
        maxQuantity: t.maxQuantity ?? t.max_quantity ?? undefined,
        price: Number(t.price ?? t.unit_price ?? basePrice),
      }))
    : [
        { minQuantity: product.moq || 10, maxQuantity: 50, price: basePrice },
        { minQuantity: 51, maxQuantity: 200, price: Math.round(basePrice * 0.92 * 100) / 100 },
        { minQuantity: 201, maxQuantity: undefined, price: Math.round(basePrice * 0.85 * 100) / 100 },
      ];

  // ── Resolve the single applicable tier for this order quantity ──────────────
  // Reuses the same min/max range logic used by the commercial summary callout
  // below. We find the matching tier index so we can label it correctly (e.g.
  // "Tier 2") while showing only ONE row in the pricing table.
  const qtyToOffer = selectedQty || product.moq || 10;
  let matchedTierIdx = 0; // default to first tier if nothing else matches
  let matchedPrice = basePrice;

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (qtyToOffer >= t.minQuantity) {
      if (!t.maxQuantity || qtyToOffer <= t.maxQuantity) {
        matchedTierIdx = i;
        matchedPrice = t.price;
      }
    }
  }

  // Build the SINGLE applicable tier row using the same field derivation as before
  const matchedTier = tiers[matchedTierIdx];
  const rangeLabel = matchedTier.maxQuantity
    ? `${matchedTier.minQuantity} – ${matchedTier.maxQuantity} pcs`
    : `${matchedTier.minQuantity}+ pcs (Bulk Volume)`;
  const unitPriceFmt = fmtUSD(matchedTier.price);
  const estTotalMin = fmtUSD(matchedTier.price * matchedTier.minQuantity);
  const savings = matchedTierIdx === 0
    ? "Standard Tier"
    : `${Math.round(((basePrice - matchedTier.price) / basePrice) * 100)}% Discount`;

  const singleTierRow = [
    `Tier ${matchedTierIdx + 1}`,
    rangeLabel,
    `${unitPriceFmt} / pc`,
    estTotalMin,
    savings,
    "FOB Dhaka",
  ];

  applyAutoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Tier", "Order Quantity Range", "Unit Price (USD)", "Min Order Value", "Volume Benefit", "Incoterm"]],
    body: [singleTierRow],
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
      0: { cellWidth: 16, fontStyle: "bold" },
      1: { cellWidth: 42 },
      2: { cellWidth: 32, fontStyle: "bold", textColor: [15, 23, 42] },
      3: { cellWidth: 32 },
      4: { cellWidth: 30, textColor: [22, 101, 52] },
      5: { cellWidth: 30 },
    },
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 36;

  // 5. Offered Quantity & Commercial Value Box
  const merchandiseOfferTotal = qtyToOffer * matchedPrice;

  // Commercial Summary Callout Bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("CURRENT COMMERCIAL OFFER SUMMARY:", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Offered Quantity: ${qtyToOffer} pcs`, margin + 4, y + 10);
  doc.text(`Applicable Unit Price: ${fmtUSD(matchedPrice)} / pc (FOB Dhaka)`, margin + 55, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`Merchandise Total: ${fmtUSD(merchandiseOfferTotal)} USD`, margin + 125, y + 10);

  y += 18;

  // 6. Mandatory Invariant Callout Box: STRICT ZERO SHIPPING EXCLUSION & COMMERCIAL TERMS
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14); // amber-900
  doc.text("IMPORTANT COMMERCIAL NOTICE & TERMS:", margin + 3, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9); // amber-800
  const noticeLines = [
    "• This Offer Sheet constitutes an official commercial offer and product specification overview; it is NOT an invoice.",
    "• Prices are quoted strictly on FOB Dhaka (Airport / Port) basis. NO SHIPPING OR FREIGHT CHARGES are included herein.",
    "• Shipping arrangements (Air Express via Aramex or Discussed Directly) will be quoted separately upon formal order placement.",
    "• Minimum Order Quantity (MOQ) must be satisfied per production run. Quality standard: AQL 2.5 Major / 4.0 Minor.",
  ];
  noticeLines.forEach((line, lineIdx) => {
    doc.text(line, margin + 3, y + 8 + lineIdx * 3.1);
  });

  y += 22;

  // 7. Commercial Terms & Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Commercial Settlement & Quality Guarantee:", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text("• Payment: 100% Advance T/T or Irrevocable Confirmed L/C at sight for bulk production.", margin, y + 4);
  doc.text("• Currency: All values stated in United States Dollars (USD) exclusively.", margin, y + 7.5);
  doc.text("• Inspection: Buyer third-party inspection (SGS / Intertek / Bureau Veritas) welcomed prior to dispatch.", margin, y + 11);

  // Signatory line on the right
  const sigX = pageWidth - margin - 60;
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.line(sigX, y + 10, sigX + 58, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Export Representative", sigX, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  // Dynamic Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const pgIndex = pageIndex !== undefined && totalPages !== undefined ? `${pageIndex}.${i}` : `${i}`;
    const pgTotal = totalPages !== undefined ? `${totalPages}` : `${pageCount}`;
    doc.text(
      `AYAAN CLOTHING • Commercial Offer Reference: ${offerNumber} • Generated on ${new Date().toISOString().slice(0, 10)} • Page ${pgIndex} of ${pgTotal}`,
      margin,
      297 - 6
    );
  }

  return doc;
}

/**
 * Trigger download of Offer Sheet PDF in browser (asynchronously loads image gallery if available).
 */
export async function downloadProductOfferSheetPDF(
  product: OfferSheetProductInput,
  buyerInfo?: { name?: string; company?: string; email?: string; country?: string },
  selectedQty?: number
) {
  // Collect all available image sources for gallery
  const imageSources: string[] = [];
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && !imageSources.includes(img)) imageSources.push(img);
    });
  }
  if (product.imageUrl && !imageSources.includes(product.imageUrl)) {
    imageSources.unshift(product.imageUrl);
  }
  if (product.image && !imageSources.includes(product.image)) {
    imageSources.unshift(product.image);
  }

  // Fallback: If no images provided, check mockStore
  if (imageSources.length === 0 && (product.sku || product.name)) {
    try {
      const { mockStore } = await import("@/lib/mock-data/mock-store");
      const found = mockStore.getProducts().find(
        (p) =>
          (product.sku && p.sku?.toUpperCase() === product.sku.toUpperCase()) ||
          (product.name && p.name.toLowerCase() === product.name.toLowerCase())
      );
      if (found && found.images && found.images.length > 0) {
        found.images.forEach((img) => {
          if (img && !imageSources.includes(img)) imageSources.push(img);
        });
      }
    } catch {
      // fallback
    }
  }

  let galleryDataUrls: string[] = product.galleryDataUrls || [];
  let mainDataUrl = product.imageDataUrl || null;

  if (galleryDataUrls.length === 0 && imageSources.length > 0) {
    const loaded = await Promise.all(
      imageSources.map((s) => loadImageAsDataUrl(s))
    );
    galleryDataUrls = loaded.filter((u): u is string => Boolean(u));
  }

  if (!mainDataUrl && galleryDataUrls.length > 0) {
    mainDataUrl = galleryDataUrls[0];
  } else if (!mainDataUrl && imageSources.length > 0) {
    mainDataUrl = await loadImageAsDataUrl(imageSources[0]);
  }

  const doc = generateProductOfferSheetDoc(
    { ...product, imageDataUrl: mainDataUrl, galleryDataUrls },
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
    
    const imageSources: string[] = [];
    if (item.product_images && item.product_images.length > 0) {
      item.product_images.forEach((img: string) => {
        if (img && !imageSources.includes(img)) imageSources.push(img);
      });
    }
    const imageSource = item.product_image_url || null;
    if (imageSource && !imageSources.includes(imageSource)) {
      imageSources.unshift(imageSource);
    }

    const loadedUrls = await Promise.all(
      imageSources.map((s) => loadImageAsDataUrl(s))
    );
    const galleryDataUrls = loadedUrls.filter((u): u is string => Boolean(u));
    const mainDataUrl = galleryDataUrls[0] || (imageSource ? await loadImageAsDataUrl(imageSource) : null);

    const productInput: OfferSheetProductInput = {
      name: item.product_name || "Garment",
      sku: item.sku,
      price: item.unit_price || 0,
      moq: item.quantity,
      imageUrl: imageSource || undefined,
      images: imageSources,
      imageDataUrl: mainDataUrl,
      galleryDataUrls,
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
export function generateProformaInvoiceDoc(order: OrderRecord): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

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
  doc.text(BUSINESS_PROFILE.name, margin + 4, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${BUSINESS_PROFILE.description} • Est. ${BUSINESS_PROFILE.establishedYear}`,
    margin + 4,
    y + 12.5
  );
  doc.text(
    `${BUSINESS_PROFILE.address.formatted}`,
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
  doc.text("Official Commercial P.I. (USD)", pageWidth - margin - 54, y + 15);

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
  doc.text(BUSINESS_PROFILE.name, margin + 3, y + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text("House #33 (2nd floor), Road #12, Sector #11", margin + 3, y + 13.5);
  doc.text("Uttara, Dhaka-1230, Bangladesh", margin + 3, y + 17.5);
  doc.text("Country of Origin: Bangladesh", margin + 3, y + 21.5);
  doc.text(`Contact: export@ayaanclothing.com`, margin + 3, y + 25.5);
  doc.text("Web: www.ayaanclothing.com", margin + 3, y + 29.5);

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

  // 3. Invoice Reference Bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");

  const piNumber = `PI-${order.order_number}`;
  const issueDate = formatDate(order.placed_at || order.created_at);
  const validityDate = getExpiryDate(order.placed_at || order.created_at);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("P.I. Number:", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(piNumber, margin + 22, y + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Order Reference:", margin + 55, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.order_number, margin + 80, y + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Issue Date:", margin + 118, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(issueDate, margin + 135, y + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Validity:", margin + 3, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`30 Days (${validityDate})`, margin + 18, y + 9.5);

  doc.setFont("helvetica", "bold");
  doc.text("Shipping Arrangement:", margin + 55, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.text(isAramex ? "Air Cargo Express (Aramex)" : "To Be Confirmed Separately", margin + 88, y + 9.5);

  doc.setFont("helvetica", "bold");
  doc.text("Payment Terms:", margin + 118, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.text("100% Advance T/T Wire", margin + 142, y + 9.5);

  y += 15;

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
  doc.text(BUSINESS_PROFILE.banking.bankName || "Pubali Bank Limited", margin + 24, y + 9.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account Title:", margin + 85, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.accountTitle || "M/S AYAAN  CLOTHING", margin + 108, y + 9.5);

  // Row 2: Account No & SWIFT CODE
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account No:", margin + 3, y + 14.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.accountNo || "1788-901-044316", margin + 24, y + 14.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("SWIFT CODE:", margin + 85, y + 14.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.swiftCode || "PUBABDDH210", margin + 108, y + 14.5);

  // Row 3: Bank Address
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Address:", margin + 3, y + 19.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text("Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh", margin + 24, y + 19.5);

  y += bankBlockHeight + 4;

  // 7. Signatory & Seal Block
  const sigX = pageWidth - margin - 65;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 8, sigX + 60, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signatory & Export Seal", sigX, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Ayaan Clothing Ltd • Dhaka, Bangladesh", sigX, y + 15.5);

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
 * Trigger immediate download of Proforma Invoice PDF in browser.
 */
export function downloadProformaInvoicePDF(order: OrderRecord) {
  const doc = generateProformaInvoiceDoc(order);
  const cleanOrderNum = (order.order_number || "ORDER")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `AYAAN_PI_${cleanOrderNum}.pdf`;
  doc.save(filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERIC COMMERCIAL DOCUMENT PDF (For Document Viewer & Admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function downloadCommercialDocumentPDF(docData: CommercialDocument) {
  if (docData.docType === "ORDER_SHEET") {
    // Generate as Offer Sheet with full product gallery
    const firstItem = docData.items[0];
    const gallery = docData.product_gallery && docData.product_gallery.length > 0
      ? docData.product_gallery
      : firstItem?.product_images && firstItem.product_images.length > 0
      ? firstItem.product_images
      : firstItem?.product_image_url
      ? [firstItem.product_image_url]
      : [];

    const product: OfferSheetProductInput = {
      name: firstItem?.description || "Garment Item",
      sku: firstItem?.sku || docData.docNumber,
      price: firstItem?.unitPrice || (docData.subtotal / (firstItem?.quantity || 1)),
      moq: firstItem?.quantity || 10,
      imageUrl: firstItem?.product_image_url || gallery[0],
      images: gallery,
      packageBreakdown: firstItem?.package_breakdown,
    };
    await downloadProductOfferSheetPDF(product, {
      name: docData.buyerName,
      company: docData.companyName,
      email: docData.buyerEmail,
      country: docData.buyerCountry,
    });
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

  downloadProformaInvoicePDF(pseudoOrder);
}
