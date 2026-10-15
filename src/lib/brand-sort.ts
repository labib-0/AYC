/**
 * Brand Sorting Utility
 * 
 * Provides deterministic, case-insensitive alphabetical (A–Z) sorting for brand selection
 * options across the Admin Panel, preserving original saved casing, IDs, and attributes.
 */

export interface BrandLike {
  name: string;
  id?: string | number;
  [key: string]: any;
}

/**
 * Sorts brand options alphabetically (A–Z) in a case-insensitive, deterministic manner.
 *
 * Requirements met:
 * 1. Ascending order A–Z.
 * 2. Case-insensitive comparison ('a' and 'A' sorted together).
 * 3. Original capitalization and attributes completely preserved.
 * 4. Deterministic tie-breaker for identical normalized spellings.
 */
export function sortBrandsAlphabetically<T extends BrandLike>(brands: T[]): T[] {
  if (!Array.isArray(brands)) return [];
  return [...brands].sort((a, b) => {
    const nameA = (a?.name || "").trim();
    const nameB = (b?.name || "").trim();

    // 1. Primary: Case-insensitive alphabetical comparison
    const cmp = nameA.localeCompare(nameB, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    if (cmp !== 0) return cmp;

    // 2. Secondary: Case-sensitive comparison for deterministic tie-breaking
    const caseCmp = nameA.localeCompare(nameB, undefined, { numeric: true });
    if (caseCmp !== 0) return caseCmp;

    // 3. Tertiary: Deterministic tie-breaker on ID if available
    const idA = String(a?.id ?? "");
    const idB = String(b?.id ?? "");
    return idA.localeCompare(idB, undefined, { numeric: true });
  });
}
