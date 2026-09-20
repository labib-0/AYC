"use client";

import React, { useState, useEffect } from "react";
import { User, Building2, Mail, Phone, MapPin, Tag, Star, AlertCircle, Check } from "lucide-react";
import { AddressFormData, COUNTRIES, getCountryName } from "@/lib/services/address.service";

export interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  hideDefaultCheckbox?: boolean;
  showSaveToBookCheckbox?: boolean;
  saveToBookDefault?: boolean;
  onSaveToBookChange?: (save: boolean) => void;
}

const PRESET_LABELS = ["Office", "Warehouse", "Store", "Main Address", "Distribution Center"];

// Countries where postal codes are strictly formatted/required
const COUNTRIES_REQUIRING_POSTAL = ["US", "CA", "GB", "DE", "FR", "IT", "ES", "NL", "AU", "JP", "BR", "MX", "IN"];
const COUNTRIES_REQUIRING_STATE = ["US", "CA", "AU", "IN", "BR", "MX"];

export default function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save Address",
  cancelLabel = "Cancel",
  hideDefaultCheckbox = false,
  showSaveToBookCheckbox = false,
  saveToBookDefault = true,
  onSaveToBookChange,
}: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>({
    label: initialData?.label || "Office",
    name: initialData?.name || initialData?.contact_name || "",
    contact_name: initialData?.contact_name || initialData?.name || "",
    company_name: initialData?.company_name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address_line_1: initialData?.address_line_1 || "",
    address_line_2: initialData?.address_line_2 || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    postal_code: initialData?.postal_code || "",
    country_code: initialData?.country_code || "US",
    country: initialData?.country || getCountryName(initialData?.country_code || "US"),
    is_default: Boolean(initialData?.is_default),
  });

  const [saveToBook, setSaveToBook] = useState<boolean>(saveToBookDefault);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        name: initialData.name || initialData.contact_name || prev.name,
        contact_name: initialData.contact_name || initialData.name || prev.contact_name,
        country: initialData.country || getCountryName(initialData.country_code || prev.country_code),
      }));
    }
  }, [initialData]);

  const updateField = (field: keyof AddressFormData, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string") {
        next.contact_name = value;
      }
      if (field === "country_code" && typeof value === "string") {
        next.country = getCountryName(value);
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm(false);
  };

  const validateForm = (_isSubmit?: boolean): boolean => {
    const errs: Record<string, string> = {};

    // 1. Contact Info Validation
    const nameVal = form.name.trim();
    if (!nameVal) {
      errs.name = "Contact person name is required.";
    } else if (nameVal.length < 2) {
      errs.name = "Name must be at least 2 characters.";
    }

    const companyVal = (form.company_name || "").trim();
    if (!companyVal) {
      errs.company_name = "Company / business name is required for commercial consignee.";
    } else if (companyVal.length < 2) {
      errs.company_name = "Company name must be at least 2 characters.";
    }

    const emailVal = form.email.trim();
    if (!emailVal) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errs.email = "Please enter a valid email address.";
    }

    const phoneVal = form.phone.trim();
    if (!phoneVal) {
      errs.phone = "Phone number is required for carrier delivery contact.";
    } else if (!/^\+?[0-9\s\-().]{7,25}$/.test(phoneVal)) {
      errs.phone = "Enter a valid international phone number (e.g. +1 555 0192 or +44 20 7946 0912).";
    }

    // 2. Shipping Location Validation
    if (!form.country_code) {
      errs.country_code = "Destination country is required.";
    }

    const line1Val = form.address_line_1.trim();
    if (!line1Val) {
      errs.address_line_1 = "Address line 1 (street address / building) is required.";
    } else if (line1Val.length < 3) {
      errs.address_line_1 = "Address line 1 must be at least 3 characters.";
    }

    const cityVal = form.city.trim();
    if (!cityVal) {
      errs.city = "City is required.";
    } else if (cityVal.length < 2) {
      errs.city = "City must be at least 2 characters.";
    }

    const postalVal = form.postal_code.trim();
    const isPostalMandatory = COUNTRIES_REQUIRING_POSTAL.includes(form.country_code.toUpperCase());
    if (isPostalMandatory && !postalVal) {
      errs.postal_code = `Postal / ZIP code is required for ${getCountryName(form.country_code)}.`;
    } else if (postalVal && postalVal.length < 2) {
      errs.postal_code = "Postal code must be at least 2 characters.";
    }

    const stateVal = (form.state || "").trim();
    const isStateMandatory = COUNTRIES_REQUIRING_STATE.includes(form.country_code.toUpperCase());
    if (isStateMandatory && !stateVal) {
      errs.state = `State / Province is required for ${getCountryName(form.country_code)}.`;
    }

    // 3. Address Settings Validation
    const labelVal = form.label.trim();
    if (!labelVal) {
      errs.label = "Address label is required (e.g. Office, Warehouse, Store).";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm(true)) {
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
      contact_name: form.name.trim(),
      company_name: form.company_name?.trim() || "",
      email: form.email.trim(),
      phone: form.phone.trim(),
      address_line_1: form.address_line_1.trim(),
      address_line_2: form.address_line_2?.trim() || "",
      city: form.city.trim(),
      state: form.state?.trim() || "",
      postal_code: form.postal_code.trim(),
      country_code: form.country_code.toUpperCase(),
      country: getCountryName(form.country_code),
      label: form.label.trim() || "Main Address",
    });
  };

  const isError = (field: string) => Boolean(errors[field] && (touched[field] || submitAttempted));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {submitAttempted && Object.keys(errors).length > 0 && (
        <div className="flex gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-400 animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-bold">Please correct the following before saving:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {Object.values(errors).slice(0, 3).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {Object.keys(errors).length > 3 && (
                <li>And {Object.keys(errors).length - 3} other field(s) needing attention.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* ─── SECTION 1: CONTACT INFORMATION ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/10">
          <User size={15} className="text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            1. Consignee &amp; Contact Information
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Contact Person */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Contact Person <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Recipient name</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="e.g. John Doe / Receiving Manager"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("name")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {isError("name") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Company Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Company Name <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">B2B Consignee</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.company_name || ""}
                onChange={(e) => updateField("company_name", e.target.value)}
                onBlur={() => handleBlur("company_name")}
                placeholder="e.g. Global Retail Ltd / Fashion Boutique"
                className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                  isError("company_name")
                    ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                    : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                }`}
              />
              <Building2 size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
            </div>
            {isError("company_name") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.company_name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Email Address <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Tracking &amp; SLI</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="receiving@company.com"
                className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                  isError("email")
                    ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                    : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                }`}
              />
              <Mail size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
            </div>
            {isError("email") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Phone / Mobile <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Carrier contact</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                placeholder="+1 555 0192 or +44 20 7946 0912"
                className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                  isError("phone")
                    ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                    : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                }`}
              />
              <Phone size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
            </div>
            {isError("phone") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: SHIPPING ADDRESS ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/10">
          <MapPin size={15} className="text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            2. Destination Physical Address
          </h4>
        </div>

        <div className="space-y-3.5">
          {/* Address Line 1 */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.address_line_1}
              onChange={(e) => updateField("address_line_1", e.target.value)}
              onBlur={() => handleBlur("address_line_1")}
              placeholder="Street address, building number, warehouse bay"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("address_line_1")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {isError("address_line_1") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.address_line_1}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Address Line 2</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={form.address_line_2 || ""}
              onChange={(e) => updateField("address_line_2", e.target.value)}
              placeholder="Suite, unit, floor, gate number, building department"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all"
            />
          </div>

          {/* Country, State, City, Postal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Country */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={form.country_code}
                onChange={(e) => updateField("country_code", e.target.value)}
                onBlur={() => handleBlur("country_code")}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all font-medium"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                onBlur={() => handleBlur("city")}
                placeholder="e.g. New York, London, Dubai"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                  isError("city")
                    ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                    : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                }`}
              />
              {isError("city") && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.city}</p>
              )}
            </div>

            {/* State / Province */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>State / Province / Region</span>
                {COUNTRIES_REQUIRING_STATE.includes(form.country_code.toUpperCase()) ? (
                  <span className="text-red-500 text-[10px]">* Required</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                )}
              </label>
              <input
                type="text"
                value={form.state || ""}
                onChange={(e) => updateField("state", e.target.value)}
                onBlur={() => handleBlur("state")}
                placeholder="e.g. CA, NY, Greater London, Bavaria"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                  isError("state")
                    ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                    : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                }`}
              />
              {isError("state") && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.state}</p>
              )}
            </div>

            {/* Postal / ZIP Code */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Postal / ZIP Code</span>
                {COUNTRIES_REQUIRING_POSTAL.includes(form.country_code.toUpperCase()) ? (
                  <span className="text-red-500 text-[10px]">* Required</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                )}
              </label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => updateField("postal_code", e.target.value)}
                onBlur={() => handleBlur("postal_code")}
                placeholder="e.g. 10001, W1D 1BS, 90210"
                className={`w-full px-3 py-2.5 text-sm font-mono rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                  isError("postal_code")
                    ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                    : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                }`}
              />
              {isError("postal_code") && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.postal_code}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: ADDRESS SETTINGS ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/10">
          <Tag size={15} className="text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            3. Address Label &amp; Preferences
          </h4>
        </div>

        <div className="space-y-3">
          {/* Label Input with Preset Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Address Label <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Identifies this location</span>
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => updateField("label", e.target.value)}
              onBlur={() => handleBlur("label")}
              placeholder="e.g. Central Warehouse, Headquarters, Retail Store #4"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("label")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {isError("label") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.label}</p>
            )}

            {/* Quick chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
              {PRESET_LABELS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateField("label", p)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                    form.label === p
                      ? "bg-amber-500 text-slate-900 border-amber-500 font-bold shadow-xs"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Default Address Checkbox */}
          {!hideDefaultCheckbox && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => updateField("is_default", e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Star size={12} className={form.is_default ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
                  Set as primary default shipping address
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                  Only one address can be default. This will automatically become the preselected address for new orders.
                </p>
              </div>
            </label>
          )}

          {/* Checkout optional checkbox: Save to Address Book */}
          {showSaveToBookCheckbox && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={saveToBook}
                onChange={(e) => {
                  setSaveToBook(e.target.checked);
                  if (onSaveToBookChange) onSaveToBookChange(e.target.checked);
                }}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  Save this address to my Address Book
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                  Reuse this shipping destination for future commercial orders without re-typing.
                </p>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* ─── ACTION BUTTONS ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              <Check size={16} />
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
