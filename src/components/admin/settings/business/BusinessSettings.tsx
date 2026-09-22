"use client";

import React, { useState, useEffect } from "react";
import { Building2, MapPin, Globe, Phone, Mail, MessageSquare, Lock, Save, AlertCircle, ShieldCheck } from "lucide-react";
import { mockStore } from "@/lib/mock-data/mock-store";
import { BusinessProfile } from "@/config/business-profile";

export interface BusinessSettingsProps {
  onNotify: (message: string) => void;
}

export default function BusinessSettings({ onNotify }: BusinessSettingsProps) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = mockStore.getBusinessProfile();
    setProfile(data);
    setName(data.name || "AYAAN CLOTHING");
    setDescription(data.description || "Ready-made Garments Manufacturer & Exporter");
    setLine1(data.address.line1 || "");
    setLine2(data.address.line2 || "");
    setArea(data.address.area || "Uttara");
    setCity(data.address.city || "Dhaka");
    setPostalCode(data.address.postalCode || "1230");
    setCountry(data.address.country || "Bangladesh");
    setPhone(data.contact.phone || "");
    setEmail(data.contact.email || "export@ayaanclothing.com");
    setWhatsapp(data.contact.whatsappNumber || "8801826304930");
    setWebsite(data.contact.website || "www.ayaanclothing.com");
  }, []);

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    try {
      const formattedAddress = [line1, line2, area, `${city}-${postalCode}`, country]
        .filter(Boolean)
        .join(", ");

      const updated = mockStore.saveBusinessProfile({
        name: name.trim(),
        description: description.trim(),
        address: {
          line1: line1.trim(),
          line2: line2.trim(),
          area: area.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          countryCode: "BD",
          formatted: formattedAddress,
        },
        contact: {
          email: email.trim() || null,
          phone: phone.trim() || null,
          whatsappNumber: whatsapp.trim(),
          whatsappUrl: `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`,
          website: website.trim(),
        },
      });

      setProfile(updated);
      onNotify("Business profile updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update business profile.");
    } finally {
      setSaving(false);
    }
  };

  const banking = profile?.banking;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Corporate Overview Card */}
      <form onSubmit={handleSaveBusiness} className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Official Corporate Identity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These details appear on Proforma Invoices, Commercial Invoices, Packing Lists, and Quotations.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider font-mono">
            EST. 2010 • BD
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">
              Official Company / Exporter Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="AYAAN CLOTHING"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-bold tracking-wide"
              />
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">
              Corporate Description / Export Tagline
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ready-made Garments Manufacturer & Exporter"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* Physical Address Fields */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Address Line 1</label>
            <div className="relative">
              <input
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="House #33 (2nd floor)"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Address Line 2 (Road / Sector)</label>
            <input
              type="text"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              placeholder="Road #12, Sector #11"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Area / District</label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Uttara"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Dhaka"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="1230"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Bangladesh"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* Contact Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Official Export Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="export@ayaanclothing.com"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Direct Telephone</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 2-892100"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">WhatsApp Business Number</label>
            <div className="relative">
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="8801826304930"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
              />
              <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Corporate Website</label>
            <div className="relative">
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.ayaanclothing.com"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? "Saving..." : "Save Business Info"}</span>
          </button>
        </div>
      </form>

      {/* Official Beneficiary Bank Details Card (Strictly Verified Pubali Bank Details) */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Beneficiary Bank Wire Instructions</h3>
              <p className="text-xs text-muted-foreground">
                Mandatory international trade banking details embedded into official commercial invoices and proforma documents.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={12} />
            <span>Export Verified</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Bank Name
              </span>
              <span className="font-semibold text-foreground text-xs block">
                {banking?.bankName || "Pubali Bank Limited"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Account Title
              </span>
              <span className="font-semibold text-foreground text-xs block">
                {banking?.accountTitle || "M/S AYAAN  CLOTHING"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Account No
              </span>
              <span className="font-mono font-bold text-foreground text-xs block tracking-wide">
                {banking?.accountNo || "1788-901-044316"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                SWIFT CODE
              </span>
              <span className="font-mono font-bold text-foreground text-xs block tracking-wide">
                {banking?.swiftCode || "PUBABDDH210"}
              </span>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Bank Branch &amp; Official Address
              </span>
              <span className="text-foreground text-xs block whitespace-pre-line leading-relaxed">
                {banking?.bankAddress || "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh"}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
          <strong>Compliance Notice:</strong> Commercial export bank credentials are tied directly to authorized regulatory foreign exchange accounts. For changes to beneficiary banking, coordinate with the finance division.
        </p>
      </div>
    </div>
  );
}
