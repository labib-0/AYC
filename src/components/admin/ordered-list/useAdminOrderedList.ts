"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePointerDragReorder, DragOverTarget } from "./usePointerDragReorder";

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export interface UseAdminOrderedListOptions<T, C = any> {
  // Pinned / Ordered items
  initialItems: T[];
  getItemId: (item: T) => string | number;
  getItemOrder?: (item: T) => number;
  setItemOrder?: (item: T, newOrder: number) => T;
  onSave?: (items: T[]) => Promise<any>;
  onSaveSuccess?: () => void;
  showToast?: (message: string, type: "success" | "error") => void;

  // Optional equality checker for unsaved changes detection
  isItemEqual?: (a: T, b: T) => boolean;

  // Optional Catalog (Available items) for two-tier lists
  fetchCatalog?: (params: {
    search: string;
    page: number;
    pageSize: number;
    excludeIds: (string | number)[];
  }) => Promise<{
    items: C[];
    total: number;
    currentPage: number;
    lastPage: number;
  }>;
  getCatalogItemId?: (item: C) => string | number;
  onAddFromCatalog?: (catalogItem: C, currentItems: T[]) => T;
  defaultPageSize?: number;
}

export interface UseAdminOrderedListReturn<T, C = any> {
  // Ordered Items
  items: T[];
  savedItems: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  isDirty: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  resetItems: () => void;
  handleSave: () => Promise<void>;
  updateItem: (index: number, updatedItem: T) => void;
  deleteItem: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  handleRemove: (id: string | number) => void;

  // Pinned Pagination
  pinnedPage: number;
  setPinnedPage: (page: number) => void;
  pinnedPageSize: number;
  setPinnedPageSize: (size: number) => void;
  pinnedTotalPages: number;
  pinnedTotalCount: number;
  visiblePinnedItems: T[];
  pinnedStartIndex: number;
  pinnedEndIndex: number;
  handlePinnedPageChange: (newPage: number) => void;
  handlePinnedPageSizeChange: (newSize: number) => void;

  // Drag and Drop (Native Pointer Events + HTML5 Drag)
  draggedIndex: number | null;
  draggedGlobalIndex: number | null;
  isPointerDragging: boolean;
  dragOverTarget: DragOverTarget | null;
  handleDragStart: (e: React.DragEvent, index: number, globalIndex?: number) => void;
  handleDragOver: (e: React.DragEvent, index: number, globalIndex?: number) => void;
  handleDrop: (e: React.DragEvent, targetIndex: number, targetGlobalIndex?: number) => void;
  handleDragEnd: () => void;
  handleKeyDown: (e: React.KeyboardEvent, index: number, globalIndex?: number) => void;
  handlePointerDown: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handlePointerCancel: () => void;
  calcTargetPosition: (fromIdx: number, toIdx: number, pos: "above" | "below") => number;

  // Click suppression after drag
  isClickSuppressed: () => boolean;

  // Fast ID Lookup
  selectedItemMap: Map<string, number>;
  isPinned: (id: string | number) => boolean;
  getPinnedPosition: (id: string | number) => number | null;

  // Catalog Pagination & Search
  availableCatalog: C[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchChange: (query: string) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  handlePageSizeChange: (newSize: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalCount: number;
  isLoadingCatalog: boolean;
  handlePageChange: (newPage: number) => void;
  refreshCatalog: () => Promise<void>;

  // View Filter
  viewFilter: "all" | "pinned";
  setViewFilter: (filter: "all" | "pinned") => void;

  // Add from catalog
  handleAddFromCatalog: (catalogItem: C) => void;
}

export function useAdminOrderedList<T, C = any>({
  initialItems,
  getItemId,
  getItemOrder = (item: any) => item?.sort_order ?? 0,
  setItemOrder = (item: any, newOrder: number) => ({ ...item, sort_order: newOrder }),
  onSave,
  onSaveSuccess,
  showToast,
  isItemEqual,
  fetchCatalog,
  getCatalogItemId = (item: any) => item?.id,
  onAddFromCatalog,
  defaultPageSize = 5,
}: UseAdminOrderedListOptions<T, C>): UseAdminOrderedListReturn<T, C> {
  // Pinned / Ordered state
  const [items, setItems] = useState<T[]>(initialItems);
  const [savedItems, setSavedItems] = useState<T[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  // Sync if initialItems changes externally
  useEffect(() => {
    setItems(initialItems);
    setSavedItems(initialItems);
  }, [initialItems]);

  // Pinned list pagination (Default page size = 5)
  const [pinnedPage, setPinnedPage] = useState<number>(1);
  const [pinnedPageSize, setPinnedPageSize] = useState<number>(defaultPageSize);

  const pinnedTotalCount = items.length;
  const pinnedTotalPages = Math.max(1, Math.ceil(pinnedTotalCount / pinnedPageSize));

  // Ensure pinnedPage is always within valid bounds
  useEffect(() => {
    if (pinnedPage > pinnedTotalPages) {
      setPinnedPage(pinnedTotalPages);
    } else if (pinnedPage < 1) {
      setPinnedPage(1);
    }
  }, [pinnedPage, pinnedTotalPages]);

  const pinnedStartIndex = (pinnedPage - 1) * pinnedPageSize;
  const pinnedEndIndex = Math.min(pinnedTotalCount, pinnedPage * pinnedPageSize);
  const visiblePinnedItems = useMemo(() => {
    return items.slice(pinnedStartIndex, pinnedEndIndex);
  }, [items, pinnedStartIndex, pinnedEndIndex]);

  const handlePinnedPageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= pinnedTotalPages) {
        setPinnedPage(newPage);
      }
    },
    [pinnedTotalPages]
  );

  const handlePinnedPageSizeChange = useCallback((newSize: number) => {
    setPinnedPageSize(newSize);
    setPinnedPage(1);
  }, []);

  // Selected item ID map for O(1) position lookup and duplication prevention
  const selectedItemMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, idx) => {
      map.set(String(getItemId(item)), idx + 1);
    });
    return map;
  }, [items, getItemId]);

  const isPinned = useCallback(
    (id: string | number) => selectedItemMap.has(String(id)),
    [selectedItemMap]
  );

  const getPinnedPosition = useCallback(
    (id: string | number) => selectedItemMap.get(String(id)) ?? null,
    [selectedItemMap]
  );

  // Unsaved changes detection
  const isDirty = useMemo(() => {
    if (items.length !== savedItems.length) return true;
    return items.some((item, idx) => {
      const saved = savedItems[idx];
      if (!saved) return true;
      if (isItemEqual) {
        return !isItemEqual(item, saved);
      }
      return (
        String(getItemId(item)) !== String(getItemId(saved)) ||
        getItemOrder(item) !== getItemOrder(saved)
      );
    });
  }, [items, savedItems, getItemId, getItemOrder, isItemEqual]);

  const hasUnsavedChanges = isDirty;

  // Re-index items sequentially
  const reindexItems = useCallback(
    (arr: T[]): T[] => {
      return arr.map((item, idx) => setItemOrder(item, idx));
    },
    [setItemOrder]
  );

  // Reorder callback for unified pointer drag
  const handleReorder = useCallback(
    (fromGlobalIdx: number, toGlobalIdx: number) => {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromGlobalIdx, 1);
        next.splice(toGlobalIdx, 0, moved);
        return reindexItems(next);
      });
    },
    [reindexItems]
  );

  // Shared Native Pointer Events Drag and Drop Hook
  const {
    draggedIndex,
    draggedGlobalIndex,
    isPointerDragging,
    dragOverTarget,
    handlePointerDown,
    handlePointerCancel,
    calcTargetPosition,
    isClickSuppressed,
  } = usePointerDragReorder({
    totalCount: items.length,
    startIndex: pinnedStartIndex,
    pageSize: pinnedPageSize,
    onReorder: handleReorder,
  });

  const handlePointerMove = useCallback((_e: React.PointerEvent) => {}, []);
  const handlePointerUp = useCallback((_e: React.PointerEvent) => {}, []);

  // Up / Down controls (Operates on the full authoritative underlying order)
  const moveUp = useCallback(
    (indexOrGlobalIndex: number) => {
      const globalIdx =
        indexOrGlobalIndex >= pinnedStartIndex && indexOrGlobalIndex < pinnedEndIndex
          ? indexOrGlobalIndex
          : pinnedStartIndex + indexOrGlobalIndex;

      if (globalIdx <= 0 || globalIdx >= items.length) return;

      setItems((prev) => {
        const next = [...prev];
        const temp = next[globalIdx - 1];
        next[globalIdx - 1] = next[globalIdx];
        next[globalIdx] = temp;
        return reindexItems(next);
      });

      // If moving crosses page boundary upwards, follow the item to previous page
      if (globalIdx === pinnedStartIndex && pinnedPage > 1) {
        setPinnedPage((p) => Math.max(1, p - 1));
      }
    },
    [pinnedStartIndex, pinnedEndIndex, items.length, pinnedPage, reindexItems]
  );

  const moveDown = useCallback(
    (indexOrGlobalIndex: number) => {
      const globalIdx =
        indexOrGlobalIndex >= pinnedStartIndex && indexOrGlobalIndex < pinnedEndIndex
          ? indexOrGlobalIndex
          : pinnedStartIndex + indexOrGlobalIndex;

      if (globalIdx < 0 || globalIdx >= items.length - 1) return;

      setItems((prev) => {
        const next = [...prev];
        const temp = next[globalIdx + 1];
        next[globalIdx + 1] = next[globalIdx];
        next[globalIdx] = temp;
        return reindexItems(next);
      });

      // If moving crosses page boundary downwards, follow the item to next page
      if (globalIdx === pinnedEndIndex - 1 && pinnedPage < pinnedTotalPages) {
        setPinnedPage((p) => Math.min(pinnedTotalPages, p + 1));
      }
    },
    [pinnedStartIndex, pinnedEndIndex, items.length, pinnedPage, pinnedTotalPages, reindexItems]
  );

  const handleMoveUp = moveUp;
  const handleMoveDown = moveDown;

  // Item deletion / removal
  const deleteItem = useCallback(
    (indexOrGlobalIndex: number) => {
      const globalIdx =
        indexOrGlobalIndex >= pinnedStartIndex && indexOrGlobalIndex < pinnedEndIndex
          ? indexOrGlobalIndex
          : pinnedStartIndex + indexOrGlobalIndex;

      setItems((prev) => {
        const next = prev.filter((_, idx) => idx !== globalIdx);
        return reindexItems(next);
      });
    },
    [pinnedStartIndex, pinnedEndIndex, reindexItems]
  );

  const handleRemove = useCallback(
    (id: string | number) => {
      setItems((prev) => {
        const next = prev.filter((item) => String(getItemId(item)) !== String(id));
        return reindexItems(next);
      });
    },
    [getItemId, reindexItems]
  );

  const updateItem = useCallback(
    (indexOrGlobalIndex: number, updatedItem: T) => {
      const globalIdx =
        indexOrGlobalIndex >= pinnedStartIndex && indexOrGlobalIndex < pinnedEndIndex
          ? indexOrGlobalIndex
          : pinnedStartIndex + indexOrGlobalIndex;

      setItems((prev) => {
        const next = [...prev];
        next[globalIdx] = updatedItem;
        return next;
      });
    },
    [pinnedStartIndex, pinnedEndIndex]
  );

  const resetItems = useCallback(() => {
    setItems([...savedItems]);
  }, [savedItems]);

  // ── HTML5 Drag and Drop handlers (Backward Compatibility & Accessibility) ──
  const handleDragStart = useCallback(
    (e: React.DragEvent, localIdx: number, globalIdx?: number) => {
      const gIdx = globalIdx !== undefined ? globalIdx : pinnedStartIndex + localIdx;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(gIdx));

      const rowEl = (e.currentTarget as HTMLElement).closest("[data-ordered-row]") as HTMLElement | null;
      if (rowEl && e.dataTransfer.setDragImage) {
        const rowRect = rowEl.getBoundingClientRect();
        const handleRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const offsetX = Math.max(10, handleRect.left - rowRect.left + handleRect.width / 2);
        const offsetY = Math.max(10, handleRect.top - rowRect.top + handleRect.height / 2);
        e.dataTransfer.setDragImage(rowEl, offsetX, offsetY);
      }
    },
    [pinnedStartIndex]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, _localIdx: number, _globalIdx?: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetLocalIndex: number, targetGlobalIndex?: number) => {
      e.preventDefault();
      const rawFrom = e.dataTransfer.getData("text/plain");
      const fromGIdx = rawFrom ? parseInt(rawFrom, 10) : draggedGlobalIndex;

      if (fromGIdx === null || isNaN(fromGIdx)) {
        return;
      }

      const toGIdx =
        targetGlobalIndex !== undefined
          ? targetGlobalIndex
          : dragOverTarget?.globalIndex !== undefined
          ? dragOverTarget.globalIndex
          : pinnedStartIndex + targetLocalIndex;

      const position = dragOverTarget?.position || "above";
      let target = position === "below" ? toGIdx + 1 : toGIdx;
      if (fromGIdx < target) {
        target -= 1;
      }

      if (fromGIdx === target || target < 0 || target > items.length - 1) {
        return;
      }

      handleReorder(fromGIdx, target);
    },
    [draggedGlobalIndex, dragOverTarget, pinnedStartIndex, items.length, handleReorder]
  );

  const handleDragEnd = useCallback(() => {}, []);

  // Keyboard accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, _localIdx: number, globalIdx?: number) => {
      const gIdx = globalIdx !== undefined ? globalIdx : 0;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveUp(gIdx);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveDown(gIdx);
      }
    },
    [moveUp, moveDown]
  );

  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    try {
      setIsSaving(true);
      await onSave(items);
      setSavedItems([...items]);
      onSaveSuccess?.();
    } catch (err: any) {
      console.error("useAdminOrderedList: save error:", err);
      showToast?.(err?.message || "Failed to save order sequence.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [onSave, items, onSaveSuccess, showToast]);

  // Catalog search and pagination state
  const [availableCatalog, setAvailableCatalog] = useState<C[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "pinned">("all");

  const fetchCatalogRef = useRef(fetchCatalog);
  const getItemIdRef = useRef(getItemId);

  useEffect(() => {
    fetchCatalogRef.current = fetchCatalog;
    getItemIdRef.current = getItemId;
  }, [fetchCatalog, getItemId]);

  // Stable key for excluded IDs so items reference changes alone don't trigger refetch
  const excludeIdsKey = useMemo(() => items.map((item) => getItemId(item)).join(","), [items, getItemId]);

  const refreshCatalog = useCallback(async () => {
    if (!fetchCatalogRef.current) return;
    try {
      setIsLoadingCatalog(true);
      const excludeIds = items.map((item) => getItemIdRef.current(item));
      const res = await fetchCatalogRef.current({
        search: searchQuery,
        page: currentPage,
        pageSize,
        excludeIds,
      });
      setAvailableCatalog(res.items || []);
      setTotalPages(res.lastPage || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.warn("useAdminOrderedList: fetchCatalog error:", err);
      setAvailableCatalog([]);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [excludeIdsKey, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    if (fetchCatalogRef.current) {
      refreshCatalog();
    }
  }, [refreshCatalog]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  const handleAddFromCatalog = useCallback(
    (catalogItem: C) => {
      if (!onAddFromCatalog) return;
      const newItem = onAddFromCatalog(catalogItem, items);
      setItems((prev) => {
        const next = [...prev, newItem];
        return reindexItems(next);
      });
    },
    [onAddFromCatalog, items, reindexItems]
  );

  return {
    items,
    savedItems,
    setItems,
    isDirty,
    hasUnsavedChanges,
    isSaving,
    resetItems,
    handleSave,
    updateItem,
    deleteItem,
    moveUp,
    moveDown,
    handleMoveUp,
    handleMoveDown,
    handleRemove,

    pinnedPage,
    setPinnedPage,
    pinnedPageSize,
    setPinnedPageSize,
    pinnedTotalPages,
    pinnedTotalCount,
    visiblePinnedItems,
    pinnedStartIndex,
    pinnedEndIndex,
    handlePinnedPageChange,
    handlePinnedPageSizeChange,

    draggedIndex,
    draggedGlobalIndex,
    isPointerDragging,
    dragOverTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    calcTargetPosition,
    isClickSuppressed,

    selectedItemMap,
    isPinned,
    getPinnedPosition,

    availableCatalog,
    searchQuery,
    setSearchQuery,
    handleSearchChange,
    pageSize,
    setPageSize,
    handlePageSizeChange,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    isLoadingCatalog,
    handlePageChange,
    refreshCatalog,

    viewFilter,
    setViewFilter,
    handleAddFromCatalog,
  };
}
