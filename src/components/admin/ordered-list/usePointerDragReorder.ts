"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface DragOverTarget {
  index: number;
  globalIndex: number;
  position: "above" | "below";
}

export interface UsePointerDragReorderOptions {
  totalCount: number;
  startIndex?: number;
  pageSize?: number;
  onReorder: (fromGlobalIndex: number, toGlobalIndex: number) => void;
}

export interface UsePointerDragReorderReturn {
  draggedIndex: number | null;
  draggedGlobalIndex: number | null;
  isPointerDragging: boolean;
  dragOverTarget: DragOverTarget | null;
  handlePointerDown: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  handlePointerCancel: () => void;
  calcTargetPosition: (fromIdx: number, toIdx: number, pos: "above" | "below") => number;
  isClickSuppressed: () => boolean;
}

interface DragCandidateState {
  startX: number;
  startY: number;
  pointerId: number;
  handleEl: HTMLElement;
  containerEl: HTMLElement | null;
  globalIdx: number;
  localIdx: number;
  isDragging: boolean;
}

/**
 * Deterministic drop position landing calculation:
 * Maps pointer Y coordinate to target row midpoint.
 */
export function calcTargetPosition(
  fromIdx: number,
  toIdx: number,
  pos: "above" | "below"
): number {
  let target = pos === "below" ? toIdx + 1 : toIdx;
  if (fromIdx < target) {
    target -= 1;
  }
  return target + 1; // 1-based display position
}

/**
 * Native Pointer Events Drag and Drop Reordering Hook
 *
 * Implements reliable native pointer drag with:
 * - Deterministic movement threshold (>4px) preventing click/drag conflict
 * - Pointer capture on drag handle with fallback global window listeners
 * - Drop target calculation using actual row midpoints from getBoundingClientRect()
 * - Global index tracking with pagination offset awareness
 * - Post-drag click suppression (200ms buffer) to prevent accidental row/button clicks
 * - Zero third-party drag libraries
 */
export function usePointerDragReorder({
  totalCount,
  startIndex = 0,
  pageSize = 5,
  onReorder,
}: UsePointerDragReorderOptions): UsePointerDragReorderReturn {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedGlobalIndex, setDraggedGlobalIndex] = useState<number | null>(null);
  const [isPointerDragging, setIsPointerDragging] = useState<boolean>(false);
  const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget | null>(null);

  // References for tracking state without stale closures
  const dragCandidateRef = useRef<DragCandidateState | null>(null);
  const dragOverTargetRef = useRef<DragOverTarget | null>(null);
  const totalCountRef = useRef<number>(totalCount);
  const onReorderRef = useRef(onReorder);
  const justDraggedRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  // Click suppression helper: true during active drag and for 200ms after drop
  const isClickSuppressed = useCallback(() => {
    return justDraggedRef.current || isDraggingRef.current;
  }, []);

  /**
   * Calculate target row and "above" / "below" insertion position using actual row bounding boxes
   */
  const updateTargetFromPointer = useCallback((clientY: number) => {
    const candidate = dragCandidateRef.current;
    if (!candidate) return;

    const root = candidate.containerEl || document;
    const rowElements = Array.from(root.querySelectorAll<HTMLElement>("[data-ordered-row]"));
    if (rowElements.length === 0) return;

    // Collect all rows with valid client rects and indices
    const rows = rowElements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const rawGlobal = el.getAttribute("data-global-index");
        const rawLocal = el.getAttribute("data-index");
        const gIdx = rawGlobal !== null ? parseInt(rawGlobal, 10) : -1;
        const lIdx = rawLocal !== null ? parseInt(rawLocal, 10) : -1;
        return {
          el,
          rect,
          midpointY: rect.top + rect.height / 2,
          globalIndex: gIdx,
          localIndex: lIdx,
        };
      })
      .filter((r) => r.globalIndex !== -1 && r.rect.height > 0);

    if (rows.length === 0) return;

    // Sort rows top-to-bottom
    rows.sort((a, b) => a.rect.top - b.rect.top);

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];

    let targetRow = rows[0];
    let position: "above" | "below" = "above";

    if (clientY <= firstRow.midpointY) {
      targetRow = firstRow;
      position = "above";
    } else if (clientY >= lastRow.midpointY) {
      targetRow = lastRow;
      position = "below";
    } else {
      let found = false;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (clientY >= r.rect.top && clientY <= r.rect.bottom) {
          targetRow = r;
          position = clientY < r.midpointY ? "above" : "below";
          found = true;
          break;
        }
      }
      if (!found) {
        // Pointer is in gap between rows; find closest row midpoint
        let closest = rows[0];
        let minDiff = Math.abs(clientY - closest.midpointY);
        for (let i = 1; i < rows.length; i++) {
          const diff = Math.abs(clientY - rows[i].midpointY);
          if (diff < minDiff) {
            minDiff = diff;
            closest = rows[i];
          }
        }
        targetRow = closest;
        position = clientY < closest.midpointY ? "above" : "below";
      }
    }

    const newTarget: DragOverTarget = {
      index: targetRow.localIndex,
      globalIndex: targetRow.globalIndex,
      position,
    };

    dragOverTargetRef.current = newTarget;
    setDragOverTarget(newTarget);
  }, []);

  // Stable handler refs to prevent recreation and TDZ issues
  const onPointerMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const onPointerUpRef = useRef<(e: PointerEvent) => void>(() => {});
  const onPointerCancelRef = useRef<() => void>(() => {});

  // Guaranteed stable listener functions attached to window
  const onWindowPointerMove = useCallback((e: PointerEvent) => {
    onPointerMoveRef.current(e);
  }, []);

  const onWindowPointerUp = useCallback((e: PointerEvent) => {
    onPointerUpRef.current(e);
  }, []);

  const onWindowPointerCancel = useCallback(() => {
    onPointerCancelRef.current();
  }, []);

  const cleanupListeners = useCallback(() => {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerCancel);
  }, [onWindowPointerMove, onWindowPointerUp, onWindowPointerCancel]);

  // Actual logic for move/up/cancel updated into the stable refs
  useEffect(() => {
    onPointerMoveRef.current = (e: PointerEvent) => {
      const candidate = dragCandidateRef.current;
      if (!candidate || candidate.pointerId !== e.pointerId) return;

      if (!candidate.isDragging) {
        const distance = Math.hypot(e.clientX - candidate.startX, e.clientY - candidate.startY);
        // Drag threshold: must exceed 4px to distinguish genuine drag from simple click
        if (distance < 4) {
          return;
        }

        // Activate drag
        candidate.isDragging = true;
        isDraggingRef.current = true;

        try {
          candidate.handleEl.setPointerCapture?.(candidate.pointerId);
        } catch {
          // Safe fallback
        }

        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";

        setIsPointerDragging(true);
        setDraggedGlobalIndex(candidate.globalIdx);
        setDraggedIndex(candidate.localIdx);
      }

      if (candidate.isDragging) {
        e.preventDefault?.();
        updateTargetFromPointer(e.clientY);
      }
    };

    onPointerUpRef.current = (e: PointerEvent) => {
      const candidate = dragCandidateRef.current;
      cleanupListeners();

      if (candidate && candidate.pointerId === e.pointerId) {
        try {
          candidate.handleEl.releasePointerCapture?.(candidate.pointerId);
        } catch {
          // Safe fallback
        }

        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        if (candidate.isDragging) {
          // Suppress accidental click right after drag completion
          justDraggedRef.current = true;
          setTimeout(() => {
            justDraggedRef.current = false;
          }, 200);

          const fromGlobal = candidate.globalIdx;
          const target = dragOverTargetRef.current;

          if (target && target.globalIndex !== undefined) {
            const toGlobal = target.globalIndex;
            const pos = target.position;

            let destinationGlobalIdx: number;
            if (fromGlobal < toGlobal) {
              destinationGlobalIdx = pos === "below" ? toGlobal : toGlobal - 1;
            } else if (fromGlobal > toGlobal) {
              destinationGlobalIdx = pos === "above" ? toGlobal : toGlobal + 1;
            } else {
              destinationGlobalIdx = fromGlobal;
            }

            if (
              destinationGlobalIdx !== fromGlobal &&
              destinationGlobalIdx >= 0 &&
              destinationGlobalIdx < totalCountRef.current
            ) {
              onReorderRef.current(fromGlobal, destinationGlobalIdx);
            }
          }
        }
      }

      // Reset state
      dragCandidateRef.current = null;
      dragOverTargetRef.current = null;
      isDraggingRef.current = false;
      setIsPointerDragging(false);
      setDraggedIndex(null);
      setDraggedGlobalIndex(null);
      setDragOverTarget(null);
    };

    onPointerCancelRef.current = () => {
      const candidate = dragCandidateRef.current;
      cleanupListeners();

      if (candidate) {
        try {
          candidate.handleEl.releasePointerCapture?.(candidate.pointerId);
        } catch {
          // Safe fallback
        }
      }

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      dragCandidateRef.current = null;
      dragOverTargetRef.current = null;
      isDraggingRef.current = false;
      setIsPointerDragging(false);
      setDraggedIndex(null);
      setDraggedGlobalIndex(null);
      setDragOverTarget(null);
    };
  }, [updateTargetFromPointer, cleanupListeners]);

  // Pointer down on the dedicated drag handle
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, globalIdx: number, localIdx: number) => {
      // Only initiate on primary mouse button (button === 0) or touch/pen
      if (e.button !== 0) return;

      const targetEl = e.currentTarget as HTMLElement;
      const containerEl = targetEl.closest("[data-ordered-container]") as HTMLElement | null;

      try {
        targetEl.setPointerCapture?.(e.pointerId);
      } catch {
        // Safe fallback
      }

      dragCandidateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        handleEl: targetEl,
        containerEl,
        globalIdx,
        localIdx,
        isDragging: false,
      };

      // Attach stable window listeners to ensure continuous movement capture
      window.addEventListener("pointermove", onWindowPointerMove, { passive: false });
      window.addEventListener("pointerup", onWindowPointerUp);
      window.addEventListener("pointercancel", onWindowPointerCancel);
    },
    [onWindowPointerMove, onWindowPointerUp, onWindowPointerCancel]
  );

  const handlePointerCancel = useCallback(() => {
    onWindowPointerCancel();
  }, [onWindowPointerCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [cleanupListeners]);

  return {
    draggedIndex,
    draggedGlobalIndex,
    isPointerDragging,
    dragOverTarget,
    handlePointerDown,
    handlePointerCancel,
    calcTargetPosition,
    isClickSuppressed,
  };
}
