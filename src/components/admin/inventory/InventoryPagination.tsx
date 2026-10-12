"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface InventoryPaginationProps {
  currentPage: number;
  perPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
}

export default function InventoryPagination({
  currentPage,
  perPage,
  totalItems,
  onPageChange,
  onPerPageChange,
}: InventoryPaginationProps) {
  return (
    <AdminPagination
      currentPage={currentPage}
      totalItems={totalItems}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="inventory records"
      idPrefix="inventory-pagination"
    />
  );
}
