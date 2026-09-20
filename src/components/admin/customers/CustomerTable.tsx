import React from "react";
import Link from "next/link";
import { CustomerRecord } from "@/services/admin";
import CustomerTableRow from "./CustomerTableRow";
import CustomerStatusBadge from "./CustomerStatusBadge";
import { Users, AlertCircle, RefreshCw } from "lucide-react";

export interface CustomerTableProps {
  customers: CustomerRecord[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  detailBaseUrl?: string;
}

export default function CustomerTable({
  customers,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  hasFilters,
  onResetFilters,
  detailBaseUrl = "/admin/customers",
}: CustomerTableProps) {
  // Error State
  if (isError) {
    return (
      <div className="p-8 bg-card border border-destructive/30 rounded-3xl text-center space-y-4 max-w-md mx-auto my-8">
        <AlertCircle size={36} className="text-destructive mx-auto" />
        <h3 className="text-base font-bold uppercase text-foreground">
          Unable to load customers
        </h3>
        <p className="text-xs text-muted-foreground">
          {errorMessage || "An unexpected error occurred while fetching customer accounts."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-card border border-border/70 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60">
          <div className="h-4 w-40 bg-secondary/80 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-secondary rounded" />
                  <div className="h-3 w-24 bg-secondary/60 rounded" />
                </div>
              </div>
              <div className="h-4 w-28 bg-secondary rounded hidden sm:block" />
              <div className="h-5 w-20 bg-secondary rounded" />
              <div className="h-5 w-16 bg-secondary rounded" />
              <div className="h-8 w-14 bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State: Filters returned nothing
  if (customers.length === 0 && hasFilters) {
    return (
      <div className="p-12 bg-card border border-border/70 rounded-3xl text-center space-y-3 shadow-xs">
        <Users size={36} className="text-muted-foreground mx-auto stroke-1" />
        <h3 className="text-base font-bold text-foreground">
          No customers match your current filters.
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Try clearing your search query or changing the role and B2B status filters to view more accounts.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <span>Clear Filters</span>
        </button>
      </div>
    );
  }

  // Empty State: Absolutely no customers
  if (customers.length === 0) {
    return (
      <div className="p-12 bg-card border border-border/70 rounded-3xl text-center space-y-3 shadow-xs">
        <Users size={40} className="text-muted-foreground mx-auto stroke-1" />
        <h3 className="text-base font-bold text-foreground">No customers yet.</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Customer accounts will appear here when they register.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table */}
      <div className="hidden md:block bg-card border border-border/70 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-right">Orders</th>
                <th className="py-3 px-3 text-right">Total Spent</th>
                <th className="py-3 px-3">B2B Status</th>
                <th className="py-3 px-3">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <CustomerTableRow
                  key={customer.id}
                  customer={customer}
                  detailBaseUrl={detailBaseUrl}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Stack */}
      <div className="md:hidden space-y-3">
        {customers.map((customer) => {
          const detailHref = `${detailBaseUrl}/${customer.id}`;
          const createdDate = customer.created_at
            ? new Date(customer.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "—";

          const initials = customer.name
            ? customer.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "CU";

          return (
            <div
              key={customer.id}
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {customer.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={customer.avatar_url}
                      alt={customer.name}
                      className="w-9 h-9 rounded-full object-cover bg-secondary border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={detailHref}
                      className="font-bold text-foreground text-sm hover:text-primary transition-colors block truncate"
                    >
                      {customer.name}
                    </Link>
                    <span className="text-[10px] text-muted-foreground block truncate font-mono">
                      {customer.email} • Joined {createdDate}
                    </span>
                  </div>
                </div>

                <CustomerStatusBadge
                  type="b2b"
                  value={customer.b2b_approval_status || "none"}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block font-bold">
                    Company
                  </span>
                  <span className="text-foreground font-medium truncate block max-w-[140px]">
                    {customer.company_name || "—"}
                  </span>
                </div>

                <div>
                  <CustomerStatusBadge type="role" value={customer.role} size="sm" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase block font-bold">
                    Orders
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {customer.orders_count || 0}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] uppercase block font-bold">
                    Total Spent
                  </span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    ${Number(customer.total_spent || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40">
                <Link
                  href={detailHref}
                  className="w-full py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider text-center transition-colors block"
                >
                  View Customer Profile
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
