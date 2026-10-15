"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface OrderPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalOrders: number;
  perPage: AdminPageSize | number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
  isLoading?: boolean;
}

export default function OrderPagination({
  currentPage,
  totalPages,
  totalOrders,
  perPage,
  onPageChange,
  onPerPageChange,
}: OrderPaginationProps) {
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalOrders}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="orders"
      idPrefix="orders-pagination"
    />
  );
}
