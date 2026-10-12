"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface QuotationPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  pageSize?: number;
  perPage?: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
  isLoading?: boolean;
}

export default function QuotationPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  perPage,
  onPageChange,
  onPerPageChange,
}: QuotationPaginationProps) {
  const effectivePerPage = perPage ?? pageSize ?? 5;
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      perPage={effectivePerPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="quotations"
      idPrefix="quotations-pagination"
    />
  );
}
