import { Product } from "@/types";
import { formatPrice } from "./formatters";

/**
 * Authoritative resolution of the lowest valid customer-facing unit price.
 * 
 * Priority & Comparison Rules:
 * 1. Checks authoritative backend field if present:
 *    - effectiveCustomerUnitPrice / effective_customer_unit_price
 *    - lowestCustomerUnitPrice / lowest_customer_unit_price
 * 2. Evaluates active purchasing tiers:
 *    - FULL STOCK PRICE — if Full Stock is available and eligible under authoritative inventory rules
 *    - BULK UNIT PRICE — if Bulk Pricing is enabled, bulk_minimum > moq, and bulk_price > 0
 *    - STANDARD UNIT PRICE — fallback standard wholesale price
 * 3. Compares all valid available candidate prices and returns the LOWEST real unit price.
 * 4. NEVER uses internal Purchase Price or Cost Price.
 * 5. NEVER converts missing prices to 0 or $0.00 (returns null for unpriced products).
 */
export function getLowestValidCustomerUnitPrice(product: Product | any | null | undefined): number | null {
  if (!product) return null;

  // 1. Authoritative Backend Field (if already evaluated by backend pricing service)
  const backendLowest =
    product.effectiveCustomerUnitPrice ??
    product.effective_customer_unit_price ??
    product.lowestCustomerUnitPrice ??
    product.lowest_customer_unit_price;

  if (backendLowest !== undefined && backendLowest !== null && !isNaN(Number(backendLowest)) && Number(backendLowest) > 0) {
    return Number(backendLowest);
  }

  // 2. Client-side evaluation across candidate tiers (fallback for mock data / offline mode)
  const candidatePrices: number[] = [];

  // A. Standard / Base Wholesale Unit Price (Never use costPrice / purchasePrice!)
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

  if (standardPrice !== null && standardPrice > 0) {
    candidatePrices.push(standardPrice);
  }

  // B. Bulk Unit Price
  // Only consider Bulk pricing when:
  // - Bulk Pricing is enabled
  // - Bulk minimum quantity is valid (bulk_min_qty > moq)
  // - Bulk unit price is valid (> 0)
  const moq = Math.max(1, Number(product.moq) || 10);
  const bulkEnabled = Boolean(product.bulkPricingEnabled ?? product.bulk_pricing_enabled);
  const rawBulkMin = product.bulkThreshold ?? product.bulk_threshold ?? product.bulkMinimumQuantity ?? product.bulk_minimum_quantity;
  const bulkMin = rawBulkMin !== undefined && rawBulkMin !== null && !isNaN(Number(rawBulkMin)) ? Number(rawBulkMin) : null;
  const rawBulkPrice = product.bulkPrice ?? product.bulk_price ?? product.bulkUnitPrice ?? product.bulk_unit_price;
  const bulkPrice = rawBulkPrice !== undefined && rawBulkPrice !== null && !isNaN(Number(rawBulkPrice)) ? Number(rawBulkPrice) : null;

  const isBulkValid = bulkEnabled && bulkMin !== null && bulkMin > moq && bulkPrice !== null && bulkPrice > 0;
  if (isBulkValid) {
    candidatePrices.push(bulkPrice);
  }

  // C. Full Stock Price
  // Use existing authoritative Full Stock rules:
  // - Full stock price must exist and be > 0
  // - Available inventory must satisfy qualification
  // - Complete package stock / available stock must be > 0
  const availableStock = product.availableStock !== undefined && product.availableStock !== null
    ? Number(product.availableStock)
    : product.available_stock !== undefined && product.available_stock !== null
    ? Number(product.available_stock)
    : Number(product.stock ?? 0);

  const rawFsPrice = product.configuredFullStockPrice ?? product.fullStockPrice ?? product.full_stock_price;
  const fsPrice = rawFsPrice !== undefined && rawFsPrice !== null && !isNaN(Number(rawFsPrice)) ? Number(rawFsPrice) : null;

  const isExplicitlyEligible = product.isFullStockEligible ?? product.is_full_stock_eligible;

  let isFullStockValid = false;
  if (isExplicitlyEligible !== undefined) {
    isFullStockValid = Boolean(isExplicitlyEligible) && fsPrice !== null && fsPrice > 0;
  } else if (fsPrice !== null && fsPrice > 0 && availableStock > 0) {
    if (bulkEnabled && bulkMin !== null && bulkMin > 0) {
      isFullStockValid = availableStock > bulkMin;
    } else {
      isFullStockValid = availableStock >= moq;
    }
  }

  if (isFullStockValid && fsPrice !== null && fsPrice > 0) {
    // Full stock price should never exceed standard price
    const resolvedFsPrice = standardPrice !== null ? Math.min(fsPrice, standardPrice) : fsPrice;
    candidatePrices.push(resolvedFsPrice);
  }

  // 3. Return the lowest valid customer-facing price, or null if no valid prices exist
  if (candidatePrices.length === 0) {
    return null;
  }

  return Math.min(...candidatePrices);
}

/**
 * Returns formatted tile price string and validity indicator.
 */
export function formatProductTilePrice(product: Product | any | null | undefined): {
  priceText: string;
  hasValidPrice: boolean;
  numericPrice: number | null;
} {
  const lowestPrice = getLowestValidCustomerUnitPrice(product);
  if (lowestPrice !== null && lowestPrice > 0) {
    return {
      priceText: formatPrice(lowestPrice),
      hasValidPrice: true,
      numericPrice: lowestPrice,
    };
  }

  return {
    priceText: "Price on Request",
    hasValidPrice: false,
    numericPrice: null,
  };
}
