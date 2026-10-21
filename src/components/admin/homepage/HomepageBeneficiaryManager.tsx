"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Globe2,
  Mail,
  Phone,
  FileCheck2,
  Save,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { homepageService } from "@/services/homepage.service";

interface HomepageBeneficiaryManagerProps {
  initialCompanyName?: string;
  initialAddress?: string;
  initialCountryOfOrigin?: string;
  initialEmail?: string;
  initialWhatsApp?: string;
  initialRegNumber?: string;
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

export default function HomepageBeneficiaryManager({
  initialCompanyName,
  initialAddress,
  initialCountryOfOrigin,
  initialEmail,
  initialWhatsApp,
  initialRegNumber,
  onSaveSuccess,
  showToast,
  disabled = false,
}: HomepageBeneficiaryManagerProps) {
  const [companyName, setCompanyName] = useState(initialCompanyName || "AYAAN CLOTHING");
  const [address, setAddress] = useState(
    initialAddress || "House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh"
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialCountryOfOrigin || "Bangladesh");
  const [email, setEmail] = useState(initialEmail || "sales@ayaanclothing.com");
  const [whatsapp, setWhatsapp] = useState(initialWhatsApp || "+880 1620-853502");
  const [regNumber, setRegNumber] = useState(initialRegNumber || "TRAD/DNCC/012458/2022");

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sync state when incoming props update
  useEffect(() => {
    if (initialCompanyName !== undefined) setCompanyName(initialCompanyName || "AYAAN CLOTHING");
    if (initialAddress !== undefined) setAddress(initialAddress || "House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh");
    if (initialCountryOfOrigin !== undefined) setCountryOfOrigin(initialCountryOfOrigin || "Bangladesh");
    if (initialEmail !== undefined) setEmail(initialEmail || "sales@ayaanclothing.com");
    if (initialWhatsApp !== undefined) setWhatsapp(initialWhatsApp || "+880 1620-853502");
    if (initialRegNumber !== undefined) setRegNumber(initialRegNumber || "TRAD/DNCC/012458/2022");
  }, [
    initialCompanyName,
    initialAddress,
    initialCountryOfOrigin,
    initialEmail,
    initialWhatsApp,
    initialRegNumber,
  ]);

  const isDirty =
    companyName !== (initialCompanyName || "AYAAN CLOTHING") ||
    address !== (initialAddress || "House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh") ||
    countryOfOrigin !== (initialCountryOfOrigin || "Bangladesh") ||
    email !== (initialEmail || "sales@ayaanclothing.com") ||
    whatsapp !== (initialWhatsApp || "+880 1620-853502") ||
    regNumber !== (initialRegNumber || "TRAD/DNCC/012458/2022");

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!companyName || !companyName.trim()) {
      errs.companyName = "Exporter / Beneficiary Company Name is required.";
    }

    if (!address || !address.trim()) {
      errs.address = "Address is required.";
    }

    if (!countryOfOrigin || !countryOfOrigin.trim()) {
      errs.countryOfOrigin = "Country of Origin is required.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = "Contact Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address (e.g. sales@ayaanclothing.com).";
    }

    const trimmedWa = whatsapp.trim();
    if (!trimmedWa) {
      errs.whatsapp = "WhatsApp Number is required.";
    } else if (!/[0-9]{7,}/.test(trimmedWa.replace(/\D/g, ""))) {
      errs.whatsapp = "WhatsApp Number must include at least 7 digits (e.g. +880 1620-853502).";
    }

    if (!regNumber || !regNumber.trim()) {
      errs.regNumber = "Registration Number is required.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast("Please correct the highlighted validation errors before saving.", "error");
      return;
    }

    setSaving(true);
    try {
      await homepageService.updateBeneficiarySettings({
        exporter_company_name: companyName.trim(),
        office_address: address.trim(),
        country_of_origin: countryOfOrigin.trim(),
        contact_email: email.trim(),
        whatsapp_display: whatsapp.trim(),
        reg_number: regNumber.trim(),
      });

      showToast("Commercial Exporter & Beneficiary settings saved successfully.", "success");
      onSaveSuccess?.();
    } catch (err: any) {
      const msg = err?.message || "Failed to save Exporter & Beneficiary settings.";
      showToast(msg, "error");
      if (err?.errors) {
        const mappedErrors: Record<string, string> = {};
        if (err.errors.exporter_company_name) mappedErrors.companyName = err.errors.exporter_company_name[0];
        if (err.errors.office_address) mappedErrors.address = err.errors.office_address[0];
        if (err.errors.country_of_origin) mappedErrors.countryOfOrigin = err.errors.country_of_origin[0];
        if (err.errors.contact_email) mappedErrors.email = err.errors.contact_email[0];
        if (err.errors.whatsapp_display) mappedErrors.whatsapp = err.errors.whatsapp_display[0];
        if (err.errors.reg_number) mappedErrors.regNumber = err.errors.reg_number[0];
        setFieldErrors(mappedErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCompanyName(initialCompanyName || "AYAAN CLOTHING");
    setAddress(initialAddress || "House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh");
    setCountryOfOrigin(initialCountryOfOrigin || "Bangladesh");
    setEmail(initialEmail || "sales@ayaanclothing.com");
    setWhatsapp(initialWhatsApp || "+880 1620-853502");
    setRegNumber(initialRegNumber || "TRAD/DNCC/012458/2022");
    setFieldErrors({});
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="text-primary h-5 w-5" />
            <h3 className="text-base font-bold text-foreground">
              Commercial Exporter &amp; Beneficiary Profile
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Authoritative beneficiary company details rendered on official Proforma Invoices (PI), commercial invoices, and export documentation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || disabled || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Beneficiary"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Company Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Exporter / Beneficiary Company Name <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: "" }));
              }}
              disabled={saving || disabled}
              placeholder="AYAAN CLOTHING"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border ${
                fieldErrors.companyName ? "border-red-500 focus:ring-red-500/20" : "border-input focus:border-primary"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
            />
            {fieldErrors.companyName && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.companyName}</span>
              </p>
            )}
          </div>

          {/* 2. Country of Origin */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Country of Origin <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={countryOfOrigin}
              onChange={(e) => {
                setCountryOfOrigin(e.target.value);
                if (fieldErrors.countryOfOrigin) setFieldErrors((p) => ({ ...p, countryOfOrigin: "" }));
              }}
              disabled={saving || disabled}
              placeholder="Bangladesh"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border ${
                fieldErrors.countryOfOrigin ? "border-red-500 focus:ring-red-500/20" : "border-input focus:border-primary"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
            />
            {fieldErrors.countryOfOrigin && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.countryOfOrigin}</span>
              </p>
            )}
          </div>

          {/* 3. Office Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Address <span className="text-red-500">*</span></span>
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) setFieldErrors((p) => ({ ...p, address: "" }));
              }}
              disabled={saving || disabled}
              placeholder="House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border ${
                fieldErrors.address ? "border-red-500 focus:ring-red-500/20" : "border-input focus:border-primary"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none`}
            />
            {fieldErrors.address && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.address}</span>
              </p>
            )}
          </div>

          {/* 4. Contact Email */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Contact Email <span className="text-red-500">*</span></span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
              }}
              disabled={saving || disabled}
              placeholder="sales@ayaanclothing.com"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border ${
                fieldErrors.email ? "border-red-500 focus:ring-red-500/20" : "border-input focus:border-primary"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
            />
            {fieldErrors.email && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* 5. WhatsApp Number */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>WhatsApp Number <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                if (fieldErrors.whatsapp) setFieldErrors((p) => ({ ...p, whatsapp: "" }));
              }}
              disabled={saving || disabled}
              placeholder="+880 1620-853502"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border ${
                fieldErrors.whatsapp ? "border-red-500 focus:ring-red-500/20" : "border-input focus:border-primary"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
            />
            {fieldErrors.whatsapp && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.whatsapp}</span>
              </p>
            )}
          </div>

          {/* 6. Registration Number */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Registration Number <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={regNumber}
              onChange={(e) => {
                setRegNumber(e.target.value);
                if (fieldErrors.regNumber) setFieldErrors((p) => ({ ...p, regNumber: "" }));
              }}
              disabled={saving || disabled}
              placeholder="TRAD/DNCC/012458/2022"
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-background border ${
                fieldErrors.regNumber ? "border-red-500 focus:ring-red-500/20" : "border-input focus:border-primary"
              } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
            />
            {fieldErrors.regNumber && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{fieldErrors.regNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Live PI Beneficiary Panel Preview */}
        <div className="mt-4 p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-2">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Live PI Beneficiary Card Preview
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1 font-mono">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">EXPORTER / BENEFICIARY:</div>
            <div className="font-bold text-slate-900 dark:text-slate-100">{companyName || "AYAAN CLOTHING"}</div>
            <div className="text-slate-600 dark:text-slate-300">{address || "House #33 (2nd floor), Road #12, Sector #11,"}</div>
            <div className="text-slate-600 dark:text-slate-300">Country of Origin: {countryOfOrigin || "Bangladesh"}</div>
            <div className="text-slate-600 dark:text-slate-300">Contact: {email || "sales@ayaanclothing.com"}</div>
            <div className="text-slate-600 dark:text-slate-300">WhatsApp: {whatsapp || "+880 1620-853502"}</div>
            <div className="text-slate-600 dark:text-slate-300">Reg: {regNumber || "TRAD/DNCC/012458/2022"}</div>
          </div>
        </div>
      </form>
    </div>
  );
}
