"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ChevronDown, Check, Search, MapPin } from "lucide-react";
import { usePreferences } from "@/lib/PreferencesContext";
import { ISO_COUNTRIES, findCountry, getCountryFlag } from "@/lib/data/countries";
import { useAuth } from "@/lib/AuthContext";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn?: () => void;
}

export default function LocationModal({
  isOpen,
  onClose,
  onOpenSignIn,
}: LocationModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { preferences, updateLocation, t } = usePreferences();

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync and reset dropdown state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCountryDropdownOpen(false);
      setCountrySearch("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isCountryDropdownOpen) {
          setIsCountryDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCountryDropdownOpen, onClose]);

  // Handle outside click for country dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isCountryDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCountryDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isCountryDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isCountryDropdownOpen]);

  if (!isOpen) return null;

  // Selected or detected country resolution
  const currentCode = preferences.countryCode ? preferences.countryCode.toUpperCase() : "";
  const matchedCountry = currentCode ? findCountry(currentCode) : undefined;
  const currentName = matchedCountry ? matchedCountry.name : preferences.country || t("modal.select_country", "Select your country");
  const currentFlag = currentCode ? (preferences.flag || getCountryFlag(currentCode)) : "🌐";

  // Filter countries by query (name or code)
  const query = countrySearch.trim().toLowerCase();
  const filteredCountries = ISO_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
  );

  const handleCountrySelect = (code: string) => {
    updateLocation(code);
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
  };

  const handleSignInClick = () => {
    onClose();
    if (user) {
      router.push("/dashboard/addresses");
    } else if (onOpenSignIn) {
      onOpenSignIn();
    } else {
      const returnUrl = pathname || "/";
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[200] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all transform animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-2">
            <div>
              <h2
                id="location-modal-title"
                className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight"
              >
                {t("modal.location_title", "Specify Your Location")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t("modal.location_subtitle", "Shipping options and fees vary based on your location")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 -mr-2 -mt-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 pt-3 flex flex-col gap-4">
            {/* Country Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t("modal.ship_to_country", "Ship to Country / Region")}
              </label>

              <button
                type="button"
                id="country-selector-trigger"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full min-h-[50px] flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-900 dark:text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-expanded={isCountryDropdownOpen}
                aria-haspopup="listbox"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl leading-none shrink-0">{currentFlag}</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {currentName}
                  </span>
                  {currentCode && (
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      ({currentCode})
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                    isCountryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Country Dropdown Menu */}
              {isCountryDropdownOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-150"
                  role="listbox"
                >
                  {/* Search Field */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder={t("modal.search_country_placeholder", "Search country or code...")}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Country List */}
                  <div className="overflow-y-auto p-1 flex flex-col gap-0.5">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((c) => {
                        const isSelected = currentCode === c.code;
                        const flag = getCountryFlag(c.code);
                        return (
                          <button
                            key={c.code}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleCountrySelect(c.code)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                              isSelected
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base leading-none shrink-0">{flag}</span>
                              <span className="truncate">{c.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                ({c.code})
                              </span>
                            </div>
                            {isSelected && (
                              <Check size={14} className="text-amber-600 dark:text-amber-400 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-400">
                        {t("modal.no_countries_found", "No countries found")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Action: SIGN IN TO ADD ADDRESS */}
            <button
              type="button"
              id="location-modal-signin-btn"
              onClick={handleSignInClick}
              className="w-full min-h-[48px] bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all press-feedback flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <MapPin size={16} />
              <span>{t("modal.signin_add_address", "Sign in to add address")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
