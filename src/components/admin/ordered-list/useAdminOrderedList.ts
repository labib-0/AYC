"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

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
  dragOverTarget: { index: number; globalIndex?: number; position: "above" | "below" } | null;
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

  // Drag and Drop state (Native Pointer Events + HTML5 Drag)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedGlobalIndex, setDraggedGlobalIndex] = useState<number | null>(null);
  const [isPointerDragging, setIsPointerDragging] = useState<boolean>(false);
  const [dragOverTarget, setDragOverTarget] = useState<{
    index: number;
    globalIndex?: number;
    position: "above" | "below";
  } | null>(null);

  // Click suppression refs
  const justDraggedRef = useRef<boolean>(false);
  const dragHandleRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  // Cleanup drag listeners & body styles on unmount
  useEffect(() => {
    return () => {
      document.body.style.userSelect = "";
      if (dragHandleRef.current && pointerIdRef.current !== null) {
        try {
          dragHandleRef.current.releasePointerCapture?.(pointerIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const isClickSuppressed = useCallback(() => {
    return justDraggedRef.current || isPointerDragging;
  }, [isPointerDragging]);

  // Catalog search and pagination state
  const [availableCatalog, setAvailableCatalog] = useState<C[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "pinned">("all");

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

  // Up / Down controls (Operates on the full authoritative underlying order)
  const moveUp = useCallback(
    (indexOrGlobalIndex: number) => {
      // Determine if index passed is local or global
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

  // Target position calculation for drag feedback
  const calcTargetPosition = useCallback(
    (fromIdx: number, toIdx: number, pos: "above" | "below"): number => {
      let target = pos === "below" ? toIdx + 1 : toIdx;
      if (fromIdx < target) {
        target -= 1;
      }
      return target + 1;
    },
    []
  );

  // ── Native Pointer Events Drag and Drop (NO PLUGIN) ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, globalIdx: number, localIdx: number) => {
      // Only initiate on primary mouse button or touch
      if (e.button !== 0) return;

      const targetEl = e.currentTarget as HTMLElement;
      dragHandleRef.current = targetEl;
      pointerIdRef.current = e.pointerId;

      try {
        targetEl.setPointerCapture?.(e.pointerId);
      } catch {
        // Safe fallback
      }

      setDraggedGlobalIndex(globalIdx);
      setDraggedIndex(localIdx);
      setIsPointerDragging(true);
      justDraggedRef.current = false;

      // Prevent accidental text selection during drag
      document.body.style.userSelect = "none";
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPointerDragging || draggedGlobalIndex === null) return;

      // Locate the hovered row under the pointer
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const rowEl = targetElement?.closest("[data-ordered-row], [data-product-row]") as HTMLElement | null;

      if (!rowEl) {
        return;
      }

      // Read authoritative global index and local index from attributes
      const rawGlobal = rowEl.getAttribute("data-global-index");
      const rawLocal = rowEl.getAttribute("data-index");

      let rowGlobalIdx: number;
      let rowLocalIdx: number;

      if (rawGlobal !== null) {
        rowGlobalIdx = parseInt(rawGlobal, 10);
        rowLocalIdx = rawLocal !== null ? parseInt(rawLocal, 10) : rowGlobalIdx - pinnedStartIndex;
      } else if (rawLocal !== null) {
        const parsed = parseInt(rawLocal, 10);
        if (parsed < pinnedPageSize) {
          rowLocalIdx = parsed;
          rowGlobalIdx = pinnedStartIndex + parsed;
        } else {
          rowGlobalIdx = parsed;
          rowLocalIdx = Math.max(0, parsed - pinnedStartIndex);
        }
      } else {
        return;
      }

      const rect = rowEl.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const position: "above" | "below" = relY < rect.height / 2 ? "above" : "below";

      setDragOverTarget({
        index: rowLocalIdx,
        globalIndex: rowGlobalIdx,
        position,
      });
    },
    [isPointerDragging, draggedGlobalIndex, pinnedStartIndex, pinnedPageSize]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const targetEl = dragHandleRef.current || (e.currentTarget as HTMLElement);
      if (pointerIdRef.current !== null) {
        try {
          targetEl.releasePointerCapture?.(pointerIdRef.current);
        } catch {
          // Safe fallback
        }
        pointerIdRef.current = null;
      }

      document.body.style.userSelect = "";

      if (isPointerDragging && draggedGlobalIndex !== null && dragOverTarget) {
        const targetGIdx =
          dragOverTarget.globalIndex !== undefined
            ? dragOverTarget.globalIndex
            : pinnedStartIndex + dragOverTarget.index;

        let target = dragOverTarget.position === "below" ? targetGIdx + 1 : targetGIdx;
        if (draggedGlobalIndex < target) {
          target -= 1;
        }

        if (draggedGlobalIndex !== target && target >= 0 && target <= items.length - 1) {
          setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedGlobalIndex, 1);
            next.splice(target, 0, moved);
            return reindexItems(next);
          });
        }
      }

      // Suppress accidental click right after pointerup
      if (isPointerDragging) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 150);
      }

      setIsPointerDragging(false);
      setDraggedIndex(null);
      setDraggedGlobalIndex(null);
      setDragOverTarget(null);
      dragHandleRef.current = null;
    },
    [isPointerDragging, draggedGlobalIndex, dragOverTarget, pinnedStartIndex, items.length, reindexItems]
  );

  const handlePointerCancel = useCallback(() => {
    document.body.style.userSelect = "";
    if (dragHandleRef.current && pointerIdRef.current !== null) {
      try {
        dragHandleRef.current.releasePointerCapture?.(pointerIdRef.current);
      } catch {
        // Safe fallback
      }
      pointerIdRef.current = null;
    }
    setIsPointerDragging(false);
    setDraggedIndex(null);
    setDraggedGlobalIndex(null);
    setDragOverTarget(null);
    dragHandleRef.current = null;
  }, []);

  // ── HTML5 Drag and Drop handlers (Backward Compatibility & Accessibility) ──
  const handleDragStart = useCallback(
    (e: React.DragEvent, localIdx: number, globalIdx?: number) => {
      const gIdx = globalIdx !== undefined ? globalIdx : pinnedStartIndex + localIdx;
      setDraggedIndex(localIdx);
      setDraggedGlobalIndex(gIdx);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(gIdx));

      // Try setting drag image from closest row element if available
      const rowEl = (e.currentTarget as HTMLElement).closest("[data-ordered-row], [data-product-row]") as HTMLElement | null;
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
    (e: React.DragEvent, localIdx: number, globalIdx?: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedIndex === null && draggedGlobalIndex === null) return;

      const gIdx = globalIdx !== undefined ? globalIdx : pinnedStartIndex + localIdx;
      const rect = e.currentTarget.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const position: "above" | "below" = relY < rect.height / 2 ? "above" : "below";

      if (
        !dragOverTarget ||
        dragOverTarget.index !== localIdx ||
        dragOverTarget.position !== position
      ) {
        setDragOverTarget({ index: localIdx, globalIndex: gIdx, position });
      }
    },
    [draggedIndex, draggedGlobalIndex, dragOverTarget, pinnedStartIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetLocalIndex: number, targetGlobalIndex?: number) => {
      e.preventDefault();
      const fromIdx =
        draggedGlobalIndex !== null
          ? draggedGlobalIndex
          : draggedIndex !== null
          ? pinnedStartIndex + draggedIndex
          : null;

      if (fromIdx === null) {
        setDraggedIndex(null);
        setDraggedGlobalIndex(null);
        setDragOverTarget(null);
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
      if (fromIdx < target) {
        target -= 1;
      }

      if (fromIdx === target || target < 0 || target > items.length - 1) {
        setDraggedIndex(null);
        setDraggedGlobalIndex(null);
        setDragOverTarget(null);
        return;
      }

      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(target, 0, moved);
        return reindexItems(next);
      });

      setDraggedIndex(null);
      setDraggedGlobalIndex(null);
      setDragOverTarget(null);
    },
    [draggedIndex, draggedGlobalIndex, dragOverTarget, pinnedStartIndex, items.length, reindexItems]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDraggedGlobalIndex(null);
    setDragOverTarget(null);
  }, []);

  // Keyboard navigation for drag handle accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, localIndex: number, globalIndex?: number) => {
      const gIdx = globalIndex !== undefined ? globalIndex : pinnedStartIndex + localIndex;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveUp(gIdx);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveDown(gIdx);
      }
    },
    [pinnedStartIndex, moveUp, moveDown]
  );

  // Save changes action - on failure, preserves local unsaved order and throws
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const result = await onSave(items);
      const updated = Array.isArray(result) ? result : items;
      setItems(updated);
      setSavedItems(updated);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      // Do NOT revert items! Preserve the local unsaved order.
      if (showToast) {
        showToast(err?.message || "Failed to save ordered items. Please try again.", "error");
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [onSave, items, onSaveSuccess, showToast]);

  // Catalog Fetching
  const isFetchingRef = useRef(false);
  const refreshCatalog = useCallback(async () => {
    if (!fetchCatalog) return;
    setIsLoadingCatalog(true);
    isFetchingRef.current = true;
    try {
      const excludeIds = items.map((i) => getItemId(i));
      const res = await fetchCatalog({
        search: searchQuery,
        page: currentPage,
        pageSize,
        excludeIds,
      });
      setAvailableCatalog(res.items || []);
      setCurrentPage(res.currentPage || 1);
      setTotalPages(res.lastPage || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.warn("useAdminOrderedList: fetchCatalog error:", err);
      setAvailableCatalog([]);
    } finally {
      setIsLoadingCatalog(false);
      isFetchingRef.current = false;
    }
  }, [fetchCatalog, searchQuery, currentPage, pageSize, items, getItemId]);

  // Debounced catalog search / page / pageSize trigger
  useEffect(() => {
    if (!fetchCatalog) return;
    const timer = setTimeout(() => {
      refreshCatalog();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchCatalog, refreshCatalog]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPinnedPageSize(newSize);
    setCurrentPage(1);
    setPinnedPage(1);
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
      }
    },
    [totalPages]
  );

  // Add from catalog handler
  const handleAddFromCatalog = useCallback(
    (catalogItem: C) => {
      if (!onAddFromCatalog) return;
      const catId = getCatalogItemId(catalogItem);
      if (selectedItemMap.has(String(catId))) return;

      const newItem = onAddFromCatalog(catalogItem, items);
      setItems((prev) => [...prev, newItem]);
    },
    [onAddFromCatalog, getCatalogItemId, selectedItemMap, items]
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

    // Pinned Pagination
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

    // Drag and Drop (Native Pointer Events + HTML5 Drag)
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
