"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PublicSiteSettings } from "@/types/settings";
import { siteSettingsService } from "@/services/site-settings.service";
import BUSINESS_PROFILE, {
  WHATSAPP_BUSINESS_DISPLAY,
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_URL,
  buildWhatsAppUrl,
} from "@/config/business-profile";

const INITIAL_SETTINGS: PublicSiteSettings = {
  site_title: BUSINESS_PROFILE.name || "AYAAN CLOTHING",
  site_logo: null,
  whatsapp: {
    display: WHATSAPP_BUSINESS_DISPLAY,
    number: WHATSAPP_BUSINESS_NUMBER,
    url: WHATSAPP_BUSINESS_URL,
  },
  social_links: [
    {
      id: "link_facebook",
      provider: "facebook",
      name: "Facebook",
      url: "https://facebook.com",
      icon: "facebook",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "link_linkedin",
      provider: "linkedin",
      name: "LinkedIn",
      url: "https://linkedin.com",
      icon: "linkedin",
      is_active: true,
      sort_order: 2,
    },
    {
      id: "link_instagram",
      provider: "instagram",
      name: "Instagram",
      url: "https://instagram.com",
      icon: "instagram",
      is_active: true,
      sort_order: 3,
    },
  ],
  legal_pages: [
    {
      type: "privacy_policy",
      title: "Privacy Policy",
      url: "/privacy-policy",
    },
    {
      type: "terms_conditions",
      title: "Terms & Conditions",
      url: "/terms-and-conditions",
    },
  ],
};

interface SiteSettingsContextValue {
  settings: PublicSiteSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  getWhatsAppUrl: (prefilledText?: string) => string;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: INITIAL_SETTINGS,
  isLoading: false,
  refreshSettings: async () => {},
  getWhatsAppUrl: () => INITIAL_SETTINGS.whatsapp.url,
});

const STALE_WHATSAPP_NUMBERS = [
  "8801826304930",
  "8801711000000",
  "1826304930",
];

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ayaan_site_settings_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          const cachedNum = parsed?.whatsapp?.number ? String(parsed.whatsapp.number).replace(/\D+/g, "") : "";
          const cachedDisplay = parsed?.whatsapp?.display ? String(parsed.whatsapp.display) : "";
          if (
            (cachedNum && STALE_WHATSAPP_NUMBERS.includes(cachedNum)) ||
            STALE_WHATSAPP_NUMBERS.some((old) => cachedDisplay.includes(old))
          ) {
            localStorage.removeItem("ayaan_site_settings_cache");
            return INITIAL_SETTINGS;
          }
          return parsed;
        }
      } catch {}
    }
    return INITIAL_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await siteSettingsService.getPublicSettings();
      if (data) {
        // Sanitize data if backend ever returned known legacy dummy numbers
        const num = data.whatsapp?.number ? String(data.whatsapp.number).replace(/\D+/g, "") : "";
        if (num && STALE_WHATSAPP_NUMBERS.includes(num)) {
          data.whatsapp.number = WHATSAPP_BUSINESS_NUMBER;
          data.whatsapp.display = WHATSAPP_BUSINESS_DISPLAY;
          data.whatsapp.url = WHATSAPP_BUSINESS_URL;
        }
        setSettings(data);
        if (typeof window !== "undefined") {
          localStorage.setItem("ayaan_site_settings_cache", JSON.stringify(data));
        }
      }
    } catch (err) {
      console.warn("Notice: Failed to fetch live site settings, retaining active defaults.", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Listen to cross-tab updates or storage triggers
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ayaan_site_settings_updated") {
        fetchSettings();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchSettings]);

  const getWhatsAppUrl = useCallback(
    (prefilledText?: string): string => {
      return buildWhatsAppUrl(settings.whatsapp?.number, prefilledText);
    },
    [settings.whatsapp?.number]
  );

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshSettings: fetchSettings,
        getWhatsAppUrl,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
