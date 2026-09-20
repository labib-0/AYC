import React from "react";
import { CustomerDetail } from "@/services/admin";
import { User, Mail, Phone, Building, Calendar, ShoppingBag, DollarSign, FileText } from "lucide-react";

export interface CustomerProfileCardProps {
  customer: CustomerDetail;
}

export default function CustomerProfileCard({ customer }: CustomerProfileCardProps) {
  const createdDate = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <User size={16} className="text-primary" />
          <span>Customer &amp; Company Profile</span>
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
          User ID: {customer.id}
        </span>
      </div>

      {/* Commercial Overview KPI Pills */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block flex items-center gap-1">
            <ShoppingBag size={11} />
            <span>Orders Placed</span>
          </span>
          <span className="font-mono font-bold text-foreground text-base block">
            {customer.orders_count || 0}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block flex items-center gap-1">
            <DollarSign size={11} />
            <span>Total Spent</span>
          </span>
          <span className="font-mono font-bold text-foreground text-base block">
            ${Number(customer.total_spent || 0).toFixed(2)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 space-y-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground block flex items-center gap-1">
            <FileText size={11} />
            <span>Quotations</span>
          </span>
          <span className="font-mono font-bold text-foreground text-base block">
            {customer.quotes_count || 0}
          </span>
        </div>
      </div>

      {/* Contact & Company Details */}
      <div className="space-y-3 text-xs pt-1">
        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
            Contact Name
          </span>
          <span className="font-bold text-foreground text-sm block mt-0.5">
            {customer.name}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Building size={12} />
            <span>Company Name</span>
          </span>
          <span className="font-medium text-foreground block mt-0.5">
            {customer.company_name || "—"}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Mail size={12} />
            <span>Email Address</span>
          </span>
          <a
            href={`mailto:${customer.email}`}
            className="text-foreground hover:text-primary transition-colors block mt-0.5 font-mono"
          >
            {customer.email}
          </a>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Phone size={12} />
            <span>Phone Number</span>
          </span>
          <span className="font-mono text-foreground block mt-0.5">
            {customer.phone || "—"}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Calendar size={12} />
            <span>Registered On</span>
          </span>
          <span className="font-mono text-foreground block mt-0.5">
            {createdDate}
          </span>
        </div>
      </div>
    </div>
  );
}
