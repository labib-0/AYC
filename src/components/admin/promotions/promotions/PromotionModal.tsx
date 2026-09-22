/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Upload, 
  ImageIcon, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon, 
  PanelTop,
  Save 
} from "lucide-react";
import { PromotionRecord } from "@/services/admin/promotion.service";
import { uploadPromotionImage } from "@/lib/services/storage";

export interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: PromotionRecord | null;
  onSave: (data: Partial<PromotionRecord>) => Promise<void>;
}

const PROMOTION_TYPES = [
  { value: "hero_banner", label: "Hero Banner" },
  { value: "top_banner", label: "Top Banner" },
  { value: "sidebar_banner", label: "Sidebar Banner" },
  { value: "sale_event", label: "Sale Event" },
];

export default function PromotionModal({
  isOpen,
  onClose,
  promotion,
  onSave,
}: PromotionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [type, setType] = useState("hero_banner");
  const [imageUrl, setImageUrl] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [buttonText, setButtonText] = useState("");
  const [buttonTarget, setButtonTarget] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  // Uploader State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);
  const [directUrlValue, setDirectUrlValue] = useState("");

  // UX State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (promotion) {
        setTitle(promotion.title || "");
        setSubtitle(promotion.subtitle || "");
        setType(promotion.type || "hero_banner");
        setImageUrl(promotion.image_url || "");
        setDiscountPercentage(promotion.discount_percentage ?? 0);
        setButtonText(promotion.button_text || "");
        setButtonTarget(promotion.button_target || "");
        setSortOrder(promotion.sort_order ?? 1);
        setIsActive(Boolean(promotion.is_active));
      } else {
        // Fresh Add form
        setTitle("");
        setSubtitle("");
        setType("hero_banner");
        setImageUrl("");
        setDiscountPercentage(0);
        setButtonText("EXPLORE CATALOG →");
        setButtonTarget("#featured");
        setSortOrder(1);
        setIsActive(true);
      }
      setErrors({});
      setUploadError(null);
      setShowDirectUrlInput(false);
      setDirectUrlValue("");
    }
  }, [isOpen, promotion]);

  if (!isOpen) return null;

  const isHomepageBanner = (type === "hero_banner" || type === "top_banner") && isActive;

  const handleFile = async (file: File) => {
    setUploadError(null);
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
      setUploadError("Invalid file type. Please upload a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadPromotionImage(file);
      if (result.url) {
        setImageUrl(result.url);
      } else {
        setUploadError("Unable to upload image.");
      }
    } catch (err: unknown) {
      setUploadError((err as Error)?.message || "Failed to upload promotional asset.");
    } finally {
      setIsUploading(false);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = "Promotion title is required.";
    } else if (title.trim().length > 120) {
      errs.title = "Title must not exceed 120 characters.";
    }

    if (subtitle.length > 250) {
      errs.subtitle = "Subtitle must not exceed 250 characters.";
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      errs.discount = "Discount percentage must be between 0 and 100.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        type,
        image_url: imageUrl.trim() || undefined,
        discount_percentage: Number(discountPercentage) || undefined,
        button_text: buttonText.trim() || undefined,
        button_target: buttonTarget.trim() || undefined,
        button_action: "navigate",
        sort_order: Number(sortOrder) || 1,
        is_active: isActive,
      });
      onClose();
    } catch (err: unknown) {
      setErrors({ form: (err as Error)?.message || "Failed to save promotion." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 id="promo-modal-title" className="text-base sm:text-lg font-bold text-foreground">
                {promotion ? "Edit Promotion" : "Create Promotion"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Configure promotional visual asset, copy, discounts, and navigation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Homepage Banner Warning Notice */}
          {isHomepageBanner && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-primary">
              <PanelTop size={16} className="shrink-0 mt-0.5" />
              <span>
                <strong>Homepage Banner Notice:</strong> This promotion is actively displayed as the primary banner on the storefront homepage. Any changes will immediately update the storefront banner.
              </span>
            </div>
          )}

          {errors.form && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {errors.form}
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  Promotion Title <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {title.length}/120
                </span>
              </div>
              <input
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. YOUR WHOLESALE APPAREL SOURCING PARTNER"
                disabled={saving}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors.title ? "border-red-500" : "border-border"
                }`}
              />
              {errors.title && <p className="text-[10px] text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  Subtitle / Supporting Copy
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {subtitle.length}/250
                </span>
              </div>
              <textarea
                rows={2}
                value={subtitle}
                maxLength={250}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Quality apparel for retailers, boutiques and bulk buyers."
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Promotion Image Upload Section */}
          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Promotion Image Asset
              </label>
              {imageUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving || isUploading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <RefreshCw size={11} className={isUploading ? "animate-spin" : ""} />
                    <span>Replace Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    disabled={saving || isUploading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:underline cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!saving && !isUploading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!saving && !isUploading && e.dataTransfer.files?.[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!saving && !isUploading) fileInputRef.current?.click();
              }}
              className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border/80 hover:bg-secondary/40"
              } ${imageUrl ? "bg-secondary/20" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
                disabled={saving || isUploading}
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-1.5 py-3 text-primary">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-semibold">Processing image...</span>
                </div>
              ) : imageUrl ? (
                <div className="space-y-2">
                  <div className="h-28 max-w-md mx-auto rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Promotion Asset Preview"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Click to replace with another file or drag &amp; drop
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-3">
                  <div className="p-2 rounded-full bg-secondary text-foreground">
                    <Upload size={16} />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    PNG, JPG, or WebP up to 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Advanced: Direct Image URL */}
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
                className="w-full px-3 py-2 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <LinkIcon size={12} />
                  <span>Advanced: Direct Image URL Fallback</span>
                </div>
                {showDirectUrlInput ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showDirectUrlInput && (
                <div className="p-3 bg-card border-t border-border/60 space-y-2">
                  <p className="text-[10px] text-muted-foreground">
                    Specify an external CDN asset path or static URL (e.g. <code className="font-mono text-foreground">/images/homepage-banner.jpg</code>).
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={directUrlValue}
                      onChange={(e) => setDirectUrlValue(e.target.value)}
                      placeholder="https://... or /images/..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (directUrlValue.trim()) {
                          setImageUrl(directUrlValue.trim());
                          setDirectUrlValue("");
                          setShowDirectUrlInput(false);
                        }
                      }}
                      disabled={!directUrlValue.trim()}
                      className="px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Type, Discount, Sort Order Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/60 pt-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Promotion Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary cursor-pointer outline-none"
              >
                {PROMOTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Discount % (Optional)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
              {errors.discount && <p className="text-[10px] text-red-500 mt-1">{errors.discount}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Sort Order
              </label>
              <input
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Button Text & Target Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={buttonText}
                maxLength={50}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="e.g. EXPLORE CATALOG →"
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Button Target (Anchor/URL)
              </label>
              <input
                type="text"
                value={buttonTarget}
                onChange={(e) => setButtonTarget(e.target.value)}
                placeholder="e.g. #featured or /products"
                disabled={saving}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/60">
            <div>
              <span className="text-xs font-bold text-foreground block">
                Active Status
              </span>
              <span className="text-[11px] text-muted-foreground">
                When active, this promotion is published on the storefront.
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-emerald-600" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{promotion ? "Update Promotion" : "Create Promotion"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
