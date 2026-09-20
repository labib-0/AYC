"use client";

import React from "react";
import { CategoryModel } from "@/services/category.service";
import CategoryRow from "./CategoryRow";
import CategoryEmptyState from "./CategoryEmptyState";

interface CategoryTableProps {
  categories: CategoryModel[];
  loading: boolean;
  isFiltered: boolean;
  onEdit: (category: CategoryModel) => void;
  onToggleStatus: (category: CategoryModel) => void;
  onDelete: (category: CategoryModel) => void;
  onAddCategory: () => void;
  onClearFilters: () => void;
}

export default function CategoryTable({
  categories,
  loading,
  isFiltered,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddCategory,
  onClearFilters,
}: CategoryTableProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Skeleton Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4 w-24">Image</th>
                <th className="py-3 px-4">Category</th>
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
                  <td className="py-3 px-4">
                    <div className="w-16 h-12 bg-secondary animate-pulse rounded-xl" />
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

  if (categories.length === 0) {
    return (
      <CategoryEmptyState
        isFiltered={isFiltered}
        onAddCategory={onAddCategory}
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
              <th scope="col" className="py-3 px-4 w-24">Image</th>
              <th scope="col" className="py-3 px-4">Category</th>
              <th scope="col" className="py-3 px-4">Slug</th>
              <th scope="col" className="py-3 px-4">Products</th>
              <th scope="col" className="py-3 px-4">Sort Order</th>
              <th scope="col" className="py-3 px-4">Status</th>
              <th scope="col" className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden p-3 space-y-2.5">
        {categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
