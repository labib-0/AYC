/**
 * AYC Admin — Global Reusable Listing Types
 * Single source of truth for admin table listing, pagination, and search behavior.
 */

export type AdminPageSize = 5 | 10 | 20 | 50 | "all";

export const PAGE_SIZE_OPTIONS: readonly AdminPageSize[] = [5, 10, 20, 50, "all"] as const;

/**
 * MANDATORY REQUIREMENT: Default page size is 5 across ALL admin modules.
 */
export const DEFAULT_ADMIN_PAGE_SIZE: AdminPageSize = 5;

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: AdminPageSize;
  from: number;
  to: number;
}

export interface AdminListingParams<TFilter = Record<string, any>> {
  page: number;
  per_page: AdminPageSize;
  search?: string;
  filters?: TFilter;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Calculates accurate record bounds (from, to, totalPages, safePage)
 * Works correctly for empty sets (from: 0, to: 0), all-mode, and partial final pages.
 */
export function calculatePaginationRange(
  currentPage: number,
  perPage: AdminPageSize | number,
  totalItems: number
): {
  from: number;
  to: number;
  totalPages: number;
  safePage: number;
} {
  if (perPage === "all") {
    return {
      from: totalItems > 0 ? 1 : 0,
      to: totalItems,
      totalPages: 1,
      safePage: 1,
    };
  }

  const numericPerPage = typeof perPage === "number" ? perPage : Number(perPage) || 5;
  const safePerPage = Math.max(1, numericPerPage);
  if (totalItems <= 0) {
    return { from: 0, to: 0, totalPages: 1, safePage: 1 };
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / safePerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const from = (safePage - 1) * safePerPage + 1;
  const to = Math.min(safePage * safePerPage, totalItems);
  return { from, to, totalPages, safePage };
}

/**
 * Formats standardized record count text:
 * - "Showing all 101 products" (in 'All' mode)
 * - "Showing 1–5 of 104 products"
 * - "Showing 21–40 of 104 products"
 * - "Showing 0 of 0 products"
 */
export function formatRecordCount(
  from: number,
  to: number,
  total: number,
  resourceName = "records",
  isAll: boolean | AdminPageSize | number = false
): string {
  const isAllMode = isAll === true || isAll === "all";
  if (total <= 0) {
    return `Showing 0 of 0 ${resourceName}`;
  }
  if (isAllMode || (from === 1 && to === total)) {
    return `Showing all ${total.toLocaleString()} ${resourceName}`;
  }
  return `Showing ${from}–${to} of ${total.toLocaleString()} ${resourceName}`;
}
