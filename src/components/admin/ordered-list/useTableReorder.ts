"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePointerDragReorder, DragOverTarget } from "./usePointerDragReorder";
import { AdminPageSize } from "@/types/admin-listing";

export interface UseTableReorderOptions<T> {
  items: T[];
  onItemsChange: (items: T[]) => void;
  getItemId: (item: T) => string | number;
  getItemTitle?: (item: T) => string;
  getItemOrder?: (item: T) => number;
  setItemOrder?: (item: T, newOrder: number) => T;
  onPersistOrder: (items: T[]) => Promise<any>;
  onReorderSuccess?: () => void;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  currentPage?: number;
  pageSize?: AdminPageSize | number;
  onPageChange?: (newPage: number) => void;
  showToast?: (message: string, type: "success" | "error") => void;
}

export interface UseTableReorderReturn<T> {
  items: T[];
  isSaving: boolean;
  isReorderDisabled: boolean;
  disabledReason: string;
  draggedGlobalIndex: number | null;
  draggedIndex: number | null;
  isPointerDragging: boolean;
  dragOverTarget: DragOverTarget | null;
  handlePointerDown: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  handlePointerCancel: () => void;
  calcTargetPosition: (fromIdx: number, toIdx: number, pos: "above" | "below") => number;
  isClickSuppressed: () => boolean;
  moveUp: (globalIndex: number) => Promise<void>;
  moveDown: (globalIndex: number) => Promise<void>;
  isFirstItem: (globalIndex: number) => boolean;
  isLastItem: (globalIndex: number) => boolean;
  getDropIndicator: (globalIndex: number) => "none" | "above" | "below";
  getRowVisualClass: (globalIndex: number) => string;
}

export function useTableReorder<T>({
  items,
  onItemsChange,
  getItemId,
  getItemTitle,
  getItemOrder,
  setItemOrder,
  onPersistOrder,
  onReorderSuccess,
  isReorderDisabled = false,
  disabledReason = "Reordering is disabled while search or filters are active. Clear filters to return to manual sequence.",
  currentPage = 1,
  pageSize = 5,
  onPageChange,
  showToast,
}: UseTableReorderOptions<T>): UseTableReorderReturn<T> {
  const [isSaving, setIsSaving] = useState(false);
  const itemsRef = useRef<T[]>(items);
  const previousSavedRef = useRef<T[]>(items);

  const isAll = pageSize === "all";
  const numericPageSize = isAll ? Math.max(1, items.length) : (Number(pageSize) || 5);
  const startIndex = isAll ? 0 : (currentPage - 1) * numericPageSize;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const updateItemOrder = useCallback(
    (item: T, newOrder: number): T => {
      if (setItemOrder) {
        return setItemOrder(item, newOrder);
      }
      if (typeof item === "object" && item !== null) {
        return {
          ...item,
          sort_order: newOrder,
          ...(("sortOrder" in (item as Record<string, unknown>)) ? { sortOrder: newOrder } : {}),
        };
      }
      return item;
    },
    [setItemOrder]
  );

  // Persist order with optimistic update, response sync, and safe rollback
  const persistSequence = useCallback(
    async (newItems: T[]) => {
      const rollbackItems = [...previousSavedRef.current];
      setIsSaving(true);
      try {
        const result = await onPersistOrder(newItems);
        if (Array.isArray(result) && result.length > 0) {
          onItemsChange(result);
          previousSavedRef.current = [...result];
        } else {
          previousSavedRef.current = [...newItems];
        }
        if (showToast) {
          showToast("Order updated successfully.", "success");
        }
        if (onReorderSuccess) {
          onReorderSuccess();
        }
      } catch (err: unknown) {
        // Rollback on failure
        onItemsChange(rollbackItems);
        const msg = err instanceof Error ? err.message : "Failed to persist ordering.";
        if (showToast) {
          showToast(`${msg} Previous order restored.`, "error");
        }
      } finally {
        setIsSaving(false);
      }
    },
    [onPersistOrder, onItemsChange, showToast, onReorderSuccess]
  );

  // Unified reorder handler triggered by pointer drag drop
  const handleReorder = useCallback(
    (fromGlobalIdx: number, toGlobalIdx: number) => {
      if (isReorderDisabled || fromGlobalIdx === toGlobalIdx) return;

      const current = [...itemsRef.current];
      if (
        fromGlobalIdx < 0 ||
        fromGlobalIdx >= current.length ||
        toGlobalIdx < 0 ||
        toGlobalIdx >= current.length
      ) {
        return;
      }

      previousSavedRef.current = [...current];
      const next = [...current];
      const [moved] = next.splice(fromGlobalIdx, 1);
      next.splice(toGlobalIdx, 0, moved);

      // Normalize sequence with authoritative 1-based sequential sort orders
      const normalized = next.map((item, idx) => updateItemOrder(item, idx + 1));

      // Optimistic update
      onItemsChange(normalized);

      // Follow moved item if landing crosses page boundary (only in paginated mode)
      if (!isAll && onPageChange && numericPageSize > 0) {
        const newPage = Math.floor(toGlobalIdx / numericPageSize) + 1;
        if (newPage !== currentPage) {
          onPageChange(newPage);
        }
      }

      // Persist to backend
      persistSequence(normalized);
    },
    [isReorderDisabled, onItemsChange, onPageChange, isAll, numericPageSize, currentPage, persistSequence, updateItemOrder]
  );

  // Pointer drag reorder hook
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
    startIndex,
    pageSize: numericPageSize,
    onReorder: handleReorder,
  });

  // Move Up action
  const moveUp = useCallback(
    async (globalIdx: number) => {
      if (isReorderDisabled || globalIdx <= 0 || isSaving) return;

      const current = [...itemsRef.current];
      previousSavedRef.current = [...current];
      const next = [...current];
      const targetIdx = globalIdx - 1;

      const temp = next[targetIdx];
      next[targetIdx] = next[globalIdx];
      next[globalIdx] = temp;

      const normalized = next.map((item, idx) => updateItemOrder(item, idx + 1));

      // Optimistic update
      onItemsChange(normalized);

      // Follow item if moving crosses page boundary upwards
      if (!isAll && onPageChange && numericPageSize > 0 && targetIdx < (currentPage - 1) * numericPageSize) {
        onPageChange(Math.max(1, currentPage - 1));
      }

      await persistSequence(normalized);
    },
    [isReorderDisabled, isSaving, onItemsChange, onPageChange, isAll, numericPageSize, currentPage, persistSequence, updateItemOrder]
  );

  // Move Down action
  const moveDown = useCallback(
    async (globalIdx: number) => {
      const current = [...itemsRef.current];
      if (isReorderDisabled || globalIdx >= current.length - 1 || isSaving) return;

      previousSavedRef.current = [...current];
      const next = [...current];
      const targetIdx = globalIdx + 1;

      const temp = next[targetIdx];
      next[targetIdx] = next[globalIdx];
      next[globalIdx] = temp;

      const normalized = next.map((item, idx) => updateItemOrder(item, idx + 1));

      // Optimistic update
      onItemsChange(normalized);

      // Follow item if moving crosses page boundary downwards
      if (!isAll && onPageChange && numericPageSize > 0 && targetIdx >= currentPage * numericPageSize) {
        const totalPages = Math.ceil(current.length / numericPageSize);
        onPageChange(Math.min(totalPages, currentPage + 1));
      }

      await persistSequence(normalized);
    },
    [isReorderDisabled, isSaving, onItemsChange, onPageChange, isAll, numericPageSize, currentPage, persistSequence, updateItemOrder]
  );

  const isFirstItem = useCallback((globalIndex: number) => globalIndex === 0, []);
  const isLastItem = useCallback(
    (globalIndex: number) => globalIndex === items.length - 1,
    [items.length]
  );

  // Drop indicator computation for row highlight
  const getDropIndicator = useCallback(
    (globalIndex: number): "none" | "above" | "below" => {
      if (!isPointerDragging || draggedGlobalIndex === null || dragOverTarget === null) {
        return "none";
      }
      if (draggedGlobalIndex === globalIndex) {
        return "none";
      }
      if (dragOverTarget.globalIndex === globalIndex) {
        return dragOverTarget.position;
      }
      return "none";
    },
    [isPointerDragging, draggedGlobalIndex, dragOverTarget]
  );

  // Row visual state classes
  const getRowVisualClass = useCallback(
    (globalIndex: number): string => {
      if (draggedGlobalIndex === globalIndex) {
        return "opacity-40 bg-primary/10 border-dashed border-primary transition-opacity select-none";
      }
      const indicator = getDropIndicator(globalIndex);
      if (indicator === "above") {
        return "border-t-2 border-t-primary bg-primary/5 transition-colors";
      }
      if (indicator === "below") {
        return "border-b-2 border-b-primary bg-primary/5 transition-colors";
      }
      return "";
    },
    [draggedGlobalIndex, getDropIndicator]
  );

  return {
    items,
    isSaving,
    isReorderDisabled,
    disabledReason,
    draggedGlobalIndex,
    draggedIndex,
    isPointerDragging,
    dragOverTarget,
    handlePointerDown,
    handlePointerCancel,
    calcTargetPosition,
    isClickSuppressed,
    moveUp,
    moveDown,
    isFirstItem,
    isLastItem,
    getDropIndicator,
    getRowVisualClass,
  };
}
