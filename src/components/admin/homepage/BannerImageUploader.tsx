"use client";

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
  Link as LinkIcon,
  CheckCircle2
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
          `This image has a tall aspect ratio (${ratio.toFixed(1)}:1) compared with the recommended horizontal banner (~8.7:1). It will scale to fit full width but will crop vertically.`
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
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-card rounded-2xl border transition-all p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between h-full ${
        isDragging ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border/80"
      }`}
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

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon size={16} />
            </div>
            <h2 className="text-base font-display font-bold uppercase tracking-tight text-foreground">
              Banner Image Asset
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
            1375 × 158 px
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          High-resolution photographic asset displayed behind the promotional banner overlay on the customer storefront. Recommended ratio ~8.7:1. Max 10MB.
        </p>

        {/* Aspect Ratio Warning */}
        {aspectRatioWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{aspectRatioWarning}</span>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Remove Confirmation */}
        {showConfirmRemove && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-destructive font-medium">
              <AlertTriangle size={15} className="shrink-0" />
              <span>Remove banner image?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onRemoveImage();
                  setShowConfirmRemove(false);
                  setAspectRatioWarning(null);
                }}
                className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
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

        {/* Current Image Preview (when available) OR Upload Drop Area (when empty) */}
        {imageUrl ? (
          <div className="space-y-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
            {/* Thumbnail bar */}
            <div className="relative w-full h-20 rounded-lg overflow-hidden border border-border/80 bg-background/80 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Banner Image Preview"
                className="w-full h-full object-cover object-center"
              />
              <span className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-emerald-500 text-white shadow-xs">
                <CheckCircle2 size={12} />
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-semibold text-foreground text-xs block truncate">
                  Active Asset
                </span>
                <span className="text-[11px] font-mono text-muted-foreground block truncate">
                  {imageUrl.startsWith("data:") ? "Local preview asset" : imageUrl}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono shrink-0">
                Ready
              </span>
            </div>
          </div>
        ) : (
          /* Upload / Drop Area when Empty */
          <div
            onClick={() => {
              if (!disabled && !isUploading) fileInputRef.current?.click();
            }}
            className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center min-h-[120px] transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border/80 hover:border-border hover:bg-secondary/40"
            } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 text-primary py-2">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-xs font-semibold">Processing banner image...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="p-2.5 rounded-full bg-secondary text-foreground">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    PNG, JPG, or WebP (max 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Row */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2.5">
          {imageUrl && !showConfirmRemove ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex-1 xs:flex-initial"
                id="btn-replace-banner-image"
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span>Replace Image</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmRemove(true)}
                disabled={disabled || isUploading}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold text-xs sm:text-sm transition-colors disabled:opacity-50 cursor-pointer"
                id="btn-remove-banner-image"
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            </>
          ) : !imageUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              id="btn-upload-banner-image"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Upload Image</span>
            </button>
          ) : null}
        </div>

        {/* Advanced Direct URL Fallback (Accordion) */}
        <div className="border border-border/60 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
            className="w-full px-3.5 py-2 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LinkIcon size={13} />
              <span>Direct Asset URL</span>
            </div>
            {showDirectUrlInput ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showDirectUrlInput && (
            <div className="p-3 bg-card border-t border-border/60 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={directUrlValue}
                  onChange={(e) => setDirectUrlValue(e.target.value)}
                  placeholder="https://... or /images/..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  id="banner-image-url-input"
                  data-fallback-id="input-direct-banner-url"
                />
                <button
                  type="button"
                  onClick={handleApplyDirectUrl}
                  disabled={!directUrlValue.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
