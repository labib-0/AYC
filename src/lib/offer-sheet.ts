import BUSINESS_PROFILE from "@/config/business-profile";
import { mockStore } from "@/lib/mock-data/mock-store";
import { deduplicateMediaUrls } from "@/lib/media";
import { calculateCartonCbm } from "@/lib/services/shipping-package";
import type { ShippingPackageProfile } from "@/types";

export interface OfferSheetPricingTier {
  tierName: "Standard" | "Bulk" | "Full Stock";
  quantityBasis: string;
  unitPrice: number;
  totalPrice: number | null;
  isAvailable: boolean;
}

export interface OfferSheetSpecification {
  label: string;
  value: string;
}

export interface OfferSheetSpecificationTiles {
  designType: string;
  material: string;
  size: string;
  colour: string;
}

export interface OfferSheetLogistics {
  cbm: string | null;
  grossWeight: string | null;
  cbmMoq: string | null;
  grossWeightMoq: string | null;
  moq: number | null;
  unit: string;
  isConfigured: boolean;
}

export interface OfferSheetProductItem {
  id?: string;
  name: string;
  sku: string;
  brand?: string;
  description?: string;
  descriptionAttributes?: { label: string; value: string }[];
  specificationTiles: OfferSheetSpecificationTiles;
  logistics: OfferSheetLogistics;
  images: string[];
  primaryImageUrl?: string;
  specifications: OfferSheetSpecification[];
  pricingTiers: OfferSheetPricingTier[];
  unit: string;
  rawProduct?: any;
}

export interface OfferSheetData {
  id: string;
  docNumber: string;
  docType: "OFFER_SHEET";
  title: "OFFER SHEET";
  date: string;
  validUntil: string;
  priceBasis: string;
  seller: {
    name: string;
    description: string;
    address: string;
    email: string;
    country: string;
    establishedYear: number | string;
    signatoryTitle: string;
    signatoryDivision: string;
  };
  exporter?: {
    name: string;
    description: string;
    address: string;
    email: string;
    country: string;
    establishedYear: number | string;
    signatoryTitle: string;
    signatoryDivision: string;
  };
  commercialTerms: string[];
  products: OfferSheetProductItem[];
}

/**
 * Authoritative consolidated commercial terms for Offer Sheets.
 * Strictly free of fabricated ISO / factory certifications or quality claims.
 * Explicitly omits any mention of "ISO99" or fabricated standards.
 */
export const CONSOLIDATED_OFFER_SHEET_COMMERCIAL_TERMS: string[] = [
  "Freight & Shipping Terms: All prices quoted on FOB Dhaka (Port / Airport) basis. Ocean / Air freight charges are negotiated and quoted separately.",
  "Document Nature: Official Offer Sheet and product presentation schedule; this document does not constitute a tax invoice.",
  "Validity: Quotation valid for order placement within 30 calendar days from the date of issuance.",
  "Payment Terms: 100% Advance Bank Wire Transfer (T/T) or Irrevocable Confirmed Letter of Credit (L/C) at sight.",
  "Inspection & Quality: Pre-shipment commercial inspection by buyer or nominated inspection agency welcomed prior to dispatch.",
];

/**
 * Helper to format package breakdown into a concise string representation
 */
export function formatPackageBreakdownText(breakdown?: any): string | null {
  if (!breakdown) return null;
  if (typeof breakdown === "string" && breakdown.trim()) return breakdown.trim();

  if (Array.isArray(breakdown)) {
    const items = breakdown
      .filter((b) => b && (b.quantity || b.qty || b.count))
      .map((b) => {
        const color = b.color ? `${b.color} ` : "";
        const size = b.size ? `${b.size}` : "";
        const qty = b.quantity || b.qty || b.count || 0;
        return `${color}${size}: ${qty}`.trim();
      })
      .filter(Boolean);
    if (items.length > 0) {
      return items.join(" • ");
    }
  }

  if (typeof breakdown === "object") {
    const entries = Object.entries(breakdown).filter(([, v]) => Boolean(v));
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(" • ");
    }
  }

  return null;
}

/**
 * Cleans the product title for Offer Sheet display by removing automatically appended
 * size and assortment suffixes (e.g., "(Size: Standard Assorted)" or "(Assorted Package)").
 * Never alters the database product, SKU, or actual product description/attributes.
 */
export function cleanOfferSheetProductTitle(title: string | undefined | null): string {
  if (!title || typeof title !== "string") return "Garment Product";
  return title
    .replace(/\s*\((?:Size|Assorted)[^)]*\)/gi, "")
    .replace(/\s*-\s*Size:\s*[^-,]+/gi, "")
    .replace(/\s*\(Assorted(?:\s+Package)?\)/gi, "")
    .replace(/\s*-\s*Assorted(?:\s+Package)?/gi, "")
    .trim();
}

/**
 * Extracts the product's actual saved description and populated descriptive attributes.
 * Strictly avoids inventing garment specifications, fake GSM values, or fallback claims.
 */
export function extractProductDescriptionAndAttributes(product: any): {
  description: string;
  attributes: { label: string; value: string }[];
} {
  if (!product) return { description: "", attributes: [] };

  const rawDesc = product.description || product.shortDescription || product.short_description || "";
  const description = typeof rawDesc === "string" ? rawDesc.trim() : "";

  const attributes: { label: string; value: string }[] = [];

  // Brand (where genuinely configured)
  const brand = product.brand?.name || product.brand || product.brandName || product.brand_name;
  if (brand && typeof brand === "string" && brand.trim() && !brand.toLowerCase().includes("generic")) {
    attributes.push({ label: "Brand", value: brand.trim() });
  }

  // Colours
  const rawColors =
    product.colourDescription ??
    product.colour_description ??
    (Array.isArray(product.colors) && product.colors.length > 0 ? product.colors.join(", ") : null) ??
    (typeof product.color === "string" && product.color.trim() ? product.color.trim() : null);
  if (rawColors && typeof rawColors === "string" && rawColors.trim()) {
    attributes.push({ label: "Colours", value: rawColors.trim() });
  }

  // Available Sizes
  const rawSizes =
    product.sizeDescription ??
    product.size_description ??
    (Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes.join(", ") : null);
  if (rawSizes && typeof rawSizes === "string" && rawSizes.trim()) {
    attributes.push({ label: "Available Sizes", value: rawSizes.trim() });
  }

  // Fabric / Composition
  const material = product.material || product.fabric || product.composition;
  if (material && typeof material === "string" && material.trim()) {
    attributes.push({ label: "Fabric / Composition", value: material.trim() });
  }

  // Fabric Type
  const fabricType = product.fabricType ?? product.fabric_type;
  if (fabricType && typeof fabricType === "string" && fabricType.trim()) {
    attributes.push({ label: "Fabric Type", value: fabricType.trim() });
  }

  // GSM (ONLY when actually configured; NEVER invent)
  const gsm = product.gsm ?? product.fabric_gsm;
  if (gsm !== undefined && gsm !== null && String(gsm).trim() && !isNaN(Number(gsm)) && Number(gsm) > 0) {
    attributes.push({ label: "GSM", value: `${gsm} GSM` });
  }

  // Package Assortment (if configured)
  const assortmentMessage = product.packageAssortmentMessage ?? product.package_assortment_message;
  if (assortmentMessage && typeof assortmentMessage === "string" && assortmentMessage.trim()) {
    attributes.push({ label: "Package Assortment", value: assortmentMessage.trim() });
  }

  return {
    description,
    attributes,
  };
}

/**
 * Extracts the four canonical specification rows shown on the Offer Sheet:
 * 1. Design Type
 * 2. Material
 * 3. Size
 * 4. Colour
 *
 * Uses actual configured value when present, or strictly "See Description" as fallback.
 * Strictly avoids em dashes, hyphens, blank values, or "Not configured".
 */
export function extractProductSpecificationTiles(product: any): OfferSheetSpecificationTiles {
  if (!product) {
    return {
      designType: "See Description",
      material: "See Description",
      size: "See Description",
      colour: "See Description",
    };
  }

  const isMissing = (val: any): boolean => {
    if (val === undefined || val === null) return true;
    const str = String(val).trim();
    if (
      !str ||
      str === "—" ||
      str === "-" ||
      str === "–" ||
      str.toLowerCase() === "n/a" ||
      str.toLowerCase() === "not configured" ||
      str.toLowerCase() === "null" ||
      str.toLowerCase() === "undefined" ||
      str.toLowerCase() === "in description" ||
      str.toLowerCase() === "see description"
    ) {
      return true;
    }
    return false;
  };

  // 1. Design Type: e.g. "ORIGINAL" or "MASTER COPY"
  const rawDesignType = product.designType ?? product.design_type;
  const designType = isMissing(rawDesignType)
    ? "See Description"
    : (String(rawDesignType).trim().toUpperCase() === "MASTER COPY"
        ? "MASTER COPY"
        : String(rawDesignType).trim());

  // 2. Material: e.g. "100% Cotton" or actual configured value
  const rawMaterial = product.material || product.fabric || product.composition;
  const material = isMissing(rawMaterial) ? "See Description" : String(rawMaterial).trim();

  // 3. Size: explicit admin entry only (e.g. "S, M, L, XL" or "Standard Assorted")
  const rawSize =
    product.sizeDescription ??
    product.size_description ??
    (Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes.join(", ") : null) ??
    (typeof product.size === "string" && product.size.trim() ? product.size.trim() : null);
  const size = isMissing(rawSize) ? "See Description" : String(rawSize).trim();

  // 4. Colour: explicit admin entry only (matching storefront's Product Specifications, fallback to See Description)
  const rawColour =
    product.colourDescription ??
    product.colour_description ??
    (typeof product.color === "string" && product.color.trim() ? product.color.trim() : null) ??
    (Array.isArray(product.colors) && product.colors.length > 0 ? product.colors.join(", ") : null) ??
    (product.colorName || product.color_name || null);
  const colour = isMissing(rawColour) ? "See Description" : String(rawColour).trim();

  return {
    designType,
    material,
    size,
    colour,
  };
}

/**
 * Dynamically computes and displays CBM and Gross Weight corresponding strictly
 * to the MOQ basis using existing carton-based packaging logic.
 */
export function extractProductLogistics(product: any, moqQuantity?: number): OfferSheetLogistics {
  if (!product) {
    return { cbm: null, grossWeight: null, cbmMoq: null, grossWeightMoq: null, moq: null, unit: "PCS", isConfigured: false };
  }

  const unit = (product.unit || product.purchaseUnit || product.purchase_unit || "PCS").trim().toUpperCase();
  const rawMoq = Number(moqQuantity ?? product.moq);
  const moq = !isNaN(rawMoq) && rawMoq > 0 ? rawMoq : 1;

  // 1. Direct explicit snapshot fields if already configured on product or order
  if (product.moqCbm !== undefined && product.moqGrossWeight !== undefined) {
    const cbmStr = `${Number(product.moqCbm).toFixed(3)} m³`;
    const gwStr = `${Number(product.moqGrossWeight).toFixed(product.moqGrossWeight % 1 === 0 ? 0 : 1)} KG`;
    return {
      cbm: cbmStr,
      grossWeight: gwStr,
      cbmMoq: cbmStr,
      grossWeightMoq: gwStr,
      moq,
      unit,
      isConfigured: true,
    };
  }

  // 2. Shipping Package Profiles calculation matching ProductSelectedLogisticsRow
  const profiles: ShippingPackageProfile[] =
    product.shippingPackageProfiles ||
    product.shipping_package_profiles ||
    product.shipping_packages ||
    [];

  const activeProfiles = (profiles || []).filter((p: any) => p && p.is_active !== false);
  const validProfiles = activeProfiles.filter(
    (p: any) =>
      (Number(p.gross_weight) > 0 || Number(p.total_gross_weight) > 0) &&
      (Number(p.carton_length) > 0 || Number(p.total_cbm) > 0)
  );

  if (validProfiles.length > 0) {
    const sortedProfiles = [...validProfiles].sort(
      (a, b) => Number(a.package_quantity || 0) - Number(b.package_quantity || 0)
    );

    // Exact MOQ match
    const exactMatch = sortedProfiles.find(
      (p) => Number(p.package_quantity) === moq && (p.quantity_max === undefined || p.quantity_max === null)
    );

    if (exactMatch) {
      const cartonCount = Math.max(1, Number(exactMatch.carton_count) || 1);
      const singleCartonCbm = calculateCartonCbm(
        Number(exactMatch.carton_length || 0),
        Number(exactMatch.carton_width || 0),
        Number(exactMatch.carton_height || 0),
        (exactMatch.dimension_unit as "cm" | "in" | "m") || "cm"
      );
      const totalCbm =
        exactMatch.total_cbm && Number(exactMatch.total_cbm) > 0
          ? Number(exactMatch.total_cbm)
          : singleCartonCbm * cartonCount;
      const totalGrossWeight =
        exactMatch.total_gross_weight && Number(exactMatch.total_gross_weight) > 0
          ? Number(exactMatch.total_gross_weight)
          : Number(exactMatch.gross_weight || 0) * cartonCount;
      const weightUnit = (exactMatch.weight_unit || "kg").toUpperCase();

      const cbmStr = `${totalCbm.toFixed(3)} m³`;
      const gwStr = `${totalGrossWeight % 1 === 0 ? totalGrossWeight.toFixed(0) : totalGrossWeight.toFixed(1)} ${weightUnit}`;
      return {
        cbm: cbmStr,
        grossWeight: gwStr,
        cbmMoq: cbmStr,
        grossWeightMoq: gwStr,
        moq,
        unit,
        isConfigured: true,
      };
    }

    // Range match
    const rangeMatch = sortedProfiles.find((p) => {
      if (p.quantity_max !== undefined && p.quantity_max !== null) {
        return moq >= Number(p.package_quantity) && moq <= Number(p.quantity_max);
      }
      return false;
    });

    if (rangeMatch) {
      const cartonCount = Math.max(1, Number(rangeMatch.carton_count) || 1);
      const singleCartonCbm = calculateCartonCbm(
        Number(rangeMatch.carton_length || 0),
        Number(rangeMatch.carton_width || 0),
        Number(rangeMatch.carton_height || 0),
        (rangeMatch.dimension_unit as "cm" | "in" | "m") || "cm"
      );
      const totalCbm =
        rangeMatch.total_cbm && Number(rangeMatch.total_cbm) > 0
          ? Number(rangeMatch.total_cbm)
          : singleCartonCbm * cartonCount;
      const totalGrossWeight =
        rangeMatch.total_gross_weight && Number(rangeMatch.total_gross_weight) > 0
          ? Number(rangeMatch.total_gross_weight)
          : Number(rangeMatch.gross_weight || 0) * cartonCount;
      const weightUnit = (rangeMatch.weight_unit || "kg").toUpperCase();

      const cbmStr = `${totalCbm.toFixed(3)} m³`;
      const gwStr = `${totalGrossWeight % 1 === 0 ? totalGrossWeight.toFixed(0) : totalGrossWeight.toFixed(1)} ${weightUnit}`;
      return {
        cbm: cbmStr,
        grossWeight: gwStr,
        cbmMoq: cbmStr,
        grossWeightMoq: gwStr,
        moq,
        unit,
        isConfigured: true,
      };
    }

    // Base profile derivation
    const baseProfile = sortedProfiles[0];
    const basePkgQty = Math.max(1, Number(baseProfile.package_quantity) || moq || 1);
    const cartonsPerPkg = Math.max(1, Number(baseProfile.carton_count) || 1);
    const piecesPerCarton = Math.max(1, Math.round(basePkgQty / cartonsPerPkg));
    const requiredCartons = Math.ceil(moq / piecesPerCarton);

    const singleCartonCbm = calculateCartonCbm(
      Number(baseProfile.carton_length || 0),
      Number(baseProfile.carton_width || 0),
      Number(baseProfile.carton_height || 0),
      (baseProfile.dimension_unit as "cm" | "in" | "m") || "cm"
    );
    const grossWeightPerCarton =
      Number(baseProfile.gross_weight) > 0
        ? Number(baseProfile.gross_weight)
        : Number(baseProfile.total_gross_weight || 0) / cartonsPerPkg;

    const totalCbm = singleCartonCbm * requiredCartons;
    const totalGrossWeight = grossWeightPerCarton * requiredCartons;
    const weightUnit = (baseProfile.weight_unit || "kg").toUpperCase();

    const cbmStr = `${totalCbm.toFixed(3)} m³`;
    const gwStr = `${totalGrossWeight % 1 === 0 ? totalGrossWeight.toFixed(0) : totalGrossWeight.toFixed(1)} ${weightUnit}`;
    return {
      cbm: cbmStr,
      grossWeight: gwStr,
      cbmMoq: cbmStr,
      grossWeightMoq: gwStr,
      moq,
      unit,
      isConfigured: true,
    };
  }

  // 3. Direct packaging/snapshot values if present
  const directCbm = product.cbm ?? product.total_cbm ?? product.shipping_snapshot?.cbm;
  const directWeight = product.grossWeight ?? product.gross_weight ?? product.total_gross_weight ?? product.shipping_snapshot?.gross_weight;

  if (directCbm !== undefined && directCbm !== null && !isNaN(Number(directCbm)) && Number(directCbm) > 0) {
    const formattedWeight =
      directWeight !== undefined && directWeight !== null && !isNaN(Number(directWeight)) && Number(directWeight) > 0
        ? `${Number(directWeight) % 1 === 0 ? Number(directWeight).toFixed(0) : Number(directWeight).toFixed(1)} KG`
        : null;
    const cbmStr = `${Number(directCbm).toFixed(3)} m³`;
    return {
      cbm: cbmStr,
      grossWeight: formattedWeight,
      cbmMoq: cbmStr,
      grossWeightMoq: formattedWeight,
      moq,
      unit,
      isConfigured: true,
    };
  }

  return {
    cbm: null,
    grossWeight: null,
    cbmMoq: null,
    grossWeightMoq: null,
    moq,
    unit,
    isConfigured: false,
  };
}

/**
 * Extracts ONLY genuine, non-empty specifications stored in the product record.
 * STRICTLY omits GSM per Requirement 1 (products no longer use GSM as a required specification).
 * STRICTLY omits absent or empty attributes without fabricating fallback values.
 * Never invents certifications, manufacturing standards, quality claims, or lead times.
 */
export function extractProductSpecifications(product: any): OfferSheetSpecification[] {
  if (!product) return [];
  const specs: OfferSheetSpecification[] = [];
  const unit = (product.unit || product.purchaseUnit || product.purchase_unit || "PCS").trim().toUpperCase();

  // 1. Brand / Manufacturer (only if genuine and present)
  const brand = product.brand?.name || product.brand || product.brandName || product.brand_name;
  if (brand && typeof brand === "string" && brand.trim() && !brand.toLowerCase().includes("generic")) {
    specs.push({ label: "Brand / Manufacturer", value: brand.trim() });
  }

  // 2. Design Type (e.g. "ORIGINAL" or "MASTER COPY")
  const designType = product.designType ?? product.design_type;
  if (designType && typeof designType === "string" && designType.trim()) {
    specs.push({ label: "Design Type", value: designType.trim() });
  }

  // 3. Target Demographic / Audience (e.g. "MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX")
  const audience = product.audience;
  if (audience && typeof audience === "string" && audience.trim()) {
    specs.push({ label: "Target Audience", value: audience.trim().toUpperCase() });
  }

  // 4. Product Type / Category
  const productType = product.productType ?? product.product_type ?? product.categoryName ?? product.category?.name ?? product.category;
  if (productType && typeof productType === "string" && productType.trim()) {
    specs.push({ label: "Product Type", value: productType.trim() });
  }

  // 5. Material / Composition / Fabric (Never fabricate "100% Cotton")
  const material = product.material || product.fabric || product.composition;
  if (material && typeof material === "string" && material.trim()) {
    specs.push({ label: "Material / Fabric", value: material.trim() });
  }

  // NOTE: GSM is deliberately omitted per Requirement 1:
  // "Remove the currently generated GSM specification because our products no longer use GSM as a required specification."

  // 6. Fit & Construction
  const fit = product.fit;
  if (fit && typeof fit === "string" && fit.trim()) {
    specs.push({ label: "Fit & Construction", value: fit.trim() });
  }

  // 7. Available Sizes / Size Description
  const rawSizes = product.sizeDescription ?? product.size_description ??
    (Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes.join(", ") :
     (typeof product.sizes === "string" && product.sizes.trim() ? product.sizes.trim() : null));
  if (rawSizes && typeof rawSizes === "string" && rawSizes.trim()) {
    specs.push({ label: "Available Sizes", value: rawSizes.trim() });
  }

  // 8. Colors / Colour Description
  const rawColors = product.colourDescription ?? product.colour_description ?? product.colorName ?? product.color_name ??
    (Array.isArray(product.colors) && product.colors.length > 0 ? product.colors.join(", ") :
     (typeof product.colors === "string" && product.colors.trim() ? product.colors.trim() :
      (typeof product.color === "string" && product.color.trim() ? product.color.trim() : null)));
  if (rawColors && typeof rawColors === "string" && rawColors.trim()) {
    specs.push({ label: "Standard Colours", value: rawColors.trim() });
  }

  // 9. Package Assortment (only if configured and visible)
  const assortmentVisible = product.packageAssortmentVisible ?? product.package_assortment_visible;
  const assortmentMessage = product.packageAssortmentMessage ?? product.package_assortment_message;
  if (assortmentVisible !== false && assortmentMessage && typeof assortmentMessage === "string" && assortmentMessage.trim()) {
    specs.push({ label: "Package Assortment", value: assortmentMessage.trim() });
  } else if (product.packageBreakdown || product.package_breakdown) {
    const formattedPb = formatPackageBreakdownText(product.packageBreakdown || product.package_breakdown);
    if (formattedPb) {
      specs.push({ label: "Package Assortment", value: formattedPb });
    }
  }

  // 10. Export Packaging
  const packaging = product.packagingSpecs ?? product.packaging_specs;
  if (packaging && typeof packaging === "string" && packaging.trim()) {
    specs.push({ label: "Export Packaging", value: packaging.trim() });
  }

  // 11. Carton Dimensions
  if (product.cartonDimensions) {
    const { length, width, height, unit: dimUnit } = product.cartonDimensions;
    if (length && width && height) {
      specs.push({ label: "Carton Dimensions", value: `${length} × ${width} × ${height} ${dimUnit || "cm"}` });
    }
  }

  // 12. Unit / Gross Weight
  const weightGrams = product.weightGrams ?? product.weight_grams;
  if (weightGrams !== undefined && weightGrams !== null && !isNaN(Number(weightGrams)) && Number(weightGrams) > 0) {
    specs.push({ label: "Unit Weight", value: `${weightGrams} g` });
  } else if (product.grossWeight !== undefined && product.grossWeight !== null && !isNaN(Number(product.grossWeight)) && Number(product.grossWeight) > 0) {
    specs.push({ label: "Gross Weight", value: `${product.grossWeight} kg` });
  } else if (product.weight && typeof product.weight === "string" && product.weight.trim()) {
    specs.push({ label: "Weight", value: product.weight.trim() });
  }

  // 13. Minimum Order Quantity (MOQ)
  const moq = Number(product.moq);
  if (moq && !isNaN(moq) && moq > 0) {
    specs.push({ label: "Minimum Order Qty (MOQ)", value: `${moq} ${unit}` });
  }

  return specs;
}

/**
 * Extracts ONLY genuine, configured, and valid pricing tiers for the product:
 * - Standard Tier: Minimum Order Qty (MOQ) basis and configured wholesale/standard unit price.
 * - Bulk Tier: Rendered ONLY if bulk pricing is enabled and has valid bulk threshold & price.
 * - Full Stock Tier: Rendered ONLY if full stock price is configured, stock > 0, and eligible.
 *
 * Excludes disabled or unavailable tiers. Never invents bulk discounts, MSRP, or promotional prices.
 * Never exposes internal purchase or cost prices.
 * Preserves configured purchase unit (e.g. PCS).
 */
export function extractProductPricingTiers(product: any): OfferSheetPricingTier[] {
  if (!product) return [];
  const tiers: OfferSheetPricingTier[] = [];
  const unit = (product.unit || product.purchaseUnit || product.purchase_unit || "PCS").trim().toUpperCase();

  // Check if product already has explicit pricing tiers array (e.g. custom tiers or tests)
  const explicitTiers = product.pricingTiers || product.pricing_tiers;
  if (Array.isArray(explicitTiers) && explicitTiers.length > 0) {
    // If objects already follow OfferSheetPricingTier structure
    if (explicitTiers[0]?.tierName && explicitTiers[0]?.unitPrice !== undefined) {
      return explicitTiers.filter((t: any) => t.isAvailable !== false && Number(t.unitPrice) > 0);
    }
    // If objects have { minQuantity, maxQuantity?, price }
    if (explicitTiers[0]?.minQuantity !== undefined && explicitTiers[0]?.price !== undefined) {
      explicitTiers.forEach((pt: any, idx: number) => {
        const minQ = Number(pt.minQuantity) || 1;
        const price = Number(pt.price);
        if (price > 0) {
          const tierName: "Standard" | "Bulk" | "Full Stock" =
            idx === 0 ? "Standard" : idx === 1 ? "Bulk" : "Full Stock";
          const label =
            idx === 0
              ? `${minQ} ${unit} (Minimum Order)`
              : idx === 1
              ? `${minQ} ${unit} (Minimum Quantity)`
              : `${minQ}+ ${unit} (Volume Basis)`;
          tiers.push({
            tierName,
            quantityBasis: label,
            unitPrice: price,
            totalPrice: Math.round(price * minQ * 100) / 100,
            isAvailable: true,
          });
        }
      });
      if (tiers.length > 0) return tiers;
    }
  }

  // ── 1. STANDARD TIER ────────────────────────────────────────────────────────
  const standardPrice =
    product.standardPrice !== undefined && product.standardPrice !== null && !isNaN(Number(product.standardPrice)) && Number(product.standardPrice) > 0
      ? Number(product.standardPrice)
      : product.standard_price !== undefined && product.standard_price !== null && !isNaN(Number(product.standard_price)) && Number(product.standard_price) > 0
      ? Number(product.standard_price)
      : product.wholesalePrice !== undefined && product.wholesalePrice !== null && !isNaN(Number(product.wholesalePrice)) && Number(product.wholesalePrice) > 0
      ? Number(product.wholesalePrice)
      : product.wholesale_price !== undefined && product.wholesale_price !== null && !isNaN(Number(product.wholesale_price)) && Number(product.wholesale_price) > 0
      ? Number(product.wholesale_price)
      : product.price !== undefined && product.price !== null && !isNaN(Number(product.price)) && Number(product.price) > 0
      ? Number(product.price)
      : null;

  const rawMoq = product.moq !== undefined && product.moq !== null && !isNaN(Number(product.moq)) && Number(product.moq) > 0
    ? Number(product.moq)
    : product.minOrderQuantity !== undefined && product.minOrderQuantity !== null && !isNaN(Number(product.minOrderQuantity)) && Number(product.minOrderQuantity) > 0
    ? Number(product.minOrderQuantity)
    : product.min_order_quantity !== undefined && product.min_order_quantity !== null && !isNaN(Number(product.min_order_quantity)) && Number(product.min_order_quantity) > 0
    ? Number(product.min_order_quantity)
    : product.minimum_order_quantity !== undefined && product.minimum_order_quantity !== null && !isNaN(Number(product.minimum_order_quantity)) && Number(product.minimum_order_quantity) > 0
    ? Number(product.minimum_order_quantity)
    : null;

  if (standardPrice !== null && standardPrice > 0) {
    if (rawMoq !== null) {
      tiers.push({
        tierName: "Standard",
        quantityBasis: `${rawMoq} ${unit} (Minimum Order)`,
        unitPrice: standardPrice,
        totalPrice: Math.round(standardPrice * rawMoq * 100) / 100,
        isAvailable: true,
      });
    } else {
      // Valid unit price exists but quantity basis not specified; do NOT fabricate a fake MOQ!
      tiers.push({
        tierName: "Standard",
        quantityBasis: `Per ${unit} (Minimum Order)`,
        unitPrice: standardPrice,
        totalPrice: null,
        isAvailable: true,
      });
    }
  }

  // ── 2. BULK TIER ────────────────────────────────────────────────────────────
  const rawBulkMin = product.bulkThreshold ?? product.bulk_threshold ?? product.bulkMinimumQuantity ?? product.bulk_minimum_quantity;
  const bulkMin = rawBulkMin !== undefined && rawBulkMin !== null && !isNaN(Number(rawBulkMin)) && Number(rawBulkMin) > 0 ? Number(rawBulkMin) : null;
  const rawBulkPrice = product.bulkPrice ?? product.bulk_price ?? product.bulkUnitPrice ?? product.bulk_unit_price;
  const bulkPrice = rawBulkPrice !== undefined && rawBulkPrice !== null && !isNaN(Number(rawBulkPrice)) && Number(rawBulkPrice) > 0 ? Number(rawBulkPrice) : null;

  const bulkEnabled =
    product.bulkPricingEnabled === true ||
    product.bulk_pricing_enabled === true ||
    product.bulk_pricing_enabled === 1 ||
    product.bulk_pricing_enabled === "1" ||
    (Boolean((product.bulkThreshold || product.bulk_threshold) && (product.bulkPrice || product.bulk_price)));

  const isBulkValid = bulkEnabled && bulkPrice !== null && bulkPrice > 0;
  if (isBulkValid && bulkPrice !== null) {
    if (bulkMin !== null && bulkMin > 0) {
      tiers.push({
        tierName: "Bulk",
        quantityBasis: `${bulkMin} ${unit} (Minimum Quantity)`,
        unitPrice: bulkPrice,
        totalPrice: Math.round(bulkPrice * bulkMin * 100) / 100,
        isAvailable: true,
      });
    } else {
      tiers.push({
        tierName: "Bulk",
        quantityBasis: `Per ${unit} (Bulk Basis)`,
        unitPrice: bulkPrice,
        totalPrice: null,
        isAvailable: true,
      });
    }
  }

  // ── 3. FULL STOCK TIER ──────────────────────────────────────────────────────
  const availableStock = product.availableStock !== undefined && product.availableStock !== null
    ? Number(product.availableStock)
    : product.available_stock !== undefined && product.available_stock !== null
    ? Number(product.available_stock)
    : (product.stock !== undefined && product.stock !== null ? Number(product.stock) : null);

  const rawFsPrice = product.configuredFullStockPrice ?? product.fullStockPrice ?? product.full_stock_price;
  const fsPrice = rawFsPrice !== undefined && rawFsPrice !== null && !isNaN(Number(rawFsPrice)) && Number(rawFsPrice) > 0 ? Number(rawFsPrice) : null;
  const isExplicitlyEligible = product.isFullStockEligible ?? product.is_full_stock_eligible;

  let isFullStockValid = false;
  if (isExplicitlyEligible !== undefined) {
    isFullStockValid = Boolean(isExplicitlyEligible) && fsPrice !== null && availableStock !== null && availableStock > 0;
  } else if (fsPrice !== null && availableStock !== null && availableStock > 0) {
    isFullStockValid = true;
  }

  if (isFullStockValid && fsPrice !== null && availableStock !== null && availableStock > 0) {
    tiers.push({
      tierName: "Full Stock",
      quantityBasis: `${availableStock.toLocaleString()} ${unit} (Available Stock)`,
      unitPrice: fsPrice,
      totalPrice: Math.round(fsPrice * availableStock * 100) / 100,
      isAvailable: true,
    });
  }

  return tiers;
}

/**
 * Helper to find an authoritative product record from mockStore or cache by ID, SKU, or name.
 */
export function lookupProductRecord(identifier?: string | number | null): any {
  if (!identifier) return null;
  const idStr = String(identifier).trim();
  if (!idStr) return null;

  try {
    const products = mockStore.getProducts();
    const found = products.find(
      (p) =>
        String(p.id) === idStr ||
        (p.sku && p.sku.toUpperCase() === idStr.toUpperCase()) ||
        (p.slug && p.slug.toLowerCase() === idStr.toLowerCase()) ||
        (p.name && p.name.toLowerCase() === idStr.toLowerCase())
    );
    if (found) return found;
  } catch {
    // fallback if mockStore is not ready
  }

  return null;
}

/**
 * Builds the authoritative OfferSheetData model from any source:
 * - Direct product record / OfferSheetProductInput
 * - CommercialDocument payload from API or order
 * - OrderRecord with items
 *
 * Invariants:
 * - Product-based ONLY. Never contains buyer/customer name, address, or customer order references.
 * - Free of fabricated specifications or placeholder fallbacks (NO GSM, NO fake certifications).
 * - Complete Pricing Chart (Standard, Bulk, Full Stock as configured).
 * - Consolidated Commercial Terms.
 */
export function buildOfferSheetData(source: any): OfferSheetData {
  const today = new Date().toISOString().slice(0, 10);
  const exp = source?.exporter;
  const seller = {
    name: exp?.company_name || exp?.name || BUSINESS_PROFILE.name,
    description: exp?.tagline || exp?.business_type || BUSINESS_PROFILE.description,
    address: exp?.address || exp?.office_address || BUSINESS_PROFILE.address.formatted,
    email: exp?.email || BUSINESS_PROFILE.contact.email || "export@ayaanclothing.com",
    country: "Bangladesh",
    establishedYear: exp?.est_year || BUSINESS_PROFILE.establishedYear,
    signatoryTitle: exp?.signatory_title || source?.document_defaults?.signatory_title || "Authorized Representative",
    signatoryDivision: exp?.signatory_division || source?.document_defaults?.signatory_division || "Ayaan Clothing Export Division",
  };

  const validUntil = source?.validUntil || source?.valid_until || "30 Days from date of issuance";
  const priceBasis = "FOB Dhaka (Export)";

  const rawProducts: any[] = [];

  // Determine if source is an order/commercial document with items or a single product
  if (Array.isArray(source?.products) && source.products.length > 0) {
    rawProducts.push(...source.products);
  } else if (source?.product) {
    rawProducts.push(source.product);
  } else if (Array.isArray(source?.items) && source.items.length > 0) {
    source.items.forEach((item: any) => {
      // Look up authoritative product record if product_id or sku exists
      const prodId = item.product_id || item.productId || item.sku || item.description || item.product_name;
      const matched = lookupProductRecord(prodId) || item.rawProduct || item.product;
      if (matched) {
        rawProducts.push({
          ...matched,
          // preserve line item overrides only for genuine line details, never override product MOQ or pricing tiers with order selected quantity
          name: cleanOfferSheetProductTitle(matched.name || item.description || item.product_name),
          sku: matched.sku || item.sku,
          image: item.product_image_url || matched.image,
          images: matched.images && matched.images.length > 0 ? matched.images : (item.product_images || (item.product_image_url ? [item.product_image_url] : [])),
        });
      } else {
        // Construct from item directly
        rawProducts.push({
          id: item.product_id || item.id,
          name: cleanOfferSheetProductTitle(item.description || item.product_name || "Garment Product"),
          sku: item.sku || "AYN-EXP",
          price: item.price ?? item.standardPrice ?? item.standard_price ?? item.unitPrice ?? item.unit_price ?? 0,
          wholesalePrice: item.wholesalePrice ?? item.wholesale_price ?? item.unitPrice ?? item.unit_price ?? 0,
          moq: item.moq ?? item.minOrderQuantity ?? item.min_order_quantity ?? 10,
          bulkPricingEnabled: item.bulkPricingEnabled ?? item.bulk_pricing_enabled,
          bulkPrice: item.bulkPrice ?? item.bulk_price,
          bulkThreshold: item.bulkThreshold ?? item.bulk_threshold,
          fullStockPrice: item.fullStockPrice ?? item.full_stock_price,
          availableStock: item.availableStock ?? item.available_stock ?? item.stock,
          pricingTiers: item.pricingTiers || item.pricing_tiers,
          images: item.product_images || (item.product_image_url ? [item.product_image_url] : []),
          image: item.product_image_url,
          description: item.product_description || item.description || "",
          designType: item.designType || item.design_type,
          material: item.material,
          sizeDescription: item.sizeDescription || item.size,
          colourDescription: item.colourDescription || item.color,
          packageBreakdown: item.package_breakdown,
        });
      }
    });
  } else if (source?.name || source?.title || source?.sku) {
    // Single product input
    const prodId = source.id || source.sku || source.name;
    const matched = lookupProductRecord(prodId);
    if (matched) {
      rawProducts.push({
        ...matched,
        ...source,
        // Crucial: preserve authoritative pricing configurations from matched if source lacks them
        bulkPricingEnabled: source.bulkPricingEnabled ?? matched.bulkPricingEnabled,
        bulkPrice: source.bulkPrice ?? matched.bulkPrice,
        bulkThreshold: source.bulkThreshold ?? matched.bulkThreshold,
        fullStockPrice: source.fullStockPrice ?? matched.fullStockPrice,
        availableStock: source.availableStock ?? matched.availableStock,
        pricingTiers: source.pricingTiers ?? matched.pricingTiers,
        images: (source.images && source.images.length > 0) ? source.images : (matched.images || []),
      });
    } else {
      rawProducts.push(source);
    }
  }

  // Deduplicate products by SKU or Name
  const seenProductKeys = new Set<string>();
  const productItems: OfferSheetProductItem[] = [];

  for (const raw of rawProducts) {
    const key = (raw.sku || raw.id || raw.name || "item").toLowerCase().trim();
    if (seenProductKeys.has(key)) continue;
    seenProductKeys.add(key);

    const name = cleanOfferSheetProductTitle(raw.name || raw.title || raw.product_name || "Garment Product");
    const sku = (raw.sku || "AYN-PROD").toUpperCase();
    const brand = raw.brand || raw.brandName || "AYAAN CLOTHING";

    // Build deduplicated image list: primary first, followed by gallery images
    const rawImagesList: string[] = [];
    const primaryImg = raw.imageDataUrl || raw.imageUrl || raw.image || raw.product_image_url;
    if (primaryImg && typeof primaryImg === "string" && primaryImg.trim()) {
      rawImagesList.push(primaryImg.trim());
    }
    const secondaryImages = raw.galleryDataUrls || raw.images || raw.product_images;
    if (Array.isArray(secondaryImages)) {
      secondaryImages.forEach((img: any) => {
        const u = typeof img === "string" ? img : (img?.url || img?.dataUrl || img?.src || img?.image_url);
        if (u && typeof u === "string" && u.trim()) {
          rawImagesList.push(u.trim());
        }
      });
    }
    const images = deduplicateMediaUrls(rawImagesList);

    const specifications = extractProductSpecifications(raw);
    const pricingTiers = extractProductPricingTiers(raw);
    const unit = (raw.unit || raw.purchaseUnit || raw.purchase_unit || "PCS").trim().toUpperCase();
    const { description, attributes: descriptionAttributes } = extractProductDescriptionAndAttributes(raw);
    const specificationTiles = extractProductSpecificationTiles(raw);
    const logistics = extractProductLogistics(raw);

    productItems.push({
      id: raw.id ? String(raw.id) : undefined,
      name,
      sku,
      brand,
      description,
      descriptionAttributes,
      specificationTiles,
      logistics,
      images,
      primaryImageUrl: images[0] || undefined,
      specifications,
      pricingTiers,
      unit,
      rawProduct: raw,
    });
  }

  const primarySku = productItems[0]?.sku || "AYN";
  const docNumber = source?.docNumber || source?.doc_number || `OS-${primarySku}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return {
    id: source?.id || `doc_offer_${primarySku.toLowerCase()}`,
    docNumber,
    docType: "OFFER_SHEET",
    title: "OFFER SHEET",
    date: source?.date || today,
    validUntil,
    priceBasis,
    seller,
    exporter: seller,
    commercialTerms: CONSOLIDATED_OFFER_SHEET_COMMERCIAL_TERMS,
    products: productItems,
  };
}
