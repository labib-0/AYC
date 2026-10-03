"use client";

import React from "react";
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { UseAdminOrderedListReturn } from "./useAdminOrderedList";

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export interface AdminOrderedListProps<T, C = any> {
  orderedList: UseAdminOrderedListReturn<T, C>;
  getItemId: (item: T) => string | number;
  getCatalogItemId?: (item: C) => string | number;

  // Custom renderers
  renderPinnedItem: (item: T, position: number, index: number) => React.ReactNode;
  renderCatalogItem?: (item: C) => React.ReactNode;

  // Styling & labels
  themeColor?: "primary" | "orange" | "amber";
  pinnedLabel?: string;
  unpinLabel?: string;
  addLabel?: string;
  emptyPinnedMessage?: string;
  emptyCatalogMessage?: string;
  catalogDividerLabel?: string;
  catalogDividerSublabel?: string;

  // Controls configuration
  searchPlaceholder?: string;
  searchInputId?: string;
  showToolbar?: boolean;
  showViewFilter?: boolean;
  showPageSize?: boolean;
  showPagination?: boolean;
  hasCatalog?: boolean;
}

export function AdminOrderedList<T, C = any>({
  orderedList,
  getItemId,
  getCatalogItemId,
  renderPinnedItem,
  renderCatalogItem,
  themeColor = "primary",
  pinnedLabel = "PINNED ✓",
  unpinLabel = "REMOVE",
  addLabel = "+ ADD",
  emptyPinnedMessage = "No items pinned yet",
  emptyCatalogMessage = "No items found",
  catalogDividerLabel = "Available Catalog",
  catalogDividerSublabel = "Click + ADD to pin",
  searchPlaceholder = "Search items...",
  searchInputId,
  showToolbar = true,
  showViewFilter = true,
  showPageSize = true,
  showPagination = true,
  hasCatalog = true,
}: AdminOrderedListProps<T, C>) {
  const {
    items,
    pinnedPage,
    pinnedTotalPages,
    pinnedTotalCount,
    visiblePinnedItems,
    pinnedStartIndex,
    pinnedEndIndex,
    handlePinnedPageChange,
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
    moveUp,
    moveDown,
    handleRemove,
    availableCatalog,
    searchQuery,
    handleSearchChange,
    pageSize,
    handlePageSizeChange,
    currentPage,
    totalPages,
    totalCount,
    isLoadingCatalog,
    handlePageChange,
    viewFilter,
    setViewFilter,
    handleAddFromCatalog,
  } = orderedList;

  // Theme color styling mappings
  const colorStyles = {
    primary: {
      bgSubtle: "bg-primary/5",
      bgHover: "hover:bg-primary/10",
      bgActive: "bg-primary/10",
      ring: "ring-primary/40",
      border: "border-primary/30",
      text: "text-primary",
      badgeBg: "bg-primary/20",
      indicatorBg: "bg-primary",
      indicatorText: "text-primary-foreground",
    },
    orange: {
      bgSubtle: "bg-orange-500/5",
      bgHover: "hover:bg-orange-500/10",
      bgActive: "bg-orange-500/10",
      ring: "ring-orange-500/40",
      border: "border-orange-500/30",
      text: "text-orange-600 dark:text-orange-400",
      badgeBg: "bg-orange-500/20",
      indicatorBg: "bg-orange-500",
      indicatorText: "text-white",
    },
    amber: {
      bgSubtle: "bg-amber-500/5",
      bgHover: "hover:bg-amber-500/10",
      bgActive: "bg-amber-500/10",
      ring: "ring-amber-500/40",
      border: "border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      badgeBg: "bg-amber-500/20",
      indicatorBg: "bg-amber-500",
      indicatorText: "text-amber-950",
    },
  }[themeColor];

  // Filter pinned items: show visible items for the current pinnedPage (default page size: 5)
  const filteredPinnedItems = visiblePinnedItems;

  return (
    <div className="space-y-4 w-full">
      {/* ── Optional Toolbar: Search, View Filter & Page Size Selector ── */}
      {showToolbar && hasCatalog && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/70 bg-secondary/20">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              id={searchInputId}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-card border border-border/80 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* View Filter & Page Size Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {showViewFilter && (
              <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-card text-xs">
                <button
                  type="button"
                  onClick={() => setViewFilter("all")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Items
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter("pinned")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewFilter === "pinned"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Selected Only</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-primary-foreground/20 font-bold">
                    {items.length}
                  </span>
                </button>
              </div>
            )}

            {showPageSize && (
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
            )}
          </div>
        </div>
      )}

      {/* ── Main Unified List ── */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card divide-y divide-border/50">
        {/* Loading State */}
        {isLoadingCatalog && items.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <Loader2 size={22} className="animate-spin text-primary" />
            <span className="text-xs font-medium">Loading items...</span>
          </div>
        )}

        {/* Empty State when no items exist at all */}
        {!isLoadingCatalog && items.length === 0 && (!hasCatalog || availableCatalog.length === 0) && (
          <div className="py-12 text-center p-6 space-y-2">
            <Sparkles size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-foreground">{emptyCatalogMessage}</p>
            {searchQuery && (
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No matching results found for &quot;{searchQuery}&quot;.
              </p>
            )}
          </div>
        )}

        {/* 1. PINNED / ORDERED ITEMS LIST */}
        {filteredPinnedItems.length > 0 && (
          <div data-ordered-container className={`${colorStyles.bgSubtle} divide-y divide-border/40`}>
            {filteredPinnedItems.map((item, localIndex) => {
              const globalIndex = pinnedStartIndex + localIndex;
              const id = getItemId(item);
              const position = globalIndex + 1; // 1-based global position
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
                <React.Fragment key={`pinned-fragment-${id}`}>
                  {/* Drop Indicator Above */}
                  {isDropAbove && (
                    <div
                      className={`relative flex items-center justify-center py-1.5 ${colorStyles.bgSubtle} select-none pointer-events-none transition-all duration-150`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className={`absolute inset-x-0 h-0.5 ${colorStyles.indicatorBg} rounded-full`} />
                      <div
                        className={`relative z-10 px-3 py-0.5 rounded-full ${colorStyles.indicatorBg} ${colorStyles.indicatorText} font-bold text-[10px] sm:text-xs tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                        <span>Drop here • Position {landingPosAbove}</span>
                      </div>
                    </div>
                  )}

                  {/* Row */}
                  <div
                    data-ordered-row
                    data-id={id}
                    data-index={localIndex}
                    data-global-index={globalIndex}
                    onDragOver={(e) => handleDragOver(e, localIndex, globalIndex)}
                    onDrop={(e) => handleDrop(e, localIndex, globalIndex)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 transition-all ${
                      isDragging
                        ? `opacity-40 scale-[0.995] ${colorStyles.bgActive} border-dashed ring-1 ${colorStyles.ring}`
                        : dragOverTarget?.globalIndex === globalIndex
                        ? `${colorStyles.bgActive} ring-1 ${colorStyles.ring}`
                        : colorStyles.bgHover
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      {/* Drag Handle: Native Pointer Events with Pointer Capture */}
                      <div
                        role="button"
                        tabIndex={0}
                        onPointerDown={(e) => handlePointerDown(e, globalIndex, localIndex)}
                        onPointerCancel={handlePointerCancel}
                        onKeyDown={(e) => handleKeyDown(e, localIndex, globalIndex)}
                        aria-label={`Drag handle for item position ${position}. Press Up or Down arrow keys to reorder.`}
                        className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 select-none touch-none"
                        title="Drag handle: Drag to reorder sequence (or use Up/Down arrow keys)"
                      >
                        <GripVertical size={16} />
                      </div>

                      {/* Position Number Badge */}
                      <span
                        className={`w-6 h-6 rounded-md ${colorStyles.badgeBg} ${colorStyles.text} font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${colorStyles.border}`}
                      >
                        {String(position).padStart(2, "0")}
                      </span>

                      {/* Domain-specific Item Renderer */}
                      <div className="min-w-0 flex-1">
                        {renderPinnedItem(item, position, globalIndex)}
                      </div>
                    </div>

                    {/* Actions: Move Up, Move Down, Remove / Unpin */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickSuppressed()) return;
                          moveUp(globalIndex);
                        }}
                        disabled={globalIndex === 0 || isPointerDragging}
                        title={globalIndex === 0 ? "First position" : `Move up to position ${position - 1}`}
                        aria-label={`Move item up to position ${position - 1}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickSuppressed()) return;
                          moveDown(globalIndex);
                        }}
                        disabled={globalIndex === items.length - 1 || isPointerDragging}
                        title={globalIndex === items.length - 1 ? "Last position" : `Move down to position ${position + 1}`}
                        aria-label={`Move item down to position ${position + 1}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>

                      {hasCatalog && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isClickSuppressed()) return;
                            handleRemove(id);
                          }}
                          title="Click to remove from curation"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${colorStyles.badgeBg} ${colorStyles.text} hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-bold uppercase tracking-wider border ${colorStyles.border} hover:border-red-500/30 transition-all cursor-pointer shrink-0 ml-1 group`}
                        >
                          <Check size={12} className="group-hover:hidden" />
                          <Trash2 size={12} className="hidden group-hover:inline" />
                          <span className="group-hover:hidden">{pinnedLabel}</span>
                          <span className="hidden group-hover:inline">{unpinLabel}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Drop Indicator Below */}
                  {isDropBelow && (
                    <div
                      className={`relative flex items-center justify-center py-1.5 ${colorStyles.bgSubtle} select-none pointer-events-none transition-all duration-150`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className={`absolute inset-x-0 h-0.5 ${colorStyles.indicatorBg} rounded-full`} />
                      <div
                        className={`relative z-10 px-3 py-0.5 rounded-full ${colorStyles.indicatorBg} ${colorStyles.indicatorText} font-bold text-[10px] sm:text-xs tracking-wide uppercase shadow-xs flex items-center gap-1.5 font-mono`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                        <span>Drop here • Position {landingPosBelow}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Compact Pinned Items Pagination Bar ── */}
            {pinnedTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2.5 bg-secondary/20 border-t border-border/60 text-xs">
                <span className="text-xs text-muted-foreground font-mono">
                  Showing {pinnedStartIndex + 1}–{pinnedEndIndex} of {pinnedTotalCount} selected items • Page {pinnedPage} of {pinnedTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePinnedPageChange(pinnedPage - 1)}
                    disabled={pinnedPage <= 1}
                    aria-label="Previous Page of Selected Items"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>
                  <span className="px-2.5 py-1 text-xs font-mono font-bold text-foreground">
                    {pinnedPage} / {pinnedTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePinnedPageChange(pinnedPage + 1)}
                    disabled={pinnedPage >= pinnedTotalPages}
                    aria-label="Next Page of Selected Items"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Helper divider when both pinned items and catalog items are shown */}
        {hasCatalog && viewFilter === "all" && filteredPinnedItems.length > 0 && availableCatalog.length > 0 && (
          <div className="px-3 py-1.5 bg-secondary/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>
              {catalogDividerLabel} (Page {currentPage} of {totalPages})
            </span>
            <span>{catalogDividerSublabel}</span>
          </div>
        )}

        {/* 2. UNPINNED CATALOG ITEMS */}
        {hasCatalog && viewFilter === "all" && renderCatalogItem && (
          <div className="divide-y divide-border/40">
            {availableCatalog.map((catalogItem) => {
              const catId = getCatalogItemId ? getCatalogItemId(catalogItem) : (catalogItem as any)?.id;

              return (
                <div
                  key={`catalog-${catId}`}
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-secondary/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Placeholder space to align with drag handle & position */}
                    <div className="w-6 flex items-center justify-center text-muted-foreground/30 text-xs">
                      •
                    </div>

                    <div className="min-w-0 flex-1">
                      {renderCatalogItem(catalogItem)}
                    </div>
                  </div>

                  {/* + ADD / + PIN Action */}
                  <button
                    type="button"
                    onClick={() => handleAddFromCatalog(catalogItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold uppercase tracking-wider border border-primary/20 transition-all cursor-pointer shrink-0 active:scale-95 ml-2"
                  >
                    <Plus size={12} />
                    <span>{addLabel}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty pinned state when viewing "pinned" filter */}
        {hasCatalog && viewFilter === "pinned" && filteredPinnedItems.length === 0 && (
          <div className="py-12 text-center p-6 space-y-2">
            <Sparkles size={24} className="text-muted-foreground/40 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-foreground">{emptyPinnedMessage}</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Switch to &quot;All Items&quot; and click &quot;{addLabel}&quot; on any item to curate your list.
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination Bar (Catalog Navigation) ── */}
      {hasCatalog && showPagination && viewFilter === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-xs text-muted-foreground font-mono">
            Page {currentPage} of {totalPages} ({totalCount} total catalog items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoadingCatalog}
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
              disabled={currentPage >= totalPages || isLoadingCatalog}
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
