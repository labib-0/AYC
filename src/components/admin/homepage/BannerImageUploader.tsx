import React, { useState, useRef } from "react";
import { 
  Upload, 
  ImageIcon, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon 
} from "lucide-react";
import { uploadBannerImage } from "@/lib/services/storage";

export interface BannerImageUploaderProps {
  imageUrl: string;
  onImageChange: (newUrl: string) => void;
  onRemoveImage: () => void;
  disabled?: boolean;
}

export default function BannerImageUploader({
  imageUrl,
  onImageChange,
  onRemoveImage,
  disabled = false,
}: BannerImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aspectRatioWarning, setAspectRatioWarning] = useState<string | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);
  const [directUrlValue, setDirectUrlValue] = useState("");

  const checkImageDimensions = (url: string) => {
    if (!url || typeof window === "undefined") return;
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio < 2.5) {
        setAspectRatioWarning(
          `This image has a tall/narrow aspect ratio (${ratio.toFixed(1)}:1) compared with the recommended thin horizontal banner (~8.7:1). It will scale to fit full width but will crop vertically.`
        );
      } else {
        setAspectRatioWarning(null);
      }
    };
    img.onerror = () => {
      setAspectRatioWarning(null);
    };
    img.src = url;
  };

  const handleFile = async (file: File) => {
    setUploadError(null);
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
      setUploadError("Invalid file type. Please upload a PNG, JPG, or WebP banner.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit. Please upload an optimized banner image.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadBannerImage(file);
      if (result.url) {
        onImageChange(result.url);
        checkImageDimensions(result.url);
        setShowConfirmRemove(false);
      } else {
        setUploadError("Unable to process uploaded image. Please try again.");
      }
    } catch (err: unknown) {
      setUploadError((err as Error)?.message || "Failed to upload banner image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyDirectUrl = () => {
    const trimmed = directUrlValue.trim();
    if (!trimmed) return;
    onImageChange(trimmed);
    checkImageDimensions(trimmed);
    setDirectUrlValue("");
    setShowDirectUrlInput(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ImageIcon size={16} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Banner Image Asset
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Recommended: 1375 × 158 px PNG, JPG, or WebP. Max 10MB.
            </p>
          </div>
        </div>

        {imageUrl && !showConfirmRemove && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              id="btn-replace-banner-image"
            >
              <RefreshCw size={12} className={isUploading ? "animate-spin" : ""} />
              <span>Replace Image</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmRemove(true)}
              disabled={disabled || isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              id="btn-remove-banner-image"
            >
              <Trash2 size={12} />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>

      {/* Remove Confirmation state */}
      {showConfirmRemove && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Remove the homepage banner image? Storefront will fall back to default if active.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onRemoveImage();
                setShowConfirmRemove(false);
                setAspectRatioWarning(null);
              }}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Confirm Remove
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmRemove(false)}
              className="px-3 py-1 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Aspect Ratio Warning */}
      {aspectRatioWarning && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{aspectRatioWarning}</span>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center min-h-[140px] ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.005]"
            : "border-border/80 hover:border-border hover:bg-secondary/40"
        } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => {
          if (!disabled && !isUploading) fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
          disabled={disabled || isUploading}
          id="banner-file-input"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-primary py-4">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-xs font-semibold">Processing &amp; optimizing banner...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="p-3 rounded-full bg-secondary text-foreground">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                <span className="text-primary hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                PNG, JPG, or WebP (recommended ratio ~8.7:1, e.g. 1375×158 px)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Direct URL Fallback (Accordion) */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
          className="w-full px-4 py-2.5 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LinkIcon size={13} />
            <span>Advanced: Direct Image URL</span>
          </div>
          {showDirectUrlInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showDirectUrlInput && (
          <div className="p-4 bg-card border-t border-border/60 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Directly specify a CDN URL or static asset path (e.g. <code className="font-mono text-foreground">/images/homepage-banner.jpg</code>).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={directUrlValue}
                onChange={(e) => setDirectUrlValue(e.target.value)}
                placeholder="https://... or /images/..."
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                id="input-direct-banner-url"
              />
              <button
                type="button"
                onClick={handleApplyDirectUrl}
                disabled={!directUrlValue.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                Apply URL
              </button>
            </div>
            {imageUrl && (
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                Current URL: {imageUrl}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
