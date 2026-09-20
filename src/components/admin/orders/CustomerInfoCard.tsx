import React from "react";
import { OrderRecord } from "@/services/order.service";
import { User, Building, Mail, Phone } from "lucide-react";

export interface CustomerInfoCardProps {
  order: OrderRecord;
}

export default function CustomerInfoCard({ order }: CustomerInfoCardProps) {
  const contactName = order.shipping_name || order.user?.name || "Guest Buyer";
  const companyName = order.shipping_company || order.user?.company_name || null;
  const email = order.email || order.user?.email || "—";
  const phone = order.shipping_phone || "—";
  const customerId = order.user_id ? String(order.user_id) : null;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <User size={16} className="text-primary" />
          <span>Customer Information</span>
        </h2>
        {customerId && (
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
            ID: {customerId}
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider">
            Contact Name
          </span>
          <span className="font-bold text-foreground text-sm block mt-0.5">
            {contactName}
          </span>
        </div>

        {companyName && (
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
              <Building size={12} />
              <span>Company / Organization</span>
            </span>
            <span className="font-medium text-foreground block mt-0.5">
              {companyName}
            </span>
          </div>
        )}

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Mail size={12} />
            <span>Email Address</span>
          </span>
          <a
            href={`mailto:${email}`}
            className="text-foreground hover:text-primary transition-colors block mt-0.5 font-mono"
          >
            {email}
          </a>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Phone size={12} />
            <span>Phone Number</span>
          </span>
          <span className="font-mono text-foreground block mt-0.5">
            {phone}
          </span>
        </div>
      </div>
    </div>
  );
}
