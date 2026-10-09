import React, { useState } from "react";
import { OrderRecord } from "@/services/order.service";
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Anchor,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Truck,
} from "lucide-react";

export interface OrderCustomerDeliveryCardProps {
  order: OrderRecord;
}

export default function OrderCustomerDeliveryCard({
  order,
}: OrderCustomerDeliveryCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const contactName = order.shipping_name || order.user?.name || "Customer";
  const companyName = order.shipping_company || order.user?.company_name;
  const email = order.email || order.user?.email;
  const phone = order.shipping_phone;
  const customerId = order.user_id ? String(order.user_id) : null;

  const fullAddressLines = [
    order.shipping_name,
    order.shipping_company,
    order.shipping_address1,
    order.shipping_address2,
    [order.shipping_city, order.shipping_region, order.shipping_postal_code]
      .filter(Boolean)
      .join(", "),
    order.shipping_country_code,
  ]
    .filter(Boolean)
    .join("\n");

  const notifyParty = order.third_party_notify;

  return (
    <div
      className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-5"
      id="admin-customer-delivery-section"
    >
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <User size={16} className="text-primary" />
          <span>Customer &amp; Delivery</span>
        </h2>
        {customerId && (
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/50">
            ID: {customerId}
          </span>
        )}
      </div>

      {/* Subsection A: Customer Contact Profile */}
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Contact Profile
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-2.5">
          <div>
            <span className="font-bold text-foreground text-sm block">
              {contactName}
            </span>
            {companyName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                <Building size={12} className="shrink-0" />
                <span>{companyName}</span>
              </span>
            )}
          </div>

          <div className="space-y-2 pt-1 border-t border-border/40">
            {/* Email */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail size={13} className="text-primary shrink-0" />
                <span className="font-mono text-[11px] text-foreground truncate">
                  {email || "—"}
                </span>
              </div>
              {email && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(email, "email")}
                  className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Copy email address"
                >
                  {copiedKey === "email" ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <Phone size={13} className="text-primary shrink-0" />
                <span className="font-mono text-[11px] text-foreground truncate">
                  {phone || "—"}
                </span>
              </div>
              {phone && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(phone, "phone")}
                  className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Copy phone number"
                >
                  {copiedKey === "phone" ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subsection B: Shipping & Destination Address */}
      <div className="space-y-3 text-xs pt-1 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" />
            <span>Delivery &amp; Destination Address</span>
          </span>

          {order.shipping_address1 && (
            <button
              type="button"
              onClick={() => copyToClipboard(fullAddressLines, "address")}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary hover:underline cursor-pointer"
              title="Copy complete shipping address"
            >
              {copiedKey === "address" ? (
                <>
                  <Check size={11} className="text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 text-foreground leading-relaxed">
          <span className="font-bold block">{order.shipping_name}</span>
          {order.shipping_company && (
            <span className="block text-muted-foreground font-medium">
              {order.shipping_company}
            </span>
          )}
          <span className="block mt-0.5">{order.shipping_address1}</span>
          {order.shipping_address2 && (
            <span className="block">{order.shipping_address2}</span>
          )}
          <span className="block">
            {order.shipping_city}
            {order.shipping_region ? `, ${order.shipping_region}` : ""}{" "}
            <span className="font-mono">{order.shipping_postal_code}</span>
          </span>
          <span className="block font-bold uppercase mt-1 text-primary">
            {order.shipping_country_code}
          </span>
        </div>

        {/* Port & Logistics Specifications */}
        {(order.destination_port || order.transport_method || order.shipping_service_type) && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {order.destination_port && (
              <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Anchor size={11} />
                  <span>Destination Port</span>
                </span>
                <span className="font-bold text-foreground block truncate">
                  {order.destination_port}
                </span>
              </div>
            )}

            {order.transport_method && (
              <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Truck size={11} />
                  <span>Transport Mode</span>
                </span>
                <span className="font-bold text-foreground uppercase block truncate">
                  {order.transport_method}
                </span>
              </div>
            )}

            {order.shipping_service_type && (
              <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5 col-span-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Service / Incoterm
                </span>
                <span className="font-bold text-foreground block truncate">
                  {order.shipping_service_type}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Third-Party Notify Party */}
        {notifyParty && (notifyParty.name || notifyParty.address) && (
          <div className="p-3 rounded-xl bg-secondary/20 border border-border/50 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <FileText size={11} />
              <span>Third-Party Notify Party</span>
            </span>
            {notifyParty.name && (
              <span className="font-bold text-foreground block">
                {notifyParty.name}
              </span>
            )}
            {notifyParty.address && (
              <span className="text-muted-foreground block text-[11px]">
                {notifyParty.address}
              </span>
            )}
          </div>
        )}

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-0.5">
            <span className="text-[10px] font-bold uppercase flex items-center gap-1">
              <AlertCircle size={11} />
              <span>Special Handling Instructions</span>
            </span>
            <p className="text-[11px] leading-relaxed">
              {order.special_instructions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
