"use client";

import React from "react";
import { BrandModel } from "@/services/brand.service";
import BrandRow from "./BrandRow";
import BrandCard from "./BrandCard";
import BrandEmptyState from "./BrandEmptyState";

interface BrandTableProps {
  brands: BrandModel[];
  loading: boolean;
  isFiltered: boolean;
  onEdit: (brand: BrandModel) => void;
  onToggleStatus: (brand: BrandModel) => void;
  onDelete: (brand: BrandModel) => void;
  onAddBrand: () => void;
  onClearFilters: () => void;
  startIndex?: number;
  showReorderControls?: boolean;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  onPointerDown?: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  onMoveUp?: (globalIndex: number) => void;
  onMoveDown?: (globalIndex: number) => void;
  isFirstItem?: (globalIndex: number) => boolean;
  isLastItem?: (globalIndex: number) => boolean;
  getRowVisualClass?: (globalIndex: number) => string;
}

export default function BrandTable({
  brands,
  loading,
  isFiltered,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddBrand,
  onClearFilters,
  startIndex = 0,
  showReorderControls = false,
  isReorderDisabled = false,
  disabledReason,
  onPointerDown,
  onMoveUp,
  onMoveDown,
  isFirstItem,
  isLastItem,
  getRowVisualClass,
}: BrandTableProps) {
  const hasDuplicateSortOrders = React.useMemo(() => {
    const seen = new Set<number>();
    for (const b of brands) {
      const order = b.sort_order ?? 0;
      if (order <= 0 || seen.has(order)) {
        return true;
      }
      seen.add(order);
    }
    return false;
  }, [brands]);

  if (loading) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Skeleton Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-3 w-10 text-center"><span className="sr-only">Reorder</span></th>
                <th className="py-3 px-4 w-28">Logo</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4">Sort Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-3 px-3 w-10 text-center">
                    <div className="w-5 h-5 bg-secondary animate-pulse rounded mx-auto" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-20 h-11 bg-secondary animate-pulse rounded-xl" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-32 bg-secondary animate-pulse rounded" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-3.5 w-24 bg-secondary animate-pulse rounded" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-5 w-20 bg-secondary animate-pulse rounded-full" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-3.5 w-8 bg-secondary animate-pulse rounded" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-5 w-16 bg-secondary animate-pulse rounded-full" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-7 w-20 bg-secondary animate-pulse rounded-lg ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Skeleton Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-secondary animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <BrandEmptyState
        isFiltered={isFiltered}
        onAddBrand={onAddBrand}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
      {/* Desktop & Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="py-3 px-3 w-10 text-center"><span className="sr-only">Reorder</span></th>
              <th scope="col" className="py-3 px-4 w-28">Logo</th>
              <th scope="col" className="py-3 px-4">Brand</th>
              <th scope="col" className="py-3 px-4">Slug</th>
              <th scope="col" className="py-3 px-4">Products</th>
              <th scope="col" className="py-3 px-4">Sort Order</th>
              <th scope="col" className="py-3 px-4">Status</th>
              <th scope="col" className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody data-ordered-container className="divide-y divide-border/40">
            {brands.map((b, i) => {
              const globalIndex = startIndex + i;
              return (
                <BrandRow
                  key={b.id}
                  brand={b}
                  globalIndex={globalIndex}
                  localIndex={i}
                  hasDuplicateSortOrders={hasDuplicateSortOrders}
                  showReorderControls={showReorderControls}
                  isReorderDisabled={isReorderDisabled}
                  disabledReason={disabledReason}
                  onPointerDown={showReorderControls ? onPointerDown : undefined}
                  onMoveUp={showReorderControls && onMoveUp ? () => onMoveUp(globalIndex) : undefined}
                  onMoveDown={showReorderControls && onMoveDown ? () => onMoveDown(globalIndex) : undefined}
                  isFirst={isFirstItem ? isFirstItem(globalIndex) : false}
                  isLast={isLastItem ? isLastItem(globalIndex) : false}
                  rowVisualClass={showReorderControls && getRowVisualClass ? getRowVisualClass(globalIndex) : ""}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div data-ordered-container className="md:hidden p-3 space-y-2.5">
        {brands.map((b, i) => {
          const globalIndex = startIndex + i;
          return (
            <BrandCard
              key={b.id}
              brand={b}
              globalIndex={globalIndex}
              localIndex={i}
              hasDuplicateSortOrders={hasDuplicateSortOrders}
              rowVisualClass={showReorderControls && getRowVisualClass ? getRowVisualClass(globalIndex) : ""}
              showReorderControls={showReorderControls}
              isReorderDisabled={isReorderDisabled}
              disabledReason={disabledReason}
              onPointerDown={showReorderControls ? onPointerDown : undefined}
              onMoveUp={showReorderControls && onMoveUp ? () => onMoveUp(globalIndex) : undefined}
              onMoveDown={showReorderControls && onMoveDown ? () => onMoveDown(globalIndex) : undefined}
              isFirst={isFirstItem ? isFirstItem(globalIndex) : false}
              isLast={isLastItem ? isLastItem(globalIndex) : false}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
