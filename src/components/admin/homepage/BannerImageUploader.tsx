/* eslint-disable @next/next/no-img-element */
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
          `Tall aspect ratio (${ratio.toFixed(1)}:1). Recommended ~8.7:1 (1375×158 px).`
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
      setUploadError("Invalid file type. Please upload PNG, JPG, or WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit.");
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
      className={`bg-card rounded-2xl border transition-all p-4 sm:p-5 shadow-2xs flex flex-col justify-between ${
        isDragging ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/80"
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

      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon size={14} />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground uppercase">
              Hero Image
            </h3>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase font-medium">
            1375 × 158 px
          </span>
        </div>

        {/* Warnings & Errors */}
        {aspectRatioWarning && (
          <div className="mb-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{aspectRatioWarning}</span>
          </div>
        )}

        {uploadError && (
          <div className="mb-2.5 p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Confirm Remove Prompt */}
        {showConfirmRemove && (
          <div className="mb-2.5 p-2 rounded-xl bg-destructive/10 border border-destructive/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Remove banner image?</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onRemoveImage();
                  setShowConfirmRemove(false);
                  setAspectRatioWarning(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-semibold text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmRemove(false)}
                className="px-2.5 py-1 rounded-lg border border-border bg-card text-foreground font-medium text-[11px] hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Compact Horizontal Media Control */}
        {imageUrl ? (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border/60">
            {/* Small banner thumbnail */}
            <div
              onClick={() => {
                if (!disabled && !isUploading) fileInputRef.current?.click();
              }}
              className="cursor-pointer group relative shrink-0"
              title="Click to replace banner image"
            >
              <div className="relative w-20 sm:w-22 h-11 sm:h-12 rounded-xl overflow-hidden border border-border/80 bg-background/80 shadow-2xs group-hover:ring-2 group-hover:ring-primary transition-all">
                <img
                  src={imageUrl}
                  alt="Banner Thumbnail"
                  className="w-full h-full object-cover object-center pointer-events-none"
                />
                <span className="absolute bottom-1 right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                  <CheckCircle2 size={10} />
                </span>
              </div>
            </div>

            {/* Center: Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-foreground truncate">Hero Asset</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  Active
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1.5 pt-0.5 truncate">
                <span>1375 × 158</span>
                <span>•</span>
                <span>PNG/JPG/WebP</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                id="btn-replace-banner-image"
                aria-label="Replace banner image"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span className="hidden xs:inline">Uploading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} />
                    <span>Replace Image</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmRemove(true)}
                disabled={disabled || isUploading}
                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                id="btn-remove-banner-image"
                title="Remove banner image"
              >
                <Trash2 size={12} />
                <span className="hidden xs:inline">Remove</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty / Upload State */
          <div
            onClick={() => {
              if (!disabled && !isUploading) fileInputRef.current?.click();
            }}
            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border border-dashed transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border/80 bg-secondary/20 hover:border-primary hover:bg-primary/5"
            } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                {isUploading ? (
                  <Loader2 size={15} className="animate-spin text-primary" />
                ) : (
                  <Upload size={15} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Upload Hero Image</p>
                <p className="text-[10px] text-muted-foreground font-mono">1375 × 158 px</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled || isUploading}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shrink-0"
              id="btn-upload-banner-image"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              <span>Upload Image</span>
            </button>
          </div>
        )}

        {/* Collapsible Direct Asset URL */}
        <div className="pt-2 border-t border-border/40 mt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <LinkIcon size={11} />
              <span>Direct Asset URL</span>
              {showDirectUrlInput ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>

          {showDirectUrlInput && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={directUrlValue}
                onChange={(e) => setDirectUrlValue(e.target.value)}
                placeholder="https://... or /images/..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                id="banner-image-url-input"
              />
              <button
                type="button"
                onClick={handleApplyDirectUrl}
                disabled={!directUrlValue.trim()}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
