"use client";

import React from "react";

interface AddressContactSectionProps {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  onChange: (field: "name" | "company_name" | "email" | "phone", value: string) => void;
  onBlur: (field: string) => void;
  isError: (field: string) => boolean;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function AddressContactSection({
  name,
  companyName,
  email,
  phone,
  onChange,
  onBlur,
  isError,
  errors,
  disabled = false,
}: AddressContactSectionProps) {
  return (
    <div className="space-y-2.5">
      <div className="pb-1 border-b border-slate-100 dark:border-white/10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Contact Information
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Contact Person */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Contact Person <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => onBlur("name")}
            placeholder="Enter contact person"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
              isError("name")
                ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
          />
          {isError("name") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.name}
            </p>
          )}
        </div>

        {/* Company Name (Optional) */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Company Name</span>
            <span className="text-[10px] text-slate-400 font-normal">Optional</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={companyName}
            onChange={(e) => onChange("company_name", e.target.value)}
            onBlur={() => onBlur("company_name")}
            placeholder="Enter company name (optional)"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
              isError("company_name")
                ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
          />
          {isError("company_name") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.company_name}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            disabled={disabled}
            value={email}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => onBlur("email")}
            placeholder="Enter email address"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
              isError("email")
                ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
          />
          {isError("email") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone / Mobile */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            disabled={disabled}
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            onBlur={() => onBlur("phone")}
            placeholder="Enter phone number"
            className={`w-full px-3 py-2 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
              isError("phone")
                ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
          />
          {isError("phone") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.phone}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
