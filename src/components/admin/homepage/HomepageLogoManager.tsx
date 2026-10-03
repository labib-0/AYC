/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useRef, useState } from "react";
import { Upload, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { siteSettingsService } from "@/services/site-settings.service";

export interface HomepageLogoManagerProps {
  currentLogo: string | null;
  onLogoChange: (logoUrl: string | null) => void;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

/**
 * Validates PNG magic bytes (first 8 bytes of file: \x89PNG\r\n\x1a\n)
 */
async function validatePngMagicBytes(file: File): Promise<boolean> {
  try {
    const slice = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 8) return false;
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== pngSignature[i]) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates basic SVG structure client-side
 */
async function validateSvgStructure(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const trimmed = text.trim().toLowerCase();
    return trimmed.includes("<svg") && (trimmed.includes("xmlns") || trimmed.includes("viewbox") || trimmed.includes("</svg>"));
  } catch {
    return false;
  }
}

export default function HomepageLogoManager({
  currentLogo,
  onLogoChange,
  showToast,
  disabled = false,
}: HomepageLogoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setValidationError(null);

    // 1. Strict extension check: only PNG or SVG permitted
    const fileName = file.name.toLowerCase();
    const isPng = fileName.endsWith(".png");
    const isSvg = fileName.endsWith(".svg");

    if (!isPng && !isSvg) {
      const err = "Invalid file type. Only PNG and SVG images are permitted. JPG, JPEG, WebP, and GIF are strictly rejected.";
      setValidationError(err);
      showToast(err, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. MIME type check if provided
    const mimeType = (file.type || "").toLowerCase();
    if (isPng && mimeType && mimeType !== "image/png") {
      const err = "Invalid MIME type. Logo file must be image/png.";
      setValidationError(err);
      showToast(err, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (
      isSvg &&
      mimeType &&
      mimeType !== "image/svg+xml" &&
      mimeType !== "image/svg" &&
      mimeType !== "text/xml" &&
      mimeType !== "text/plain"
    ) {
      const err = "Invalid MIME type. SVG logo file must be image/svg+xml.";
      setValidationError(err);
      showToast(err, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. File size check (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      const err = "Logo file exceeds 5MB size limit.";
      setValidationError(err);
      showToast(err, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 4. Content verification
    if (isPng) {
      const isRealPng = await validatePngMagicBytes(file);
      if (!isRealPng) {
        const err = "Corrupted or invalid PNG file: Binary header verification failed.";
        setValidationError(err);
        showToast(err, "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    } else if (isSvg) {
      const isValidSvg = await validateSvgStructure(file);
      if (!isValidSvg) {
        const err = "Corrupted or invalid SVG file: Valid SVG markup not found.";
        setValidationError(err);
        showToast(err, "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    // 5. Upload via site settings service
    setUploading(true);
    try {
      const res = await siteSettingsService.uploadLogo(file);
      onLogoChange(res.logo_url);
      showToast("Website logo updated successfully.", "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
        window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "logo" } }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload logo.";
      setValidationError(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleRemove = async () => {
    if (disabled || uploading) return;
    setValidationError(null);
    setUploading(true);
    try {
      await siteSettingsService.removeLogo();
      onLogoChange(null);
      showToast("Logo removed. Storefront will display brand title.", "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
        window.dispatchEvent(new CustomEvent("ayaan:homepage-updated", { detail: { type: "logo" } }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove logo.";
      setValidationError(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
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
        accept=".png,.svg,image/png,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
        id="homepage-logo-file-input"
      />

      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon size={14} />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground uppercase">
              Brand Logo
            </h3>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase font-medium">
            Format: PNG / SVG
          </span>
        </div>

        {validationError && (
          <div className="mb-3 p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Compact Horizontal Media Control */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border/60">
          {/* Logo Preview Thumbnail */}
          <div
            onClick={() => {
              if (!disabled && !uploading) fileInputRef.current?.click();
            }}
            className="cursor-pointer group relative shrink-0"
            title="Click to select logo image"
          >
            {currentLogo ? (
              <div className="relative">
                <div className="w-12 h-12 sm:w-13 sm:h-13 aspect-square rounded-xl bg-[#0b1329] border border-white/10 flex items-center justify-center p-1.5 overflow-hidden shadow-2xs group-hover:ring-2 group-hover:ring-primary transition-all">
                  <img
                    src={currentLogo}
                    alt="Saved Website Logo"
                    className="w-full h-full max-w-full max-h-full object-contain pointer-events-none"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                  <CheckCircle2 size={10} />
                </span>
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-13 sm:h-13 aspect-square rounded-xl bg-muted/60 border border-dashed border-border flex flex-col items-center justify-center text-center p-1 group-hover:border-primary group-hover:bg-primary/5 transition-all">
                <ImageIcon size={15} className="text-muted-foreground/60 mb-0.5 group-hover:text-primary transition-colors" />
                <span className="text-[9px] font-medium text-muted-foreground group-hover:text-primary">Upload</span>
              </div>
            )}
          </div>

          {/* Center: Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {currentLogo ? "Brand Logo" : "No Logo"}
              </span>
              {currentLogo && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  Active
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1.5 pt-0.5">
              <span>PNG / SVG</span>
              <span>•</span>
              <span>1:1 Square</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              id="btn-upload-png-logo"
              aria-label="Upload or replace logo"
            >
              {uploading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span className="hidden xs:inline">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={12} />
                  <span>{currentLogo ? "Replace Logo" : "Upload Logo"}</span>
                </>
              )}
            </button>

            {currentLogo && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                id="btn-remove-logo"
                title="Remove logo"
              >
                <Trash2 size={12} />
                <span className="hidden xs:inline">Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
