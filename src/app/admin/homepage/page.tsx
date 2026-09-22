"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  adminPromotionService,
  PromotionRecord,
} from "@/services/admin/promotion.service";
import {
  HomepageBannerHeader,
  HomepageBannerPreview,
  BannerImageUploader,
  BannerContentForm,
  BannerStatusControl,
  BannerRecordSelector,
  BannerEmptyState,
} from "@/components/admin/homepage";
import ProductToast, {
  ToastMessage,
} from "@/components/admin/products/ProductToast";
import { DEFAULT_TOP_BANNER } from "@/config/banner";

interface BannerFormState {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonTarget: string;
  isActive: boolean;
}

export default function AdminHomepageBannerPage() {
  // Promotion Records State
  const [bannerRecords, setBannerRecords] = useState<PromotionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PromotionRecord | null>(null);

  // Form Draft State
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
  const [saving, setSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
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

  // Fetch banner records from AdminPromotionService
  const loadBannerData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const allPromotions = await adminPromotionService.getPromotions();
      // Filter for homepage banner types: hero_banner or top_banner
      const banners = allPromotions.filter(
        (p) => p.type === "top_banner" || p.type === "hero_banner"
      );

      setBannerRecords(banners);

      if (banners.length > 0) {
        // Prioritize active record, or first record
        const activeBanner = banners.find((b) => b.is_active) || banners[0];
        setSelectedRecord(activeBanner);
        setFormState({
          title: activeBanner.title || "",
          subtitle: activeBanner.subtitle || "",
          imageUrl: activeBanner.image_url || DEFAULT_TOP_BANNER.imageUrl,
          buttonText: activeBanner.button_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
          buttonTarget: activeBanner.button_target || DEFAULT_TOP_BANNER.target,
          isActive: Boolean(activeBanner.is_active),
        });
        setIsCreatingNew(false);
      } else {
        setSelectedRecord(null);
      }
    } catch (err: unknown) {
      setLoadError((err as Error)?.message || "Failed to load homepage banner data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBannerData();
  }, [loadBannerData]);

  // Handle record selection when multiple exist
  const handleSelectRecord = (record: PromotionRecord) => {
    setSelectedRecord(record);
    setFormState({
      title: record.title || "",
      subtitle: record.subtitle || "",
      imageUrl: record.image_url || DEFAULT_TOP_BANNER.imageUrl,
      buttonText: record.button_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
      buttonTarget: record.button_target || DEFAULT_TOP_BANNER.target,
      isActive: Boolean(record.is_active),
    });
    setFormErrors({});
    setIsCreatingNew(false);
  };

  // Switch to creating a new banner record
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedRecord(null);
    setFormState({
      title: DEFAULT_TOP_BANNER.title,
      subtitle: DEFAULT_TOP_BANNER.subtitle || "",
      imageUrl: DEFAULT_TOP_BANNER.imageUrl,
      buttonText: DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
      buttonTarget: DEFAULT_TOP_BANNER.target,
      isActive: true,
    });
    setFormErrors({});
  };

  // Determine if form has unsaved modifications
  const isDirty = useMemo(() => {
    if (isCreatingNew) return true;
    if (!selectedRecord) return false;

    return (
      formState.title !== (selectedRecord.title || "") ||
      formState.subtitle !== (selectedRecord.subtitle || "") ||
      formState.imageUrl !== (selectedRecord.image_url || "") ||
      formState.buttonText !== (selectedRecord.button_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →") ||
      formState.buttonTarget !== (selectedRecord.button_target || DEFAULT_TOP_BANNER.target) ||
      formState.isActive !== Boolean(selectedRecord.is_active)
    );
  }, [formState, selectedRecord, isCreatingNew]);

  // Reset form to saved state
  const handleReset = () => {
    if (selectedRecord) {
      setFormState({
        title: selectedRecord.title || "",
        subtitle: selectedRecord.subtitle || "",
        imageUrl: selectedRecord.image_url || DEFAULT_TOP_BANNER.imageUrl,
        buttonText: selectedRecord.button_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: selectedRecord.button_target || DEFAULT_TOP_BANNER.target,
        isActive: Boolean(selectedRecord.is_active),
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

  // Field change handler
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

  // Validation before saving
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      errors.title = "Banner title is required.";
    } else if (trimmedTitle.length > 120) {
      errors.title = "Title must not exceed 120 characters.";
    }

    if (formState.subtitle.length > 250) {
      errors.subtitle = "Subtitle must not exceed 250 characters.";
    }

    if (formState.isActive && !formState.imageUrl.trim()) {
      errors.imageUrl = "An image asset is recommended for active homepage banners.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes to persistent service
  const handleSave = async () => {
    if (!validateForm()) {
      showToast("Unable to update homepage banner. Please check required fields.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<PromotionRecord> = {
        title: formState.title.trim(),
        subtitle: formState.subtitle.trim() || undefined,
        image_url: formState.imageUrl.trim() || undefined,
        button_text: formState.buttonText.trim() || "EXPLORE CATALOG →",
        button_target: formState.buttonTarget.trim() || "#featured",
        button_action: "navigate",
        type: selectedRecord?.type || "hero_banner",
        is_active: formState.isActive,
        sort_order: selectedRecord?.sort_order ?? 1,
      };

      let savedRecord: PromotionRecord;

      if (selectedRecord && selectedRecord.id) {
        savedRecord = await adminPromotionService.updatePromotion(selectedRecord.id, payload);
      } else {
        savedRecord = await adminPromotionService.createPromotion(payload);
      }

      showToast("Homepage banner updated successfully.", "success");
      setIsCreatingNew(false);

      // Refresh list to keep selector and current selection strictly in sync
      const updatedList = await adminPromotionService.getPromotions();
      const updatedBanners = updatedList.filter(
        (p) => p.type === "top_banner" || p.type === "hero_banner"
      );
      setBannerRecords(updatedBanners);
      const matched = updatedBanners.find((b) => b.id === savedRecord.id) || savedRecord;
      setSelectedRecord(matched);
      setFormState({
        title: matched.title || "",
        subtitle: matched.subtitle || "",
        imageUrl: matched.image_url || DEFAULT_TOP_BANNER.imageUrl,
        buttonText: matched.button_text || DEFAULT_TOP_BANNER.buttonText || "EXPLORE CATALOG →",
        buttonTarget: matched.button_target || DEFAULT_TOP_BANNER.target,
        isActive: Boolean(matched.is_active),
      });
    } catch {
      showToast("Unable to update homepage banner. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // 1. Initial Loading State
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

  // 2. Fatal Load Error
  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-card rounded-2xl border border-red-500/20 text-center space-y-4 shadow-2xs">
        <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full w-fit mx-auto">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-foreground">Failed to Load Homepage Banner</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">{loadError}</p>
        <button
          type="button"
          onClick={loadBannerData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // 3. Empty State (No banner records in database)
  if (bannerRecords.length === 0 && !isCreatingNew) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <HomepageBannerHeader
          storefrontUrl={storefrontUrl}
          isDirty={false}
          isSaving={false}
          onSave={() => {}}
          onReset={() => {}}
        />
        <BannerEmptyState onConfigure={handleCreateNew} />
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // 4. Main Page View
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification Container */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />

      {/* Page Header with Action Bar */}
      <HomepageBannerHeader
        storefrontUrl={storefrontUrl}
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      {/* Multiple Records Selector (shown only if multiple exist) */}
      <BannerRecordSelector
        records={bannerRecords}
        selectedId={selectedRecord?.id ?? null}
        onSelect={handleSelectRecord}
        onCreateNew={handleCreateNew}
        disabled={saving}
      />

      {/* Real-time Visual Preview */}
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
            disabled={saving}
          />

          <BannerStatusControl
            isActive={formState.isActive}
            onChange={(active) => handleFieldChange("isActive", active)}
            disabled={saving}
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
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}
