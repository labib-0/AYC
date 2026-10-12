"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AdminPageSize,
  DEFAULT_ADMIN_PAGE_SIZE,
  calculatePaginationRange,
} from "@/types/admin-listing";

export interface UseAdminListingOptions<T, TFilter extends Record<string, any> = Record<string, any>> {
  // Initial state
  initialPageSize?: AdminPageSize; // Defaults to 5
  initialPage?: number;
  initialSearch?: string;
  initialFilters?: TFilter;

  // Debounce timing
  debounceMs?: number; // Defaults to 300ms

  // Client-side dataset mode (optional)
  items?: T[];
  filterItem?: (item: T, search: string, filters: TFilter) => boolean;
  sortItem?: (a: T, b: T) => number;

  // Server-side fetch mode (optional)
  fetcher?: (params: {
    page: number;
    per_page: AdminPageSize;
    search: string;
    filters: TFilter;
    signal?: AbortSignal;
  }) => Promise<{ data: T[]; total: number; totalPages?: number }>;

  // Error callback
  onError?: (error: Error) => void;
}

export interface UseAdminListingReturn<T, TFilter extends Record<string, any> = Record<string, any>> {
  // Search state
  search: string;
  debouncedSearch: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;

  // Pagination state
  page: number;
  perPage: AdminPageSize;
  setPage: (page: number) => void;
  setPerPage: (size: AdminPageSize) => void;
  totalPages: number;
  totalItems: number;
  from: number;
  to: number;

  // Filter state
  filters: TFilter;
  setFilters: React.Dispatch<React.SetStateAction<TFilter>>;
  updateFilter: <K extends keyof TFilter>(key: K, value: TFilter[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;

  // Data state
  items: T[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  // Convenience bundle for AdminPagination
  paginationProps: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: AdminPageSize;
    onPageChange: (newPage: number) => void;
    onPerPageChange: (newSize: AdminPageSize) => void;
  };
}

/**
 * AYC Admin — Global Reusable Listing Hook
 * Handles search (debounced ~300ms), page size (default 5), page navigation,
 * filter synchronization, and stale-request cancellation.
 */
export function useAdminListing<T, TFilter extends Record<string, any> = Record<string, any>>({
  initialPageSize = DEFAULT_ADMIN_PAGE_SIZE,
  initialPage = 1,
  initialSearch = "",
  initialFilters = {} as TFilter,
  debounceMs = 300,
  items: clientItems,
  filterItem,
  sortItem,
  fetcher,
  onError,
}: UseAdminListingOptions<T, TFilter>): UseAdminListingReturn<T, TFilter> {
  // State
  const [search, setSearchState] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPageState] = useState(initialPage);
  const [perPage, setPerPageState] = useState<AdminPageSize>(initialPageSize);
  const [filters, setFilters] = useState<TFilter>(initialFilters);

  // Server data state
  const [serverData, setServerData] = useState<T[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stale request tracking (guards against out-of-order responses)
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Debounce Search Input (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  // 2. Reset Page to 1 when search or filters change
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    setPageState(1);
  }, [debouncedSearch, filters]);

  // Set Search handler (immediate input state)
  const setSearch = useCallback((val: string) => {
    setSearchState(val);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchState("");
    setDebouncedSearch("");
    setPageState(1);
  }, []);

  // Update a single filter field
  const updateFilter = useCallback(<K extends keyof TFilter>(key: K, value: TFilter[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchState("");
    setDebouncedSearch("");
    setPageState(1);
  }, [initialFilters]);

  // Filter activity check
  const hasActiveFilters = useMemo(() => {
    if (search.trim() !== "") return true;
    for (const key of Object.keys(filters)) {
      const val = filters[key];
      const initialVal = initialFilters[key];
      if (val !== initialVal && val !== "all" && val !== "ALL" && val !== "" && val !== undefined) {
        return true;
      }
    }
    return false;
  }, [search, filters, initialFilters]);

  // Set Page handler
  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  // Set Per Page handler
  const setPerPage = useCallback((newSize: AdminPageSize) => {
    setPerPageState(newSize);
    setPageState(1); // Reset to page 1 on page size change
  }, []);

  // 3. Server-side fetching with stale-request disregard
  const fetchData = useCallback(async () => {
    if (!fetcher) return;

    // Cancel prior inflight request if abortable
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher({
        page,
        per_page: perPage,
        search: debouncedSearch.trim(),
        filters,
        signal: controller.signal,
      });

      // Disregard if a newer request was dispatched
      if (currentRequestId !== requestIdRef.current) return;

      setServerData(result.data || []);
      setServerTotal(result.total ?? 0);
      setServerTotalPages(
        result.totalPages ?? Math.max(1, Math.ceil((result.total ?? 0) / perPage))
      );
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message === "AbortError") {
        return; // Normal cancellation, ignore
      }
      if (currentRequestId !== requestIdRef.current) return;

      const message = err instanceof Error ? err.message : "Failed to load listing records.";
      setError(message);
      if (onError && err instanceof Error) onError(err);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher, page, perPage, debouncedSearch, filters, onError]);

  // Trigger server fetch when dependencies change
  useEffect(() => {
    if (fetcher) {
      fetchData();
    }
  }, [fetchData, fetcher]);

  // 4. Client-side filtering and slicing (when items are provided)
  const clientFilteredItems = useMemo(() => {
    if (!clientItems) return [];
    let result = [...clientItems];

    if (filterItem) {
      result = result.filter((item) => filterItem(item, debouncedSearch, filters));
    } else if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter((item: any) => {
        const str = JSON.stringify(item).toLowerCase();
        return str.includes(q);
      });
    }

    if (sortItem) {
      result.sort(sortItem);
    }

    return result;
  }, [clientItems, filterItem, debouncedSearch, filters, sortItem]);

  const clientTotalItems = clientFilteredItems.length;
  const clientRange = calculatePaginationRange(page, perPage, clientTotalItems);

  const displayedItems = useMemo(() => {
    if (fetcher) {
      return serverData;
    }
    const startIndex = (clientRange.safePage - 1) * perPage;
    return clientFilteredItems.slice(startIndex, startIndex + perPage);
  }, [fetcher, serverData, clientFilteredItems, clientRange.safePage, perPage]);

  const totalItems = fetcher ? serverTotal : clientTotalItems;
  const totalPages = fetcher ? serverTotalPages : clientRange.totalPages;
  const from = fetcher ? (totalItems === 0 ? 0 : (page - 1) * perPage + 1) : clientRange.from;
  const to = fetcher ? (totalItems === 0 ? 0 : Math.min(page * perPage, totalItems)) : clientRange.to;

  return {
    search,
    debouncedSearch,
    setSearch,
    clearSearch,
    page: fetcher ? page : clientRange.safePage,
    perPage,
    setPage,
    setPerPage,
    totalPages,
    totalItems,
    from,
    to,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    items: displayedItems,
    loading,
    error,
    reload: fetchData,
    paginationProps: {
      currentPage: fetcher ? page : clientRange.safePage,
      totalPages,
      totalItems,
      perPage,
      onPageChange: setPage,
      onPerPageChange: setPerPage,
    },
  };
}
