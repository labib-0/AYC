"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface CustomerPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalCustomers: number;
  perPage: AdminPageSize | number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
  isLoading?: boolean;
}

export default function CustomerPagination({
  currentPage,
  totalPages,
  totalCustomers,
  perPage,
  onPageChange,
  onPerPageChange,
}: CustomerPaginationProps) {
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalCustomers}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="customer accounts"
      idPrefix="customers-pagination"
    />
  );
}
