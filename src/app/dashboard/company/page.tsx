"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  Building2,
  User as UserIcon,
  Mail,
  Phone,
  Globe,
  FileCheck2,
  Briefcase,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { COUNTRIES } from "@/lib/services/address.service";

const BUSINESS_TYPES = [
  "Wholesale Importer / Distributor",
  "Retail Chain / Multi-Store Retailer",
  "Fashion Brand / Private Label",
  "Garment Buying House / Sourcing Agent",
  "E-Commerce / Online Apparel Merchant",
  "Corporate / Workwear / Uniforms",
  "Promotional & Merchandise Supplier",
  "Other Commercial Entity",
];

export default function CompanyProfilePage() {
  const { user, updateProfile, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    company_name: "",
    name: "",
    email: "",
    phone: "",
    country: "United States",
    business_type: "Wholesale Importer / Distributor",
    tax_id: "",
    website: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        company_name: user.company_name || "",
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        country: user.country || "United States",
        business_type: user.business_type || "Wholesale Importer / Distributor",
        tax_id: user.tax_id || "",
        website: user.website || "",
      });
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic validation
    if (!formData.company_name.trim()) {
      setErrorMessage("Company Name is required for B2B commercial accounts.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.name.trim()) {
      setErrorMessage("Primary Contact Person is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await updateProfile({
        company_name: formData.company_name.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        country: formData.country,
        business_type: formData.business_type,
        tax_id: formData.tax_id.trim(),
        website: formData.website.trim(),
      });

      if (res?.error) {
        setErrorMessage(
          typeof res.error === "string" ? res.error : "Failed to update company profile."
        );
      } else {
        setSuccessMessage("Company profile and commercial verification data updated successfully.");
        // Auto-dismiss success notification after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while updating profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
          Account Session Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Please sign in to access your company profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Company Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your registered B2B wholesale company information, tax identifiers, and official commercial contacts.
          </p>
        </div>

        {/* Verification Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3.5 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {user.b2b_approval_status === "pending"
              ? "Verification Under Review"
              : user.b2b_approval_status === "rejected"
              ? "Verification Incomplete"
              : "Verified B2B Commercial Entity"}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
              Changes Saved
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-800 dark:text-red-200">
              Update Failed
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Profile Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="border-b border-slate-100 dark:border-white/10 pb-4">
          <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>Commercial Entity Details</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            This information appears on your Proforma Invoices, Offer Sheets, and export documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="company_name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Company / Legal Entity Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="company_name"
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="e.g. Apex Global Apparel Ltd."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Primary Contact Person */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Primary Contact Person <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Full name of authorized buyer"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Email Address (Read-only / Authenticated Identity) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Official Commercial Email
              </label>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                Auth Identity
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="email"
                type="email"
                disabled
                value={formData.email}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Used for account security and dispatching signed commercial invoices.
            </p>
          </div>

          {/* Phone / Mobile */}
          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Phone / Mobile (WhatsApp Enabled)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Country / Destination Territory */}
          <div className="space-y-1.5">
            <label
              htmlFor="country"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Registered Country / Territory <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="country"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name} className="dark:bg-slate-900">
                    {c.name} ({c.dial})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Business Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="business_type"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Business Model / Buyer Category
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="business_type"
                value={formData.business_type}
                onChange={(e) => handleChange("business_type", e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type} className="dark:bg-slate-900">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tax / VAT / EORI ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="tax_id"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Tax ID / VAT / EORI Number
            </label>
            <div className="relative">
              <FileCheck2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="tax_id"
                type="text"
                value={formData.tax_id}
                onChange={(e) => handleChange("tax_id", e.target.value)}
                placeholder="e.g. GB123456789 or US-EIN-987654"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Required for international customs clearance and commercial invoices.
            </p>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label
              htmlFor="website"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Corporate Website / Brand URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://www.example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Need custom payment terms or credit facility adjustments? Contact your assigned export account manager.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <span>Save Company Profile</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
