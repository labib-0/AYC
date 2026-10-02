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

  // Drag and Drop
  draggedIndex: number | null;
  dragOverTarget: { index: number; position: "above" | "below" } | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, targetIndex: number) => void;
  handleDragEnd: () => void;
  handleKeyDown: (e: React.KeyboardEvent, index: number) => void;
  calcTargetPosition: (fromIdx: number, toIdx: number, pos: "above" | "below") => number;

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

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    index: number;
    position: "above" | "below";
  } | null>(null);

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

  // Up / Down controls
  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      setItems((prev) => {
        const next = [...prev];
        const temp = next[index - 1];
        next[index - 1] = next[index];
        next[index] = temp;
        return reindexItems(next);
      });
    },
    [reindexItems]
  );

  const moveDown = useCallback(
    (index: number) => {
      setItems((prev) => {
        if (index >= prev.length - 1) return prev;
        const next = [...prev];
        const temp = next[index + 1];
        next[index + 1] = next[index];
        next[index] = temp;
        return reindexItems(next);
      });
    },
    [reindexItems]
  );

  const handleMoveUp = moveUp;
  const handleMoveDown = moveDown;

  // Item deletion / removal
  const deleteItem = useCallback(
    (index: number) => {
      setItems((prev) => {
        const next = prev.filter((_, idx) => idx !== index);
        return reindexItems(next);
      });
    },
    [reindexItems]
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
    (index: number, updatedItem: T) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = updatedItem;
        return next;
      });
    },
    []
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

  // HTML5 Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));

    // Try setting drag image from closest row element if available
    const rowEl = (e.currentTarget as HTMLElement).closest("[data-ordered-row]") as HTMLElement | null;
    if (rowEl && e.dataTransfer.setDragImage) {
      const rowRect = rowEl.getBoundingClientRect();
      const handleRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetX = Math.max(10, handleRect.left - rowRect.left + handleRect.width / 2);
      const offsetY = Math.max(10, handleRect.top - rowRect.top + handleRect.height / 2);
      e.dataTransfer.setDragImage(rowEl, offsetX, offsetY);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedIndex === null) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const position: "above" | "below" = relY < rect.height / 2 ? "above" : "below";

      if (
        !dragOverTarget ||
        dragOverTarget.index !== index ||
        dragOverTarget.position !== position
      ) {
        setDragOverTarget({ index, position });
      }
    },
    [draggedIndex, dragOverTarget]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null) {
        setDraggedIndex(null);
        setDragOverTarget(null);
        return;
      }

      const position = dragOverTarget?.position || "above";
      let target = position === "below" ? targetIndex + 1 : targetIndex;
      if (draggedIndex < target) {
        target -= 1;
      }

      if (draggedIndex === target) {
        setDraggedIndex(null);
        setDragOverTarget(null);
        return;
      }

      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(target, 0, moved);
        return reindexItems(next);
      });

      setDraggedIndex(null);
      setDragOverTarget(null);
    },
    [draggedIndex, dragOverTarget, reindexItems]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverTarget(null);
  }, []);

  // Keyboard navigation for drag handle accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveUp(index);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveDown(index);
      }
    },
    [moveUp, moveDown]
  );

  // Save changes action
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
    setCurrentPage(1);
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

    draggedIndex,
    dragOverTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleKeyDown,
    calcTargetPosition,

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
