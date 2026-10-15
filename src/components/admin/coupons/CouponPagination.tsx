"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface CouponPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  pageSize?: AdminPageSize | number;
  perPage?: AdminPageSize | number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
}

export default function CouponPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  perPage,
  onPageChange,
  onPerPageChange,
}: CouponPaginationProps) {
  const effectivePerPage = perPage ?? pageSize ?? 5;
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      perPage={effectivePerPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="coupons"
      idPrefix="coupons-pagination"
    />
  );
}
