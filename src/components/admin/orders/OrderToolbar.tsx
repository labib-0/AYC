import React from "react";
import { Search, X } from "lucide-react";
import OrderDateFilter, { DateFilterPreset } from "./OrderDateFilter";

export interface OrderToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  datePreset: DateFilterPreset;
  dateFrom?: string;
  dateTo?: string;
  onDateChange: (preset: DateFilterPreset, dateFrom?: string, dateTo?: string) => void;
  customerStatus?: string;
  onCustomerStatusChange?: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  fulfillmentStatus: string;
  onFulfillmentStatusChange: (val: string) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

export default function OrderToolbar({
  search,
  onSearchChange,
  datePreset,
  dateFrom,
  dateTo,
  onDateChange,
  customerStatus = "all",
  onCustomerStatusChange,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  fulfillmentStatus,
  onFulfillmentStatusChange,
  onResetFilters,
  totalFiltered,
}: OrderToolbarProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    datePreset !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    status !== "all" ||
    paymentStatus !== "all" ||
    fulfillmentStatus !== "all";

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3 relative z-20">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by Order #, Customer, Company, or Email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
          id="input-search-orders"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter Selects */}
      <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto shrink-0">
        {/* Date Filter */}
        <OrderDateFilter
          datePreset={datePreset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={onDateChange}
        />

        {/* Canonical Customer Lifecycle Filter */}
        {onCustomerStatusChange && (
          <select
            value={customerStatus}
            onChange={(e) => onCustomerStatusChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-primary/30 bg-primary/5 text-foreground font-bold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            id="select-canonical-customer-status"
            aria-label="Filter by Canonical Customer Status"
          >
            <option value="all">All Canonical Lifecycles</option>
            <option value="ORDER_PLACED">Order Placed</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
            <option value="WAITING_FOR_APPROVAL">Waiting for Approval</option>
            <option value="ORDER_CONFIRMED">Order Confirmed</option>
            <option value="ON_SHIPMENT">On Shipment</option>
          </select>
        )}

        {/* Order Status */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-order-status"
          aria-label="Filter by Order Status"
        >
          <option value="all">All Order Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Payment Status */}
        <select
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-payment-status"
          aria-label="Filter by Payment Status"
        >
          <option value="all">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Fulfillment Status */}
        <select
          value={fulfillmentStatus}
          onChange={(e) => onFulfillmentStatusChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          id="select-fulfillment-status"
          aria-label="Filter by Fulfillment Status"
        >
          <option value="all">All Fulfillment</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="partial">Partial</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-2 text-xs rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            id="btn-reset-order-filters"
          >
            <X size={12} />
            <span>Reset</span>
          </button>
        )}

        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap pl-1">
          {totalFiltered} {totalFiltered === 1 ? "order" : "orders"}
        </span>
      </div>
    </div>
  );
}
