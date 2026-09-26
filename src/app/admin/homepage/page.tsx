"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw, PanelTop } from "lucide-react";
import {
  homepageService,
  HomepageBannerModel,
  HomepageHotSaleCategoryModel,
  HomepageFeaturedProductModel,
  HomepageFeaturedBrandModel,
} from "@/services/homepage.service";
import {
  HomepageBannerHeader,
  HomepageBannerPreview,
  BannerImageUploader,
  BannerContentForm,
  BannerStatusControl,
  ShopByBrandManager,
  HotSaleCategoryManager,
  FeaturedProductManager,
} from "@/components/admin/homepage";
import ProductToast, {
  ToastMessage,
} from "@/components/admin/products/ProductToast";
import { DEFAULT_TOP_BANNER } from "@/config/banner";

interface BannerFormState {
  id?: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonTarget: string;
  isActive: boolean;
}

export default function AdminLandingPageManagement() {
  // Admin Data State
  const [activeBanner, setActiveBanner] = useState<HomepageBannerModel | null>(null);
  const [featuredBrands, setFeaturedBrands] = useState<HomepageFeaturedBrandModel[]>([]);
  const [hotSaleCategories, setHotSaleCategories] = useState<HomepageHotSaleCategoryModel[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<HomepageFeaturedProductModel[]>([]);

  // Banner Form Draft State
  const [formState, setFormState] = useState<BannerFormState>({
    title: DEFAULT_TOP_BANNER.title,
    subtitle: DEFAULT_TOP_BANNER.subtitle || "",
    imageUrl: DEFAULT_TOP_BANNER.imageUrl,
    buttonText: DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
    buttonTarget: DEFAULT_TOP_BANNER.target,
    isActive: DEFAULT_TOP_BANNER.active,
  });

  // UX & Validation State
  const [loading, setLoading] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);
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

  // Fetch full landing page data from Laravel API
  const loadHomepageData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await homepageService.getAdminHomepageData();
      setActiveBanner(data.banner);
      setFeaturedBrands(data.featured_brands || []);
      setHotSaleCategories(data.hot_sale_categories || []);
      setFeaturedProducts(data.featured_products || []);

      if (data.banner) {
        setFormState({
          id: data.banner.id,
          title: data.banner.headline || "",
          subtitle: data.banner.subtitle || "",
          imageUrl: data.banner.image_url || DEFAULT_TOP_BANNER.imageUrl,
          buttonText: data.banner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
          buttonTarget: data.banner.destination_value || DEFAULT_TOP_BANNER.target,
          isActive: Boolean(data.banner.is_active),
        });
      }
    } catch (err: unknown) {
      setLoadError((err as Error)?.message || "Failed to load landing page configuration.");
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
        formState.buttonTarget !== DEFAULT_TOP_BANNER.target ||
        formState.isActive !== DEFAULT_TOP_BANNER.active
      );
    }
    return (
      formState.title !== (activeBanner.headline || "") ||
      formState.subtitle !== (activeBanner.subtitle || "") ||
      formState.imageUrl !== (activeBanner.image_url || DEFAULT_TOP_BANNER.imageUrl) ||
      formState.buttonText !== (activeBanner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →") ||
      formState.buttonTarget !== (activeBanner.destination_value || DEFAULT_TOP_BANNER.target) ||
      formState.isActive !== Boolean(activeBanner.is_active)
    );
  }, [activeBanner, formState]);

  // Reset banner form to last saved state
  const handleResetBanner = () => {
    if (activeBanner) {
      setFormState({
        id: activeBanner.id,
        title: activeBanner.headline || "",
        subtitle: activeBanner.subtitle || "",
        imageUrl: activeBanner.image_url || DEFAULT_TOP_BANNER.imageUrl,
        buttonText: activeBanner.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: activeBanner.destination_value || DEFAULT_TOP_BANNER.target,
        isActive: Boolean(activeBanner.is_active),
      });
    } else {
      setFormState({
        title: DEFAULT_TOP_BANNER.title,
        subtitle: DEFAULT_TOP_BANNER.subtitle || "",
        imageUrl: DEFAULT_TOP_BANNER.imageUrl,
        buttonText: DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: DEFAULT_TOP_BANNER.target,
        isActive: DEFAULT_TOP_BANNER.active,
      });
    }
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

    if (formState.isActive && !formState.imageUrl.trim()) {
      errors.imageUrl = "An image asset is recommended for active homepage banners.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save banner changes to Laravel backend
  const handleSaveBanner = async () => {
    if (!validateBannerForm()) {
      showToast("Unable to save banner. Please check required fields.", "error");
      return;
    }

    setSavingBanner(true);
    try {
      const payload = {
        id: formState.id,
        headline: formState.title.trim(),
        subtitle: formState.subtitle.trim() || undefined,
        cta_text: formState.buttonText.trim() || "EXPLORE CATALOG →",
        destination_type: formState.buttonTarget.startsWith("#") ? "anchor" : "url",
        destination_value: formState.buttonTarget.trim() || "#featured",
        image_url: formState.imageUrl.trim() || DEFAULT_TOP_BANNER.imageUrl,
        is_active: formState.isActive,
      };

      const saved = await homepageService.saveBanner(payload);
      setActiveBanner(saved);
      setFormState((prev) => ({
        ...prev,
        id: saved.id,
        title: saved.headline,
        subtitle: saved.subtitle || "",
        imageUrl: saved.image_url || DEFAULT_TOP_BANNER.imageUrl,
        buttonText: saved.cta_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: saved.destination_value || DEFAULT_TOP_BANNER.target,
        isActive: Boolean(saved.is_active),
      }));

      showToast("Homepage banner updated successfully. Active on storefront.", "success");
    } catch (err: any) {
      showToast(err?.message || "Unable to save homepage banner. Please try again.", "error");
    } finally {
      setSavingBanner(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
        <div className="h-10 bg-secondary rounded-xl w-1/3" />
        <div className="h-44 bg-secondary rounded-2xl w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-secondary rounded-2xl" />
          <div className="h-64 bg-secondary rounded-2xl" />
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
            Failed to Load Landing Page Configuration
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Toast Notification Container */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />

      {/* Page Header */}
      <HomepageBannerHeader
        title="Homepage & Landing Page"
        description="Manage the customer storefront landing page: primary promotional banner, curated hot sale categories, and prioritized featured products."
        storefrontUrl={storefrontUrl}
        isDirty={isBannerDirty}
        isSaving={savingBanner}
        onSave={handleSaveBanner}
        onReset={handleResetBanner}
      />

      {/* ==================================================================== */}
      {/* SECTION 1: PRIMARY BANNER                                            */}
      {/* ==================================================================== */}
      <section className="space-y-5">
        <div className="flex items-center justify-between pb-1 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PanelTop size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Primary Promotional Banner
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Dimensions: ~1375 × 158 px
          </span>
        </div>

        {/* Live Visual Preview */}
        <HomepageBannerPreview
          title={formState.title}
          subtitle={formState.subtitle}
          imageUrl={formState.imageUrl}
          buttonText={formState.buttonText}
          buttonTarget={formState.buttonTarget}
          isActive={formState.isActive}
        />

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Image Asset Uploader */}
          <div className="space-y-6">
            <BannerImageUploader
              imageUrl={formState.imageUrl}
              onImageChange={(url) => handleFieldChange("imageUrl", url)}
              onRemoveImage={() => handleFieldChange("imageUrl", "")}
              disabled={savingBanner}
            />

            <BannerStatusControl
              isActive={formState.isActive}
              onChange={(active) => handleFieldChange("isActive", active)}
              disabled={savingBanner}
            />
          </div>

          {/* Right Column: Text Messaging, CTA & Target Destination */}
          <div className="space-y-6">
            <BannerContentForm
              title={formState.title}
              subtitle={formState.subtitle}
              buttonText={formState.buttonText}
              buttonTarget={formState.buttonTarget}
              onChange={(field, val) => handleFieldChange(field, val)}
              errors={formErrors}
              disabled={savingBanner}
            />
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: SHOP BY BRAND                                             */}
      {/* ==================================================================== */}
      <section>
        <ShopByBrandManager
          initialBrands={featuredBrands}
          onSaveSuccess={loadHomepageData}
          showToast={showToast}
        />
      </section>

      {/* ==================================================================== */}
      {/* SECTION 3: HOT SALE CATEGORIES                                      */}
      {/* ==================================================================== */}
      <section>
        <HotSaleCategoryManager
          initialCategories={hotSaleCategories}
          onSaveSuccess={loadHomepageData}
          showToast={showToast}
        />
      </section>

      {/* ==================================================================== */}
      {/* SECTION 4: FEATURED PRODUCTS                                         */}
      {/* ==================================================================== */}
      <section>
        <FeaturedProductManager
          initialProducts={featuredProducts}
          onSaveSuccess={loadHomepageData}
          showToast={showToast}
        />
      </section>
    </div>
  );
}
