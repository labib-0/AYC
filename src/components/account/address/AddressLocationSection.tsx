"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { COUNTRIES } from "@/lib/services/address.service";

interface AddressLocationSectionProps {
  addressLine1: string;
  addressLine2: string;
  countryCode: string;
  city: string;
  state: string;
  postalCode: string;
  onChange: (
    field:
      | "address_line_1"
      | "address_line_2"
      | "country_code"
      | "city"
      | "state"
      | "postal_code",
    value: string
  ) => void;
  onBlur: (field: string) => void;
  isError: (field: string) => boolean;
  errors: Record<string, string>;
  disabled?: boolean;
}

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

export default function AddressLocationSection({
  addressLine1,
  addressLine2,
  countryCode,
  city,
  state,
  postalCode,
  onChange,
  onBlur,
  isError,
  errors,
  disabled = false,
}: AddressLocationSectionProps) {
  const isPostalRequired = COUNTRIES_REQUIRING_POSTAL.includes(countryCode.toUpperCase());
  const isStateRequired = COUNTRIES_REQUIRING_STATE.includes(countryCode.toUpperCase());

  return (
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
            disabled={disabled}
            value={addressLine1}
            onChange={(e) => onChange("address_line_1", e.target.value)}
            onBlur={() => onBlur("address_line_1")}
            placeholder="Street address, building number, warehouse bay"
            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
              isError("address_line_1")
                ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
          />
          {isError("address_line_1") && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {errors.address_line_1}
            </p>
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
            disabled={disabled}
            value={addressLine2}
            onChange={(e) => onChange("address_line_2", e.target.value)}
            placeholder="Suite, unit, floor, gate number, building department"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all"
          />
        </div>

        {/* Country, City, State, Postal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Country */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={countryCode}
              onChange={(e) => onChange("country_code", e.target.value)}
              onBlur={() => onBlur("country_code")}
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
              disabled={disabled}
              value={city}
              onChange={(e) => onChange("city", e.target.value)}
              onBlur={() => onBlur("city")}
              placeholder="e.g. New York, London, Dubai"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("city")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {isError("city") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {errors.city}
              </p>
            )}
          </div>

          {/* State / Province */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>State / Province / Region</span>
              {isStateRequired ? (
                <span className="text-red-500 text-[10px]">* Required</span>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              )}
            </label>
            <input
              type="text"
              disabled={disabled}
              value={state}
              onChange={(e) => onChange("state", e.target.value)}
              onBlur={() => onBlur("state")}
              placeholder="e.g. CA, NY, Greater London, Bavaria"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("state")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {isError("state") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {errors.state}
              </p>
            )}
          </div>

          {/* Postal / ZIP Code */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Postal / ZIP Code</span>
              {isPostalRequired ? (
                <span className="text-red-500 text-[10px]">* Required</span>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              )}
            </label>
            <input
              type="text"
              disabled={disabled}
              value={postalCode}
              onChange={(e) => onChange("postal_code", e.target.value)}
              onBlur={() => onBlur("postal_code")}
              placeholder="e.g. 10001, W1D 1BS, 90210"
              className={`w-full px-3 py-2.5 text-sm font-mono rounded-xl border bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${
                isError("postal_code")
                  ? "border-red-500 focus:ring-2 focus:ring-red-400/40"
                  : "border-slate-200 dark:border-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {isError("postal_code") && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {errors.postal_code}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
