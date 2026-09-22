"use client";

import React from "react";
import { User, Building2, Mail, Phone } from "lucide-react";

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
            <span>
              Contact Person <span className="text-red-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Recipient name</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => onBlur("name")}
            placeholder="e.g. John Doe / Receiving Manager"
            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
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

        {/* Company Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>
              Company Name <span className="text-red-500">*</span>
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              B2B Consignee
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              disabled={disabled}
              value={companyName}
              onChange={(e) => onChange("company_name", e.target.value)}
              onBlur={() => onBlur("company_name")}
              placeholder="e.g. Global Retail Ltd / Fashion Boutique"
              className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("company_name")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            <Building2
              size={14}
              className="absolute right-3 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          {isError("company_name") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.company_name}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>
              Email Address <span className="text-red-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Tracking &amp; SLI</span>
          </label>
          <div className="relative">
            <input
              type="email"
              disabled={disabled}
              value={email}
              onChange={(e) => onChange("email", e.target.value)}
              onBlur={() => onBlur("email")}
              placeholder="receiving@company.com"
              className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("email")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            <Mail
              size={14}
              className="absolute right-3 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          {isError("email") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone / Mobile */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>
              Phone / Mobile <span className="text-red-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Carrier contact</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              disabled={disabled}
              value={phone}
              onChange={(e) => onChange("phone", e.target.value)}
              onBlur={() => onBlur("phone")}
              placeholder="+1 555 0192 or +44 20 7946 0912"
              className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("phone")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            <Phone
              size={14}
              className="absolute right-3 top-3 text-slate-400 pointer-events-none"
            />
          </div>
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
