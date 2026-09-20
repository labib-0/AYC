import React from "react";
import { CustomerAddressItem } from "@/services/admin";
import { MapPin, CheckCircle2, Phone } from "lucide-react";

export interface CustomerAddressesCardProps {
  addresses: CustomerAddressItem[];
}

export default function CustomerAddressesCard({ addresses }: CustomerAddressesCardProps) {
  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <MapPin size={16} className="text-primary" />
          <span>Saved Addresses ({addresses.length})</span>
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          Delivery Destinations
        </span>
      </div>

      {addresses.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <MapPin size={28} className="mx-auto text-muted-foreground/50 stroke-1" />
          <p className="font-medium text-foreground">No saved addresses.</p>
          <p className="text-[11px]">No saved shipping destinations recorded for this customer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-4 rounded-2xl border text-xs space-y-2 relative transition-all ${
                addr.is_default
                  ? "border-primary/40 bg-primary/5 shadow-xs"
                  : "border-border/60 bg-secondary/20 hover:bg-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-foreground truncate block">
                  {addr.name || addr.contact_name || "Shipping Address"}
                </span>

                {addr.is_default && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 size={10} />
                    <span>Default</span>
                  </span>
                )}
              </div>

              {addr.company_name && (
                <span className="text-muted-foreground font-medium block truncate text-[11px]">
                  {addr.company_name}
                </span>
              )}

              <div className="text-muted-foreground leading-relaxed text-[11px] pt-0.5">
                <span className="block text-foreground">{addr.address1}</span>
                {addr.address2 && <span className="block">{addr.address2}</span>}
                <span className="block">
                  {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
                </span>
                <span className="block font-bold uppercase text-primary mt-0.5">
                  {addr.country_code} {addr.country ? `(${addr.country})` : ""}
                </span>
              </div>

              {addr.phone && (
                <div className="pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                  <Phone size={10} />
                  <span>{addr.phone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
