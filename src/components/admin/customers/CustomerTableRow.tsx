import React from "react";
import Link from "next/link";
import { CustomerRecord } from "@/services/admin";
import { Eye, Trash2 } from "lucide-react";

export interface CustomerTableRowProps {
  customer: CustomerRecord;
  detailBaseUrl?: string;
  onDeleteCustomer?: (customer: CustomerRecord) => void;
}

export default function CustomerTableRow({
  customer,
  detailBaseUrl = "/admin/customers",
  onDeleteCustomer,
}: CustomerTableRowProps) {
  const detailHref = `${detailBaseUrl}/${customer.id}`;

  const createdDate = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  // Initials fallback
  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CU";

  return (
    <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors text-xs">
      {/* 1. Customer Account */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {customer.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customer.avatar_url}
              alt={customer.name}
              className="w-9 h-9 rounded-full object-cover bg-secondary border border-border shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <Link
              href={detailHref}
              className="font-bold text-foreground hover:text-primary transition-colors block truncate"
            >
              {customer.name}
            </Link>
            <span className="text-[10px] text-muted-foreground block truncate font-mono">
              ID: {customer.id}
            </span>
          </div>
        </div>
      </td>

      {/* 2. Email */}
      <td className="py-3 px-3">
        <a
          href={`mailto:${customer.email}`}
          className="text-foreground hover:text-primary transition-colors block truncate max-w-[190px] font-mono text-[11px]"
        >
          {customer.email}
        </a>
      </td>

      {/* 3. Company */}
      <td className="py-3 px-3">
        {customer.company_name ? (
          <span className="text-foreground font-medium block truncate max-w-[160px]">
            {customer.company_name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* 4. Orders */}
      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
        {customer.orders_count || 0}
      </td>

      {/* 5. Total Spent */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <span className="font-mono font-bold text-foreground text-sm block">
          ${Number(customer.total_spent || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase font-mono block">
          USD
        </span>
      </td>

      {/* 6. Joined */}
      <td className="py-3 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
        {createdDate}
      </td>

      {/* 7. Actions */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 justify-end">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="View Customer Profile"
            id={`btn-view-customer-${customer.id}`}
          >
            <Eye size={12} className="text-muted-foreground" />
            <span>View</span>
          </Link>

          {onDeleteCustomer && (
            <button
              type="button"
              onClick={() => onDeleteCustomer(customer)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              title="Delete Customer Account"
              id={`btn-delete-customer-${customer.id}`}
            >
              <Trash2 size={12} />
              <span className="sr-only sm:not-sr-only">Delete</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
