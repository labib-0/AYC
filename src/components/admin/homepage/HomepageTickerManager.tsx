"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ListPlus,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Loader2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { HomepageTickerItem } from "@/services/homepage.service";

export interface HomepageTickerManagerProps {
  items: HomepageTickerItem[];
  onChange: (items: HomepageTickerItem[]) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  isDirty?: boolean;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

const PRESET_KEYWORDS = [
  "QUALITY",
  "FACTORY DIRECT",
  "EXPORT READY",
  "GLOBAL SHIPPING",
  "BULK ORDER SUPPORT",
  "QUALITY APPAREL",
  "VERIFIED STOCK",
  "BUSINESS SOURCING",
];

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export default function HomepageTickerManager({
  items,
  onChange,
  onSave,
  isSaving = false,
  isDirty = false,
  showToast,
  disabled = false,
}: HomepageTickerManagerProps) {
  const [newKeyword, setNewKeyword] = useState("");

  // Pagination State (Default page size = 5)
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Ensure currentPage stays within valid bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(items.length, currentPage * pageSize);
  const visibleItems = items.slice(startIndex, endIndex);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Drag and Drop State (Native Pointer Events)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedGlobalIndex, setDraggedGlobalIndex] = useState<number | null>(null);
  const [isPointerDragging, setIsPointerDragging] = useState<boolean>(false);
  const [dragOverTarget, setDragOverTarget] = useState<{
    index: number;
    globalIndex?: number;
    position: "above" | "below";
  } | null>(null);

  const justDraggedRef = useRef<boolean>(false);
  const dragHandleRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (isPointerDragging) {
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = "";
    }
    return () => {
      document.body.style.userSelect = "";
    };
  }, [isPointerDragging]);

  const isClickSuppressed = () => justDraggedRef.current || isPointerDragging;

  const calcTargetPosition = (fromIdx: number, toIdx: number, pos: "above" | "below"): number => {
    let target = pos === "below" ? toIdx + 1 : toIdx;
    if (fromIdx < target) {
      target -= 1;
    }
    return target + 1;
  };

  // Native Pointer Events Drag and Drop
  const handlePointerDown = (e: React.PointerEvent, globalIdx: number, localIdx: number) => {
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
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDragging || draggedGlobalIndex === null) return;

    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const rowEl = targetElement?.closest("[data-ordered-row]") as HTMLElement | null;

    if (!rowEl) return;

    const rawGlobal = rowEl.getAttribute("data-global-index");
    const rawLocal = rowEl.getAttribute("data-index");

    let rowGlobalIdx: number;
    let rowLocalIdx: number;

    if (rawGlobal !== null) {
      rowGlobalIdx = parseInt(rawGlobal, 10);
      rowLocalIdx = rawLocal !== null ? parseInt(rawLocal, 10) : rowGlobalIdx - startIndex;
    } else if (rawLocal !== null) {
      const parsed = parseInt(rawLocal, 10);
      if (parsed < pageSize) {
        rowLocalIdx = parsed;
        rowGlobalIdx = startIndex + parsed;
      } else {
        rowGlobalIdx = parsed;
        rowLocalIdx = Math.max(0, parsed - startIndex);
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
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const targetEl = dragHandleRef.current || (e.currentTarget as HTMLElement);
    if (pointerIdRef.current !== null) {
      try {
        targetEl.releasePointerCapture?.(pointerIdRef.current);
      } catch {
        // Safe fallback
      }
      pointerIdRef.current = null;
    }

    if (isPointerDragging && draggedGlobalIndex !== null && dragOverTarget) {
      const targetGIdx =
        dragOverTarget.globalIndex !== undefined
          ? dragOverTarget.globalIndex
          : startIndex + dragOverTarget.index;

      let target = dragOverTarget.position === "below" ? targetGIdx + 1 : targetGIdx;
      if (draggedGlobalIndex < target) {
        target -= 1;
      }

      if (draggedGlobalIndex !== target && target >= 0 && target <= items.length - 1) {
        const next = [...items];
        const [moved] = next.splice(draggedGlobalIndex, 1);
        next.splice(target, 0, moved);
        onChange(next.map((item, idx) => ({ ...item, sort_order: idx })));
      }
    }

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
  };

  const handlePointerCancel = () => {
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
  };

  // HTML5 Drag Handlers (Compatibility)
  const handleDragStart = (e: React.DragEvent, localIdx: number, globalIdx?: number) => {
    const gIdx = globalIdx !== undefined ? globalIdx : startIndex + localIdx;
    setDraggedIndex(localIdx);
    setDraggedGlobalIndex(gIdx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(gIdx));
  };

  const handleDragOver = (e: React.DragEvent, localIdx: number, globalIdx?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex === null && draggedGlobalIndex === null) return;

    const gIdx = globalIdx !== undefined ? globalIdx : startIndex + localIdx;
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
  };

  const handleDrop = (e: React.DragEvent, targetLocalIndex: number, targetGlobalIndex?: number) => {
    e.preventDefault();
    const fromIdx =
      draggedGlobalIndex !== null
        ? draggedGlobalIndex
        : draggedIndex !== null
        ? startIndex + draggedIndex
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
        : startIndex + targetLocalIndex;

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

    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(target, 0, moved);
    onChange(next.map((item, idx) => ({ ...item, sort_order: idx })));

    setDraggedIndex(null);
    setDraggedGlobalIndex(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedGlobalIndex(null);
    setDragOverTarget(null);
  };

  const handleAddKeyword = (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : newKeyword).trim();
    if (!text) {
      showToast("Keyword text cannot be empty.", "error");
      return;
    }

    const newItem: HomepageTickerItem = {
      text: text.toUpperCase(),
      is_active: true,
      sort_order: items.length,
    };

    onChange([...items, newItem]);
    if (textToAdd === undefined) {
      setNewKeyword("");
    }
  };

  const handleUpdateText = (globalIdx: number, newText: string) => {
    const updated = items.map((item, idx) => {
      if (idx === globalIdx) {
        return { ...item, text: newText };
      }
      return item;
    });
    onChange(updated);
  };

  const handleToggleActive = (globalIdx: number) => {
    const updated = items.map((item, idx) => {
      if (idx === globalIdx) {
        return { ...item, is_active: !item.is_active };
      }
      return item;
    });
    onChange(updated);
  };

  const handleDelete = (globalIdx: number) => {
    const updated = items
      .filter((_, idx) => idx !== globalIdx)
      .map((item, idx) => ({
        ...item,
        sort_order: idx,
      }));
    onChange(updated);
  };

  const handleMoveUp = (indexOrGlobalIdx: number) => {
    const globalIdx =
      indexOrGlobalIdx >= startIndex && indexOrGlobalIdx < endIndex
        ? indexOrGlobalIdx
        : startIndex + indexOrGlobalIdx;

    if (globalIdx <= 0) return;
    const updated = [...items];
    const temp = updated[globalIdx - 1];
    updated[globalIdx - 1] = updated[globalIdx];
    updated[globalIdx] = temp;
    onChange(updated.map((item, idx) => ({ ...item, sort_order: idx })));

    if (globalIdx === startIndex && currentPage > 1) {
      setCurrentPage((p) => Math.max(1, p - 1));
    }
  };

  const handleMoveDown = (indexOrGlobalIdx: number) => {
    const globalIdx =
      indexOrGlobalIdx >= startIndex && indexOrGlobalIdx < endIndex
        ? indexOrGlobalIdx
        : startIndex + indexOrGlobalIdx;

    if (globalIdx >= items.length - 1) return;
    const updated = [...items];
    const temp = updated[globalIdx + 1];
    updated[globalIdx + 1] = updated[globalIdx];
    updated[globalIdx] = temp;
    onChange(updated.map((item, idx) => ({ ...item, sort_order: idx })));

    if (globalIdx === endIndex - 1 && currentPage < totalPages) {
      setCurrentPage((p) => Math.min(totalPages, p + 1));
    }
  };

  // handleMoveUp and handleMoveDown used directly in row actions

  const handleAddPresets = () => {
    const existingTexts = new Set(items.map((i) => i.text.trim().toUpperCase()));
    const toAdd: HomepageTickerItem[] = [];
    PRESET_KEYWORDS.forEach((k) => {
      if (!existingTexts.has(k)) {
        toAdd.push({
          text: k,
          is_active: true,
          sort_order: items.length + toAdd.length,
        });
      }
    });

    if (toAdd.length === 0) {
      showToast("All standard preset keywords already exist in the list.", "error");
      return;
    }

    onChange([...items, ...toAdd]);
    showToast(`Added ${toAdd.length} preset keyword(s).`, "success");
  };

  const activeCount = items.filter((i) => i.is_active && i.text.trim().length > 0).length;

  return (
    <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-2xs space-y-5 w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ListPlus size={16} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Homepage Ticker / Keywords
            </h2>
          </div>
          {isDirty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-xs font-medium hidden sm:inline">Page Size:</span>
            <div
              className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
              role="group"
              aria-label="Page Size"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  aria-pressed={pageSize === size}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer ${
                    pageSize === size
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs font-mono text-muted-foreground">
            {activeCount} Active / {items.length} Total
          </span>
          {onSave && isDirty && (
            <button
              type="button"
              onClick={onSave}
              disabled={disabled || isSaving}
              id="btn-save-ticker"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save Ticker</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Customize the scrolling keyword strip displayed on the customer storefront homepage directly below the main banner. Drag to reorder, add, edit, and toggle keywords.
      </p>

      {/* Live Preview Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#EA580C]" />
            <span>Storefront Ticker Preview</span>
          </span>
          <span className="text-[11px] font-mono">{activeCount === 0 ? "Hidden on Storefront (Empty)" : "Live Marquee Loop"}</span>
        </div>

        <div className="relative w-full h-9 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 flex items-center px-3.5">
          {activeCount > 0 ? (
            <div className="flex items-center whitespace-nowrap overflow-hidden text-xs">
              {items
                .filter((item) => item.is_active && item.text.trim().length > 0)
                .map((item, idx) => (
                  <span key={item.id || idx} className="inline-flex items-center">
                    <span className="font-bold uppercase tracking-tight text-foreground text-xs">
                      {item.text.trim()}
                    </span>
                    <span className="mx-3 text-[#EA580C] select-none">•</span>
                  </span>
                ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              No active keywords. Ticker will be hidden gracefully on storefront.
            </span>
          )}
        </div>
      </div>

      {/* Add New Keyword Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddKeyword();
            }
          }}
          placeholder="Enter keyword (e.g. FACTORY DIRECT, EXPORT READY)..."
          className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-semibold"
          disabled={disabled || isSaving}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddKeyword()}
            disabled={disabled || isSaving || !newKeyword.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Keyword</span>
          </button>
          <button
            type="button"
            onClick={handleAddPresets}
            disabled={disabled || isSaving}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors cursor-pointer"
            title="Add standard wholesale apparel preset keywords"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Presets</span>
          </button>
        </div>
      </div>

      {/* Keywords Reorderable List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              No ticker keywords configured yet.
            </p>
            <button
              type="button"
              onClick={handleAddPresets}
              className="text-xs sm:text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              + Click here to add default wholesale presets
            </button>
          </div>
        ) : (
          visibleItems.map((item, localIndex) => {
            const globalIndex = startIndex + localIndex;
            const position = globalIndex + 1; // 1-based global position!
            const isDragging = draggedGlobalIndex === globalIndex || draggedIndex === localIndex;

            const isDropAbove =
              draggedGlobalIndex !== null &&
              dragOverTarget?.globalIndex === globalIndex &&
              dragOverTarget?.position === "above" &&
              draggedGlobalIndex !== globalIndex &&
              draggedGlobalIndex !== globalIndex - 1;

            const isDropBelow =
              draggedGlobalIndex !== null &&
              dragOverTarget?.globalIndex === globalIndex &&
              dragOverTarget?.position === "below" &&
              draggedGlobalIndex !== globalIndex &&
              draggedGlobalIndex !== globalIndex + 1;

            const landingPosAbove =
              draggedGlobalIndex !== null
                ? calcTargetPosition(draggedGlobalIndex, globalIndex, "above")
                : position;
            const landingPosBelow =
              draggedGlobalIndex !== null
                ? calcTargetPosition(draggedGlobalIndex, globalIndex, "below")
                : position;

            return (
              <React.Fragment key={item.id ? `item-${item.id}` : `idx-${globalIndex}`}>
                {/* Drop indicator above */}
                {isDropAbove && (
                  <div
                    className="relative flex items-center justify-center py-1.5 bg-primary/10 select-none pointer-events-none transition-all duration-150"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="absolute inset-x-0 h-0.5 bg-primary rounded-full" />
                    <div className="relative z-10 px-3 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] sm:text-xs tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                      <span>Drop here • Position {landingPosAbove}</span>
                    </div>
                  </div>
                )}

                <div
                  data-ordered-row
                  data-index={localIndex}
                  data-global-index={globalIndex}
                  onDragOver={(e) => handleDragOver(e, localIndex, globalIndex)}
                  onDrop={(e) => handleDrop(e, localIndex, globalIndex)}
                  className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border transition-colors ${
                    isDragging
                      ? "opacity-50 bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                      : dragOverTarget?.globalIndex === globalIndex
                      ? "bg-primary/10 ring-1 ring-primary/40 border-primary/50"
                      : item.is_active
                      ? "bg-secondary/20 border-border/70 hover:bg-secondary/30"
                      : "bg-muted/30 border-dashed border-border/50 opacity-60 hover:opacity-80"
                  }`}
                >
                  {/* Drag handle + order index + text input */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Drag Handle: Native Pointer Events */}
                    <div
                      role="button"
                      tabIndex={0}
                      draggable
                      onPointerDown={(e) => handlePointerDown(e, globalIndex, localIndex)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onDragStart={(e) => handleDragStart(e, localIndex, globalIndex)}
                      onDragEnd={handleDragEnd}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          handleMoveUp(globalIndex);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          handleMoveDown(globalIndex);
                        }
                      }}
                      aria-label={`Drag handle for keyword ${item.text}. Position ${position}. Use Up or Down arrow keys to reorder.`}
                      className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 select-none touch-none"
                      title="Drag to reorder keyword (or use Up/Down arrow keys)"
                    >
                      <GripVertical size={16} />
                    </div>

                    <span className="w-6 h-6 rounded-md bg-secondary text-muted-foreground font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-border">
                      {position}
                    </span>

                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateText(globalIndex, e.target.value)}
                      className="w-full max-w-md px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-transparent hover:border-input focus:border-primary focus:bg-background focus:outline-none transition-colors uppercase font-bold text-foreground"
                      disabled={disabled || isSaving}
                    />
                  </div>

                  {/* Status and Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Active / Inactive Toggle */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickSuppressed()) return;
                        handleToggleActive(globalIndex);
                      }}
                      disabled={disabled || isSaving}
                      className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        item.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                      title={item.is_active ? "Active on ticker (click to disable)" : "Disabled (click to activate)"}
                    >
                      {item.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {/* Move Up */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickSuppressed()) return;
                        handleMoveUp(globalIndex);
                      }}
                      disabled={disabled || isSaving || globalIndex === 0}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Move keyword up"
                    >
                      <ArrowUp size={14} />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickSuppressed()) return;
                        handleMoveDown(globalIndex);
                      }}
                      disabled={disabled || isSaving || globalIndex === items.length - 1}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Move keyword down"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickSuppressed()) return;
                        handleDelete(globalIndex);
                      }}
                      disabled={disabled || isSaving}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Delete keyword"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Drop indicator below */}
                {isDropBelow && (
                  <div
                    className="relative flex items-center justify-center py-1.5 bg-primary/10 select-none pointer-events-none transition-all duration-150"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="absolute inset-x-0 h-0.5 bg-primary rounded-full" />
                    <div className="relative z-10 px-3 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] sm:text-xs tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                      <span>Drop here • Position {landingPosBelow}</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* ── Compact Pagination Bar for Ticker ── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 sm:p-3.5 rounded-xl bg-secondary/20 border border-border/60 text-xs">
          <span className="text-xs text-muted-foreground font-mono">
            Showing {startIndex + 1}–{endIndex} of {items.length} keywords • Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || disabled || isSaving}
              aria-label="Previous Page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span className="px-2.5 py-1 text-xs font-mono font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || disabled || isSaving}
              aria-label="Next Page"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
