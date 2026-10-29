"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { siteSettingsService } from "@/services/site-settings.service";
import BUSINESS_PROFILE from "@/config/business-profile";

interface HomepageFooterManagerProps {
  initialAboutUs?: string;
  initialAddress?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialWhatsApp?: string;
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

export default function HomepageFooterManager({
  initialAboutUs,
  initialAddress,
  initialEmail,
  initialPhone,
  initialWhatsApp,
  onSaveSuccess,
  showToast,
  disabled = false,
}: HomepageFooterManagerProps) {
  const [aboutUs, setAboutUs] = useState(initialAboutUs || "");
  const [address, setAddress] = useState(initialAddress || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [whatsapp, setWhatsApp] = useState(initialWhatsApp || "");
  const [saving, setSaving] = useState(false);

  // Sync when initial values change
  useEffect(() => {
    if (initialAboutUs !== undefined) setAboutUs(initialAboutUs);
    if (initialAddress !== undefined) setAddress(initialAddress);
    if (initialEmail !== undefined) setEmail(initialEmail);
    if (initialPhone !== undefined) setPhone(initialPhone);
    if (initialWhatsApp !== undefined) setWhatsApp(initialWhatsApp);
  }, [initialAboutUs, initialAddress, initialEmail, initialPhone, initialWhatsApp]);

  // Check dirty
  const isDirty =
    aboutUs !== (initialAboutUs || "") ||
    address !== (initialAddress || "") ||
    email !== (initialEmail || "") ||
    phone !== (initialPhone || "") ||
    whatsapp !== (initialWhatsApp || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Basic client-side sanitization: reject scripts and javascript:
      if (
        aboutUs.toLowerCase().includes("<script") ||
        aboutUs.toLowerCase().includes("javascript:") ||
        aboutUs.toLowerCase().includes("onload=")
      ) {
        showToast("Unsafe markup or scripts detected in About Us content.", "error");
        setSaving(false);
        return;
      }

      await siteSettingsService.updateSettings({
        site_title: BUSINESS_PROFILE.name,
        whatsapp_display: whatsapp || BUSINESS_PROFILE.contact.phone || "",
        footer_description: aboutUs.trim(),
        public_address: address.trim(),
        public_email: email.trim(),
        public_phone: phone.trim(),
      });

      showToast("Footer content & contact details saved successfully.", "success");
      onSaveSuccess?.();
    } catch (err: any) {
      showToast(err?.message || "Failed to save footer settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAboutUs(initialAboutUs || "");
    setAddress(initialAddress || "");
    setEmail(initialEmail || "");
    setPhone(initialPhone || "");
    setWhatsApp(initialWhatsApp || "");
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h2 className="font-display font-bold text-base sm:text-lg text-foreground">
              Footer Content &amp; Contact Details
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage the public company description, business address, and contact numbers displayed in the storefront footer.
          </p>
        </div>
        <div
          data-testid="footer-header-actions"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto"
        >
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || saving}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || saving || !isDirty}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto ${
              isDirty
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            }`}
          >
            <Save size={13} />
            <span>{saving ? "Saving..." : "Save Footer"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
        {/* Section 1: About Us Company Description */}
        <div className="space-y-2">
          <label htmlFor="footer-about-us" className="block text-xs font-bold uppercase tracking-wider text-foreground">
            About Us (Footer Company Description)
          </label>
          <p className="text-xs text-muted-foreground">
            This summary appears directly under the company logo in the footer. If empty, the default profile description is used.
          </p>
          <textarea
            id="footer-about-us"
            rows={3}
            value={aboutUs}
            onChange={(e) => setAboutUs(e.target.value)}
            disabled={disabled || saving}
            placeholder={`${BUSINESS_PROFILE.description}. Established in ${BUSINESS_PROFILE.establishedYear}...`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
            maxLength={1000}
          />
          <div className="flex justify-between items-center text-[11px] text-muted-foreground">
            <span>Safe HTML and plain text supported.</span>
            <span>{aboutUs.length} / 1000 characters</span>
          </div>
        </div>

        {/* Section 2: Contact Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          {/* Office Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="footer-office-address" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <MapPin size={13} className="text-primary" />
              <span>Office Address (Google Maps Destination)</span>
            </label>
            <input
              id="footer-office-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={disabled || saving}
              placeholder={BUSINESS_PROFILE.address.formatted}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Renders as an interactive link opening Google Maps. If left blank, the address row is hidden.
            </p>
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5">
            <label htmlFor="footer-contact-email" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Mail size={13} className="text-primary" />
              <span>Contact Email</span>
            </label>
            <input
              id="footer-contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled || saving}
              placeholder={BUSINESS_PROFILE.contact.email || ""}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Generates a mailto: link for buyer inquiries.
            </p>
          </div>

          {/* Telephone / Direct Phone */}
          <div className="space-y-1.5">
            <label htmlFor="footer-contact-phone" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Phone size={13} className="text-primary" />
              <span>Direct Call Number</span>
            </label>
            <input
              id="footer-contact-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={disabled || saving}
              placeholder={BUSINESS_PROFILE.contact.phone || ""}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Generates a direct tel: dialing link.
            </p>
          </div>

          {/* WhatsApp Display Number */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="footer-whatsapp" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <MessageCircle size={13} className="text-[#25D366]" />
              <span>Official WhatsApp Help Number</span>
            </label>
            <input
              id="footer-whatsapp"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsApp(e.target.value)}
              disabled={disabled || saving}
              placeholder="+880 1620-853502"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Automatically converted to canonical wa.me link with prefilled inquiry message.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
