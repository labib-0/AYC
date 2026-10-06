"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle2, Image as ImageIcon, Sparkles, Save, RefreshCw } from "lucide-react";
import { siteSettingsService } from "@/services/site-settings.service";
import HeaderBranding from "@/components/common/HeaderBranding";
import { AdminSiteSettings } from "@/types/settings";

interface StorefrontBrandingSettingsProps {
  onNotify: (message: string) => void;
}

export default function StorefrontBrandingSettings({ onNotify }: StorefrontBrandingSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [siteTitle, setSiteTitle] = useState("AYAAN CLOTHING");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [footerDescription, setFooterDescription] = useState("");
  const [whatsappDisplay, setWhatsappDisplay] = useState("+880 1620-853502");
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing admin settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await siteSettingsService.getAdminSettings();
        if (data) {
          const rawNum = (data.whatsapp_number || "").replace(/\D+/g, "");
          const isStale = ["8801826304930", "8801711000000", "1826304930"].includes(rawNum);
          setSiteTitle(data.site_title || "AYAAN CLOTHING");
          setSiteLogo(data.site_logo || null);
          setWhatsappDisplay(isStale ? "+880 1620-853502" : (data.whatsapp_display || "+880 1620-853502"));
          setFooterDescription(data.footer_description || "");
          setSocialLinks(data.social_links || []);
        }
      } catch (err: unknown) {
        console.warn("Notice: Failed to fetch admin settings from API, using fallback defaults.", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // STRICT REQUIREMENT: PNG or SVG only. Reject JPG/JPEG/WebP/GIF/etc.
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    const isPng = fileName.endsWith(".png") && (mimeType === "image/png" || mimeType === "");
    const isSvg = fileName.endsWith(".svg") && (mimeType === "image/svg+xml" || mimeType === "image/svg" || mimeType === "text/xml" || mimeType === "text/plain" || mimeType === "");

    if (!isPng && !isSvg) {
      setError("Strict requirement: Only PNG and SVG images are permitted for the website logo. JPG, JPEG, WebP, and GIF are strictly rejected.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo file size must not exceed 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await siteSettingsService.uploadLogo(file);
      setSiteLogo(res.logo_url);
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
      onNotify("Website logo uploaded and applied successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload website logo.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    setError(null);
    setUploadingLogo(true);
    try {
      await siteSettingsService.removeLogo();
      setSiteLogo(null);
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
      onNotify("Website logo removed. Storefront will now use the website title text.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!siteTitle.trim()) {
      setError("Website Title is required.");
      return;
    }

    setSaving(true);
    try {
      await siteSettingsService.updateAdminSettings({
        site_title: siteTitle.trim(),
        whatsapp_display: whatsappDisplay,
        social_links: socialLinks,
        footer_description: footerDescription.trim(),
      });
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
      onNotify("Site branding updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save site branding.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveBranding} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Validation Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header Live Preview Banner */}
      <div className="p-5 sm:p-6 bg-[#0b1329] text-white rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#EA580C]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">
              Customer Header Live Preview: [ LOGO CONTAINER ] [ WEBSITE TITLE ]
            </span>
          </div>
          <span className="text-[11px] text-white/50">Simulated Desktop & Mobile Header Bar</span>
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HeaderBranding
              siteTitle={siteTitle}
              siteLogo={siteLogo}
              className="flex items-center gap-3"
              titleClassName="font-black text-xl sm:text-2xl tracking-widest text-white leading-tight"
              logoHeightClass="h-9 sm:h-10"
            />
          </div>
          <span className="text-xs text-white/40 hidden sm:inline-block">Storefront Navigation Items →</span>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl space-y-6 shadow-xs">
        <div className="border-b border-border/60 pb-4">
          <h2 className="text-base font-bold text-foreground">Website Identity & Header Branding</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the brand name and official PNG logo displayed on customer storefront header and footer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Website Title Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Website Title / Brand Name</span>
              <span className="text-[10px] text-muted-foreground uppercase">Required</span>
            </label>
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="e.g. AYAAN CLOTHING"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
            <p className="text-[11px] text-muted-foreground">
              Displayed on the customer header directly to the right of the logo, in the footer, and in metadata.
            </p>
          </div>

          {/* Site Logo Upload Field (PNG / SVG Requirement) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Website Logo (PNG / SVG)</label>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                PNG / SVG Supported
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.svg,image/png,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />

            {siteLogo ? (
              <div className="flex items-center gap-4 p-3 bg-secondary/50 border border-border rounded-xl">
                <div className="h-12 w-28 bg-[#0b1329] rounded-lg p-2 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={siteLogo}
                    alt={siteTitle}
                    className="h-full w-auto object-contain pointer-events-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground block truncate">Active Logo</span>
                  <span className="text-[11px] text-muted-foreground block truncate">Stored in storage/branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-input hover:bg-secondary transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    className="p-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Remove logo (use title text only)"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-secondary/30 rounded-xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Click to upload website logo (.PNG)
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    JPG, WebP, SVG, and GIF are strictly rejected. Max size: 5MB.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Brand Description Field */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <label className="text-xs font-semibold text-foreground">
            Footer Company Description / Exporter Tagline
          </label>
          <textarea
            rows={2}
            value={footerDescription}
            onChange={(e) => setFooterDescription(e.target.value)}
            placeholder="e.g. Ready-made Garments Manufacturer & Exporter. Serving international retail chains with export-grade apparel."
            className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Appears under the brand title in Column 1 of the customer footer.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || uploadingLogo}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>Save Site Branding</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
