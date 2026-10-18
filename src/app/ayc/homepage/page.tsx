"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  homepageService,
  HomepageBannerModel,
  HomepageTickerItem,
} from "@/services/homepage.service";
import {
  HomepageBannerHeader,
  HomepageLogoManager,
  HomepageBannerPreview,
  BannerImageUploader,
  BannerContentForm,
  HomepageTickerManager,
  BangladeshStorefrontAccessCard,
  HomepageSeoManager,
  GoogleTagsManager,
} from "@/components/admin/homepage";
import ProductToast, {
  ToastMessage,
} from "@/components/admin/products/ProductToast";
import { DEFAULT_TOP_BANNER } from "@/config/banner";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

interface BannerFormState {
  id?: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonTarget: string;
}

export default function AdminHomepageManagement() {
  // Admin Data State
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<HomepageBannerModel | null>(null);
  const [tickerItems, setTickerItems] = useState<HomepageTickerItem[]>([]);
  const [savedTickerItems, setSavedTickerItems] = useState<HomepageTickerItem[]>([]);
  const [googleVerificationCode, setGoogleVerificationCode] = useState<string | null>(null);
  const [googleTagHeadCode, setGoogleTagHeadCode] = useState<string | null>(null);
  const [googleTagBodyCode, setGoogleTagBodyCode] = useState<string | null>(null);

  // Banner Form Draft State
  const [formState, setFormState] = useState<BannerFormState>({
    title: DEFAULT_TOP_BANNER.title,
    subtitle: DEFAULT_TOP_BANNER.subtitle || "",
    imageUrl: DEFAULT_TOP_BANNER.imageUrl,
    buttonText: DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
    buttonTarget: DEFAULT_TOP_BANNER.target,
  });

  // UX & Validation State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [storefrontUrl, setStorefrontUrl] = useState("/");

  // Determine storefront preview URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { hostname, port, protocol } = window.location;
      if (port === "3001") {
        setStorefrontUrl("http://localhost:3000/#top-banner");
      } else if (hostname.startsWith("admin.")) {
        const apex = hostname.replace(/^admin\./, "");
        setStorefrontUrl(`${protocol}//${apex}${port ? `:${port}` : ""}/#top-banner`);
      } else {
        setStorefrontUrl("/#top-banner");
      }
    }
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch full homepage management data from Laravel API
  const loadHomepageData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await homepageService.getAdminHomepageData();
      setSiteLogo(data.site_logo || null);
      setActiveBanner(data.banner);
      setTickerItems(data.ticker_items || []);
      setSavedTickerItems(data.ticker_items || []);
      setGoogleVerificationCode(data.google_search_console_verification || null);
      setGoogleTagHeadCode(data.google_tag_head_code || null);
      setGoogleTagBodyCode(data.google_tag_body_code || null);

      if (data.banner) {
        setFormState({
          id: data.banner.id,
          title: data.banner.headline || "",
          subtitle: data.banner.subtitle || "",
          imageUrl: data.banner.image_url || DEFAULT_TOP_BANNER.imageUrl,
          buttonText: data.banner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
          buttonTarget: data.banner.destination_value || DEFAULT_TOP_BANNER.target,
        });
      }
    } catch (err: unknown) {
      setLoadError((err as Error)?.message || "Failed to load homepage configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomepageData();
  }, [loadHomepageData]);

  // Field change handler for Banner form
  const handleFieldChange = <K extends keyof BannerFormState>(
    field: K,
    value: BannerFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Determine if banner form has unsaved modifications
  const isBannerDirty = useMemo(() => {
    if (!activeBanner) {
      return (
        formState.title !== DEFAULT_TOP_BANNER.title ||
        formState.subtitle !== (DEFAULT_TOP_BANNER.subtitle || "") ||
        formState.imageUrl !== DEFAULT_TOP_BANNER.imageUrl ||
        formState.buttonText !== (DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →") ||
        formState.buttonTarget !== DEFAULT_TOP_BANNER.target
      );
    }
    return (
      formState.title !== (activeBanner.headline || "") ||
      formState.subtitle !== (activeBanner.subtitle || "") ||
      formState.imageUrl !== (activeBanner.image_url || DEFAULT_TOP_BANNER.imageUrl) ||
      formState.buttonText !== (activeBanner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →") ||
      formState.buttonTarget !== (activeBanner.destination_value || DEFAULT_TOP_BANNER.target)
    );
  }, [activeBanner, formState]);

  // Determine if ticker items have unsaved modifications
  const isTickerDirty = useMemo(() => {
    if (tickerItems.length !== savedTickerItems.length) return true;
    return tickerItems.some((item, idx) => {
      const saved = savedTickerItems[idx];
      if (!saved) return true;
      return (
        item.id !== saved.id ||
        item.text !== saved.text ||
        item.is_active !== saved.is_active ||
        item.sort_order !== saved.sort_order
      );
    });
  }, [tickerItems, savedTickerItems]);

  const isPageDirty = isBannerDirty || isTickerDirty;

  // Reset unsaved changes to last saved state
  const handleResetChanges = () => {
    if (activeBanner) {
      setFormState({
        id: activeBanner.id,
        title: activeBanner.headline || "",
        subtitle: activeBanner.subtitle || "",
        imageUrl: activeBanner.image_url || DEFAULT_TOP_BANNER.imageUrl,
        buttonText: activeBanner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: activeBanner.destination_value || DEFAULT_TOP_BANNER.target,
      });
    } else {
      setFormState({
        title: DEFAULT_TOP_BANNER.title,
        subtitle: DEFAULT_TOP_BANNER.subtitle || "",
        imageUrl: DEFAULT_TOP_BANNER.imageUrl,
        buttonText: DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: DEFAULT_TOP_BANNER.target,
      });
    }
    setTickerItems([...savedTickerItems]);
    setFormErrors({});
  };

  // Validate banner form fields
  const validateBannerForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      errors.title = "Banner title is required.";
    } else if (trimmedTitle.length > 150) {
      errors.title = "Title must not exceed 150 characters.";
    }

    if (formState.subtitle.length > 500) {
      errors.subtitle = "Subtitle must not exceed 500 characters.";
    }

    if (!formState.imageUrl.trim()) {
      errors.imageUrl = "An image asset is recommended for homepage banners.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes to Laravel backend (banner and ticker)
  const handleSaveChanges = async () => {
    if (isBannerDirty && !validateBannerForm()) {
      showToast("Unable to save banner. Please check required fields.", "error");
      return;
    }

    setSaving(true);
    try {
      // 1. Save banner if dirty
      if (isBannerDirty) {
        const payload = {
          id: formState.id,
          headline: formState.title.trim(),
          subtitle: formState.subtitle.trim() || undefined,
          cta_text: formState.buttonText.trim() || "EXPLORE CATALOG →",
          destination_type: formState.buttonTarget.startsWith("#") ? "anchor" : "url",
          destination_value: formState.buttonTarget.trim() || "#featured",
          image_url: formState.imageUrl.trim() || DEFAULT_TOP_BANNER.imageUrl,
          is_active: true,
        };

        const savedBanner = await homepageService.saveBanner(payload);
        setActiveBanner(savedBanner);
        setFormState((prev) => ({
          ...prev,
          id: savedBanner.id,
          title: savedBanner.headline,
          subtitle: savedBanner.subtitle || "",
          imageUrl: savedBanner.image_url || DEFAULT_TOP_BANNER.imageUrl,
          buttonText: savedBanner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
          buttonTarget: savedBanner.destination_value || DEFAULT_TOP_BANNER.target,
        }));
      }

      // 2. Save ticker items if dirty
      if (isTickerDirty) {
        const savedList = await homepageService.syncTickerItems(tickerItems);
        setTickerItems(savedList);
        setSavedTickerItems(savedList);
      }

      showToast("Homepage changes saved successfully. Active on storefront.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to save homepage changes. Please try again.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Dedicated Save for ticker section
  const handleSaveTickerOnly = async () => {
    setSaving(true);
    try {
      const savedList = await homepageService.syncTickerItems(tickerItems);
      setTickerItems(savedList);
      setSavedTickerItems(savedList);
      showToast("Homepage ticker keywords saved successfully.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save ticker items.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse w-full max-w-full">
        <div className="h-10 bg-secondary rounded-xl w-1/3" />
        <div className="h-20 bg-secondary rounded-2xl w-full" />
        <div className="h-44 bg-secondary rounded-2xl w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-40 bg-secondary rounded-2xl" />
          <div className="h-40 bg-secondary rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error State
  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-card rounded-2xl border border-red-500/20 text-center space-y-4 shadow-2xs">
        <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full w-fit mx-auto">
          <AlertCircle size={28} />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">
            Failed to Load Homepage Configuration
          </h2>
          <p className="text-xs text-muted-foreground">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={loadHomepageData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <AdminPageGate permission="homepage.view" moduleName="Homepage Merchandising">
      <div className="space-y-6 w-full max-w-full pb-12">
        {/* Toast Notification Container */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />

        {/* Page Header */}
        <HomepageBannerHeader
          title="Homepage"
          description="Manage your storefront content and hero banner."
          storefrontUrl={storefrontUrl}
          isDirty={isPageDirty}
          isSaving={saving}
          onSave={handleSaveChanges}
          onReset={handleResetChanges}
        />

        {/* Storefront Access Control */}
        <BangladeshStorefrontAccessCard
          showToast={showToast}
          disabled={saving}
        />

        {/* SEO & Google Search Console */}
        <HomepageSeoManager
          initialVerificationCode={googleVerificationCode}
          onSaveSuccess={(token) => setGoogleVerificationCode(token)}
          showToast={showToast}
          disabled={saving}
        />

        {/* Google Tags & Tracking (Head Code & Body Code) */}
        <GoogleTagsManager
          initialHeadCode={googleTagHeadCode}
          initialBodyCode={googleTagBodyCode}
          onSaveSuccess={(head, body) => {
            setGoogleTagHeadCode(head);
            setGoogleTagBodyCode(body);
          }}
          showToast={showToast}
          disabled={saving}
        />

        {/* ==================================================================== */}
        {/* SECTION 1: HERO BANNER (PRIMARY PROMOTIONAL BANNER)                   */}
        {/* ==================================================================== */}
        <section className="space-y-3">
          {/* Prominent Live Visual Preview */}
          <HomepageBannerPreview
            title={formState.title}
            subtitle={formState.subtitle}
            imageUrl={formState.imageUrl}
            buttonText={formState.buttonText}
            buttonTarget={formState.buttonTarget}
          />
        </section>

        {/* ==================================================================== */}
        {/* BANNER CONFIGURATION WORKSPACE (SECTIONS 2 & 3)                      */}
        {/* ==================================================================== */}
        <div className="space-y-4 sm:space-y-5">
          {/* SECTION 2: MEDIA UPLOAD ROW (BRAND LOGO + HERO IMAGE)                 */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Card 1: Brand Logo */}
              <HomepageLogoManager
                currentLogo={siteLogo}
                onLogoChange={(logo) => setSiteLogo(logo)}
                showToast={showToast}
                disabled={saving}
              />

              {/* Card 2: Hero Image */}
              <BannerImageUploader
                imageUrl={formState.imageUrl}
                onImageChange={(url) => handleFieldChange("imageUrl", url)}
                onRemoveImage={() => handleFieldChange("imageUrl", "")}
                disabled={saving}
              />
            </div>
          </section>

          {/* SECTION 3: HERO CONTENT (BANNER MESSAGE + NAVIGATION)                 */}
          <section>
            <BannerContentForm
              title={formState.title}
              subtitle={formState.subtitle}
              buttonText={formState.buttonText}
              buttonTarget={formState.buttonTarget}
              onChange={(field, val) => handleFieldChange(field, val)}
              errors={formErrors}
              disabled={saving}
            />
          </section>
        </div>

        {/* ==================================================================== */}
        {/* SECTION 4: HOMEPAGE KEYWORDS / TICKER                                 */}
        {/* ==================================================================== */}
        <section>
          <HomepageTickerManager
            items={tickerItems}
            onChange={setTickerItems}
            onSave={handleSaveTickerOnly}
            isSaving={saving}
            isDirty={isTickerDirty}
            showToast={showToast}
            disabled={saving}
          />
        </section>
      </div>
    </AdminPageGate>
  );
}
