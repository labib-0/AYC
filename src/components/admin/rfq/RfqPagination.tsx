"use client";

import React from "react";
import AdminPagination from "@/components/admin/common/AdminPagination";
import { AdminPageSize } from "@/types/admin-listing";

export interface RfqPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalRfqs: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: AdminPageSize) => void;
  isLoading?: boolean;
}

export default function RfqPagination({
  currentPage,
  totalPages,
  totalRfqs,
  perPage,
  onPageChange,
  onPerPageChange,
}: RfqPaginationProps) {
  return (
    <AdminPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalRfqs}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
      itemName="RFQs"
      idPrefix="rfq-pagination"
    />
  );
}
