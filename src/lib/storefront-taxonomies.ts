import { brandService, BrandModel } from "@/services/brand.service";
import {
  AUDIENCE_IDS,
  AUDIENCE_NAMES,
  normalizeCategoryLabel,
  getStorefrontCategories,
  StorefrontCategoryItem,
} from "@/components/home/CategoriesSection";

export {
  AUDIENCE_IDS,
  AUDIENCE_NAMES,
  normalizeCategoryLabel,
  getStorefrontCategories,
  type StorefrontCategoryItem,
};

/**
 * Authoritative shared selector that returns the exact ordered collection of
 * brands displayed on the customer storefront (both homepage Shop by Brand grid
 * and footer brand links).
 *
 * Invariants:
 * 1. Consumes the landing-page brand collection in exact admin sort order.
 * 2. Filters out inactive brands.
 * 3. Falls back to active standard catalog brands if landing brands are unpopulated.
 * 4. Strictly avoids independent alphabetical sorting in the footer.
 */
export async function getStorefrontLandingBrands(): Promise<BrandModel[]> {
  try {
    const landingBrands = await brandService.getLandingBrands();
    if (landingBrands && landingBrands.length > 0) {
      return landingBrands.filter((b) => b.is_active !== false);
    }
  } catch (err) {
    console.warn("Notice: getLandingBrands fallback triggered:", err);
  }

  const fallback = await brandService.getBrands({ is_active: true });
  return (fallback || []).filter((b) => b.is_active !== false);
}
