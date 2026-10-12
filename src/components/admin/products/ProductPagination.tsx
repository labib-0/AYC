"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface ProductPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
}

export default function ProductPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: ProductPaginationProps) {
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="products"
      idPrefix="products-pagination"
    />
  );
}
