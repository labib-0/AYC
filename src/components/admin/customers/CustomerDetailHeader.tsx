import React from "react";
import Link from "next/link";
import { CustomerDetail } from "@/services/admin";
import CustomerStatusBadge from "./CustomerStatusBadge";
import { ArrowLeft, RefreshCw, Shield } from "lucide-react";

export interface CustomerDetailHeaderProps {
  customer: CustomerDetail;
  backHref?: string;
  onOpenRoleDialog: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function CustomerDetailHeader({
  customer,
  backHref = "/admin/customers",
  onOpenRoleDialog,
  onRefresh,
  isLoading = false,
}: CustomerDetailHeaderProps) {
  const createdDate = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
      {/* Back Link & Title */}
      <div className="space-y-1.5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          id="link-back-to-customers"
        >
          <ArrowLeft size={14} />
          <span>Back to Customers</span>
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          {customer.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customer.avatar_url}
              alt={customer.name}
              className="w-12 h-12 rounded-full object-cover bg-secondary border border-border shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {initials}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
                {customer.name}
              </h1>
              <CustomerStatusBadge type="role" value={customer.role} size="md" />
              <CustomerStatusBadge
                type="b2b"
                value={customer.b2b_approval_status || "none"}
                size="md"
              />
            </div>

            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {customer.email} • Joined on {createdDate}
            </p>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onOpenRoleDialog}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
          id="btn-change-customer-role"
        >
          <Shield size={14} className="text-primary" />
          <span>Change Role</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          title="Refresh Customer Record"
          aria-label="Refresh Customer Record"
          id="btn-refresh-customer-detail"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-primary" : ""} />
        </button>
      </div>
    </div>
  );
}
