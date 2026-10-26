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

export interface PreferencesContextType {
  preferences: UserPreferences;
  isLoaded: boolean;
  updateLocation: (countryCode: string, postalCode?: string) => void;
  clearLocation: () => void;
  updateLanguage: (language: LanguageCode) => void;
  updateLanguageCurrency: (language: string, currency?: string) => void;
  updateAllPreferences: (newPrefs: Partial<UserPreferences>) => void;
  t: (key: string, fallback?: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({
  children,
  initialLanguage = "English",
}: {
  children: React.ReactNode;
  initialLanguage?: LanguageCode;
}) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => ({
    ...NEUTRAL_PREFERENCES,
    language: initialLanguage,
  }));
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
              language: initialLanguage,
              ...parsed,
              currency: "USD",
              currencySymbol: "$",
            };
          }
        }
      } catch {
        // ignore localStorage errors
      }

      // If customer has saved preferences in localStorage, load them immediately!
      if (savedPrefs) {
        if (isMounted) {
          setPreferences(savedPrefs);
        }
        if (savedPrefs.isManual) {
          if (isMounted) {
            setIsLoaded(true);
          }
          return;
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
              ...(savedPrefs || { ...NEUTRAL_PREFERENCES, language: initialLanguage }),
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

      // Fallback: If detection returned false or errored, keep savedPrefs if present, else fallback
      if (isMounted) {
        if (savedPrefs) {
          setPreferences(savedPrefs);
        } else {
          setPreferences({
            ...NEUTRAL_PREFERENCES,
            language: initialLanguage,
          });
        }
        setIsLoaded(true);
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
  }, [initialLanguage]);

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
    setPreferences((prev) => ({
      ...NEUTRAL_PREFERENCES,
      language: prev.language,
    }));

    // Re-detect country via IP
    fetch("/ayc/api/v1/geolocation/detect")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.detected && data.country_code) {
          const code = String(data.country_code).toUpperCase();
          const item = findCountry(code);
          const name = data.country_name || (item ? item.name : code);
          const flag = getCountryFlag(code);
          setPreferences((prev) => {
            const detectedPrefs: UserPreferences = {
              ...NEUTRAL_PREFERENCES,
              country: name,
              countryCode: code,
              flag: flag,
              language: prev.language,
              isManual: false,
              lastUpdated: Date.now(),
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(detectedPrefs));
            } catch {}
            return detectedPrefs;
          });
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
      if (typeof document !== "undefined") {
        document.cookie = `ayaan_locale=${encodeURIComponent(langObj.code)}; path=/; max-age=31536000; SameSite=Lax`;
      }
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
      if (typeof document !== "undefined" && updated.language) {
        document.cookie = `ayaan_locale=${encodeURIComponent(updated.language)}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return updated;
    });
  };

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const lang = preferences.language || "English";
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.English;
      if (dict && dict[key]) {
        return dict[key];
      }
      if (TRANSLATIONS.English && TRANSLATIONS.English[key]) {
        return TRANSLATIONS.English[key];
      }
      return fallback !== undefined ? fallback : key;
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

export function useTranslation() {
  const { t, preferences, updateLanguage } = usePreferences();
  return {
    t,
    language: preferences.language,
    isBengali: preferences.language === "Bengali",
    isEnglish: preferences.language === "English",
    updateLanguage,
  };
}
