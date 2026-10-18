"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TRANSLATIONS, LanguageCode } from "./translations";
import { ISO_COUNTRIES, findCountry, getCountryFlag } from "./data/countries";

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  defaultLanguage?: LanguageCode;
  postalCodePlaceholder?: string;
  postalCodeRequired?: boolean;
}

/**
 * Authoritative complete country list populated from ISO_COUNTRIES.
 */
export const SUPPORTED_COUNTRIES: CountryInfo[] = ISO_COUNTRIES.map((c) => ({
  code: c.code,
  name: c.name,
  flag: getCountryFlag(c.code),
  defaultLanguage: "English",
}));

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: "English", label: "English", native: "English" },
  { code: "Bengali", label: "Bengali", native: "বাংলা" },
  { code: "Arabic", label: "Arabic", native: "العربية" },
];

export interface UserPreferences {
  country: string;
  countryCode: string;
  flag: string;
  postalCode: string;
  language: LanguageCode;
  currency: "USD";
  currencySymbol: "$";
  lastUpdated: number;
  isManual?: boolean;
}

const STORAGE_KEY = "ayaan_user_preferences";

export const NEUTRAL_PREFERENCES: UserPreferences = {
  country: "Select your country",
  countryCode: "",
  flag: "🌐",
  postalCode: "",
  language: "English",
  currency: "USD",
  currencySymbol: "$",
  lastUpdated: 0,
  isManual: false,
};

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoaded: boolean;
  updateLocation: (countryCode: string, postalCode?: string) => void;
  clearLocation: () => void;
  updateLanguage: (language: LanguageCode) => void;
  updateLanguageCurrency: (language: string, currency?: string) => void;
  updateAllPreferences: (newPrefs: Partial<UserPreferences>) => void;
  t: (key: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(NEUTRAL_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initializePreferences() {
      let savedPrefs: UserPreferences | null = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            savedPrefs = {
              ...NEUTRAL_PREFERENCES,
              ...parsed,
              currency: "USD",
              currencySymbol: "$",
            };
          }
        }
      } catch {
        // ignore localStorage errors
      }

      // If customer has deliberately selected a country manually, NEVER override it with IP detection!
      if (savedPrefs && savedPrefs.isManual && savedPrefs.countryCode) {
        if (isMounted) {
          setPreferences(savedPrefs);
          setIsLoaded(true);
        }
        return;
      }

      // If an existing auto-detected preference was saved, use it as provisional state while checking
      if (savedPrefs && savedPrefs.countryCode) {
        if (isMounted) {
          setPreferences(savedPrefs);
        }
      }

      // Query authoritative Laravel IP-based geolocation endpoint
      try {
        const res = await fetch("/ayc/api/v1/geolocation/detect");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.detected && data.country_code) {
            const countryCode = String(data.country_code).toUpperCase();
            const item = findCountry(countryCode);
            const countryName = data.country_name || (item ? item.name : countryCode);
            const flag = getCountryFlag(countryCode);

            const detectedPrefs: UserPreferences = {
              ...(savedPrefs || NEUTRAL_PREFERENCES),
              country: countryName,
              countryCode: countryCode,
              flag: flag,
              isManual: false,
              lastUpdated: Date.now(),
            };

            if (isMounted) {
              setPreferences(detectedPrefs);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(detectedPrefs));
              } catch {}
            }
            return;
          }
        }
      } catch (err) {
        console.warn("[Preferences] Geolocation detection fetch error:", err);
      }

      // Fallback: If detection returned false or errored and no saved preference exists, keep neutral
      if (isMounted) {
        if (!savedPrefs || !savedPrefs.countryCode) {
          setPreferences(NEUTRAL_PREFERENCES);
        }
      }
    }

    initializePreferences().finally(() => {
      if (isMounted) {
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateLocation = (countryCode: string, postalCode = "") => {
    const item = findCountry(countryCode);
    const code = item ? item.code : (countryCode ? countryCode.toUpperCase() : "");
    const name = item ? item.name : (countryCode || "Select Country");
    const flag = code ? getCountryFlag(code) : "🌐";

    setPreferences((prev) => {
      const updated: UserPreferences = {
        ...prev,
        country: name,
        countryCode: code,
        flag: flag,
        postalCode: postalCode.trim(),
        isManual: true, // Mark as user-selected preference to protect against IP override
        currency: "USD",
        currencySymbol: "$",
        lastUpdated: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearLocation = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setPreferences(NEUTRAL_PREFERENCES);

    // Re-detect country via IP
    fetch("/ayc/api/v1/geolocation/detect")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.detected && data.country_code) {
          const code = String(data.country_code).toUpperCase();
          const item = findCountry(code);
          const name = data.country_name || (item ? item.name : code);
          const flag = getCountryFlag(code);
          const detectedPrefs: UserPreferences = {
            ...NEUTRAL_PREFERENCES,
            country: name,
            countryCode: code,
            flag: flag,
            isManual: false,
            lastUpdated: Date.now(),
          };
          setPreferences(detectedPrefs);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(detectedPrefs));
          } catch {}
        }
      })
      .catch(() => {});
  };

  const updateLanguage = (language: LanguageCode) => {
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

    setPreferences((prev) => {
      const updated: UserPreferences = {
        ...prev,
        language: langObj.code,
        currency: "USD",
        currencySymbol: "$",
        lastUpdated: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateLanguageCurrency = (language: string, _currency?: string) => {
    updateLanguage(language as LanguageCode);
  };

  const updateAllPreferences = (newPrefs: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const updated: UserPreferences = {
        ...prev,
        ...newPrefs,
        currency: "USD",
        currencySymbol: "$",
        lastUpdated: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const t = useCallback(
    (key: string): string => {
      const lang = preferences.language || "English";
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.English;
      return dict[key] || TRANSLATIONS.English[key] || key;
    },
    [preferences.language]
  );

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoaded,
        updateLocation,
        clearLocation,
        updateLanguage,
        updateLanguageCurrency,
        updateAllPreferences,
        t,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
