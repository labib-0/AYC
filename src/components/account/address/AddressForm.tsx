"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Check } from "lucide-react";
import { AddressFormData, getCountryName } from "@/lib/services/address.service";
import AddressContactSection from "./AddressContactSection";
import AddressLocationSection from "./AddressLocationSection";
import AddressSettingsSection from "./AddressSettingsSection";

export interface AddressFormOptions {
  saveToBook?: boolean;
}

export interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData, options?: AddressFormOptions) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  hideDefaultCheckbox?: boolean;
  showSaveToBookCheckbox?: boolean;
  saveToBookDefault?: boolean;
  onSaveToBookChange?: (save: boolean) => void;
}

// Countries where postal codes and states are conditionally required
const COUNTRIES_REQUIRING_POSTAL = [
  "US",
  "CA",
  "GB",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "AU",
  "JP",
  "BR",
  "MX",
  "IN",
];
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
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Contact Person Validation
    const nameVal = form.name.trim();
    if (!nameVal) {
      errs.name = "Contact person name is required.";
    } else if (nameVal.length < 2) {
      errs.name = "Name must be at least 2 characters.";
    }

    // 2. Company Name Validation (B2B requirement)
    const companyVal = (form.company_name || "").trim();
    if (!companyVal) {
      errs.company_name = "Company / business name is required for commercial consignee.";
    } else if (companyVal.length < 2) {
      errs.company_name = "Company name must be at least 2 characters.";
    }

    // 3. Email Validation
    const emailVal = form.email.trim();
    if (!emailVal) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errs.email = "Please enter a valid email address.";
    }

    // 4. Phone Validation (International format)
    const phoneVal = form.phone.trim();
    if (!phoneVal) {
      errs.phone = "Phone number is required for carrier delivery contact.";
    } else if (!/^\+?[0-9\s\-().]{7,25}$/.test(phoneVal)) {
      errs.phone = "Enter a valid international phone number (e.g. +1 555 0192 or +44 20 7946 0912).";
    }

    // 5. Country Validation
    if (!form.country_code) {
      errs.country_code = "Destination country is required.";
    }

    // 6. Address Line 1 Validation
    const line1Val = form.address_line_1.trim();
    if (!line1Val) {
      errs.address_line_1 = "Address line 1 (street address / building) is required.";
    } else if (line1Val.length < 3) {
      errs.address_line_1 = "Address line 1 must be at least 3 characters.";
    }

    // 7. City Validation
    const cityVal = form.city.trim();
    if (!cityVal) {
      errs.city = "City is required.";
    } else if (cityVal.length < 2) {
      errs.city = "City must be at least 2 characters.";
    }

    // 8. Postal Code Validation (Conditionally required)
    const postalVal = form.postal_code.trim();
    const isPostalMandatory = COUNTRIES_REQUIRING_POSTAL.includes(form.country_code.toUpperCase());
    if (isPostalMandatory && !postalVal) {
      errs.postal_code = `Postal / ZIP code is required for ${getCountryName(form.country_code)}.`;
    } else if (postalVal && postalVal.length < 2) {
      errs.postal_code = "Postal code must be at least 2 characters.";
    }

    // 9. State / Province Validation (Conditionally required)
    const stateVal = (form.state || "").trim();
    const isStateMandatory = COUNTRIES_REQUIRING_STATE.includes(form.country_code.toUpperCase());
    if (isStateMandatory && !stateVal) {
      errs.state = `State / Province is required for ${getCountryName(form.country_code)}.`;
    }

    // 10. Address Label Validation
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

    if (!validateForm()) {
      return;
    }

    const cleanData: AddressFormData = {
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
    };

    onSubmit(cleanData, { saveToBook });
  };

  const isError = (field: string) => Boolean(errors[field] && (touched[field] || submitAttempted));

  const handleSaveToBookToggle = (val: boolean) => {
    setSaveToBook(val);
    if (onSaveToBookChange) {
      onSaveToBookChange(val);
    }
  };

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

      {/* 1. Contact Information Section */}
      <AddressContactSection
        name={form.name}
        companyName={form.company_name || ""}
        email={form.email}
        phone={form.phone}
        onChange={(field, val) => updateField(field, val)}
        onBlur={handleBlur}
        isError={isError}
        errors={errors}
        disabled={isSubmitting}
      />

      {/* 2. Destination Physical Location Section */}
      <AddressLocationSection
        addressLine1={form.address_line_1}
        addressLine2={form.address_line_2 || ""}
        countryCode={form.country_code}
        city={form.city}
        state={form.state || ""}
        postalCode={form.postal_code}
        onChange={(field, val) => updateField(field, val)}
        onBlur={handleBlur}
        isError={isError}
        errors={errors}
        disabled={isSubmitting}
      />

      {/* 3. Address Label & Settings Section */}
      <AddressSettingsSection
        label={form.label}
        isDefault={form.is_default}
        saveToBook={saveToBook}
        hideDefaultCheckbox={hideDefaultCheckbox}
        showSaveToBookCheckbox={showSaveToBookCheckbox}
        onLabelChange={(val) => updateField("label", val)}
        onLabelBlur={() => handleBlur("label")}
        onDefaultChange={(val) => updateField("is_default", val)}
        onSaveToBookChange={handleSaveToBookToggle}
        isError={isError}
        errors={errors}
        disabled={isSubmitting}
      />

      {/* Form Action Buttons */}
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
