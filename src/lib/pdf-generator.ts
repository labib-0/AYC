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

  if (existingDoc && (pageIndex === undefined || pageIndex > 1)) {
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

  // 3. PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES (Full-Width Multi-Image 3:4 Grid)
  // Canonical 3:4 ratio reference (3:4 ratio standard for document thumbnails/tiles)
  const thumbW = 12; const thumbH = 16;
  void thumbW; void thumbH;

  const galleryImages: string[] = [];
  // 3.1 Primary Image first
  const primaryImg = product.imageDataUrl || product.imageUrl || product.image;
  if (primaryImg && typeof primaryImg === "string" && primaryImg.trim().length > 0) {
    galleryImages.push(primaryImg);
  }

  // 3.2 Secondary Gallery Data URLs in order
  if (product.galleryDataUrls && product.galleryDataUrls.length > 0) {
    product.galleryDataUrls.forEach((g) => {
      if (g && typeof g === "string" && g.trim().length > 0 && !galleryImages.includes(g)) {
        galleryImages.push(g);
      }
    });
  }

  // 3.3 Secondary Product Images in order
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && typeof img === "string" && img.trim().length > 0 && !galleryImages.includes(img)) {
        galleryImages.push(img);
      }
    });
  }

  // Section Header Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES", margin, y);
  y += 3.5;

  if (galleryImages.length === 0) {
    // Compact "No product images available" fallback
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("No product images available.", margin + 4, y + 7.5);
    y += 16;
  } else {
    // Grid: 4 columns if <= 4 images; 5 columns if >= 5 images
    const cols = galleryImages.length <= 4 ? 4 : 5;
    const gap = 3; // mm
    const tileW = (contentWidth - (cols - 1) * gap) / cols;
    const tileH = tileW * (4 / 3); // Canonical 3:4 ratio

    let curCol = 0;

    for (let i = 0; i < galleryImages.length; i++) {
      const imgData = galleryImages[i];

      // Check if we need to advance to a new row
      if (i > 0 && i % cols === 0) {
        // Check if next row fits on current page (A4 height: 297mm)
        if (y + tileH + gap + tileH > 297 - margin - 15) {
          doc.addPage();
          y = margin;
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, y, contentWidth, 7, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text(`PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES (CONTINUED) • Ref: ${offerNumber}`, margin + 4, y + 4.8);
          y += 11;
        } else {
          y += tileH + gap;
        }
        curCol = 0;
      }

      const tileX = margin + curCol * (tileW + gap);
      const tileY = y;

      // Draw bounding 3:4 frame tile
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(tileX, tileY, tileW, tileH, 1.5, 1.5, "FD");

      // Draw image with non-destructive contain inside tile
      const pad = 1.2; // mm padding inside tile
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
          // If image cannot be rendered (e.g. invalid string or unsupported format),
          // skip safely without crashing the document
        }
      }

      curCol++;
    }

    // Advance y past the last row of images
    y += tileH + 6;
  }

  // Check if Section 1 fits on current page (Section 1 table needs ~55mm)
  if (y + 55 > 297 - margin) {
    doc.addPage();
    y = margin;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`AYAAN CLOTHING • Commercial Offer Reference: ${offerNumber} (Continued)`, margin + 4, y + 4.8);
    y += 11;
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
  // Collect all available image sources for gallery: primary first, followed by secondary images
  const imageSources: string[] = [];
  const primarySrc = product.imageUrl || product.image;
  if (primarySrc && typeof primarySrc === "string" && primarySrc.trim().length > 0) {
    imageSources.push(primarySrc);
  }
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && typeof img === "string" && img.trim().length > 0 && !imageSources.includes(img)) {
        imageSources.push(img);
      }
    });
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
    const imageSource = item.product_image_url || null;
    if (imageSource && typeof imageSource === "string" && imageSource.trim().length > 0) {
      imageSources.push(imageSource);
    }
    if (item.product_images && item.product_images.length > 0) {
      item.product_images.forEach((img: string) => {
        if (img && typeof img === "string" && img.trim().length > 0 && !imageSources.includes(img)) {
          imageSources.push(img);
        }
      });
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

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("AYAAN CLOTHING", margin + 5, y + 8);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("Ready-made Garments Manufacturer & Global Exporter • Dhaka, Bangladesh", margin + 5, y + 13.5);

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
  doc.text("M/S AYAAN CLOTHING", margin + 3, y + 9);
  doc.text("House #33, Road #12, Sector #11, Uttara", margin + 3, y + 12.5);
  doc.text("Dhaka-1230, Bangladesh", margin + 3, y + 16);
  doc.text("Email: export@ayaanclothing.com", margin + 3, y + 19.5);
  doc.text("Factory / Reg: BGMEA / EPB Certified Exporter", margin + 3, y + 23);

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

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Name:", margin + 3, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.bankName || "Pubali Bank Limited", margin + 22, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account Title:", margin + 80, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.accountTitle || "M/S AYAAN CLOTHING", margin + 102, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account No:", margin + 3, y + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.accountNo || "1788-901-044316", margin + 22, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("SWIFT CODE:", margin + 80, y + 13.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(BUSINESS_PROFILE.banking.swiftCode || "PUBABDDH210", margin + 102, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Bank Address:", margin + 3, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text("Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh", margin + 22, y + 18);

  y += bankBlockHeight + 4;

  // Signatory & Seal
  const sigX = pageWidth - margin - 65;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 7, sigX + 60, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signatory & Export Seal", sigX, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Ayaan Clothing Ltd • Dhaka, Bangladesh", sigX, y + 14.5);

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

  if (docData.docType === "COMMERCIAL_INVOICE") {
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

  downloadProformaInvoicePDF(pseudoOrder);
}
