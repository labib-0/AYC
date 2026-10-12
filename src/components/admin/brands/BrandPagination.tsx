"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface BrandPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
}

export default function BrandPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: BrandPaginationProps) {
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="brands"
      idPrefix="brands-pagination"
    />
  );
}
