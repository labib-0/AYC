"use client";

import React, { useState, useRef } from "react";
import { Upload, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { uploadBrandLogo } from "@/lib/services/storage";

interface BrandLogoUploaderProps {
  logoUrl: string;
  onChange: (url: string) => void;
  brandName?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];
const ALLOWED_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".webp"];

export default function BrandLogoUploader({
  logoUrl,
  onChange,
  brandName = "Brand",
  disabled = false,
}: BrandLogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type);
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeValid && !isExtValid) {
      return "Unsupported image format. Please upload an SVG, PNG, JPG, or WebP logo.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "Image file is too large. Maximum size is 5MB.";
    }

    return null;
  };

  const processFile = async (file: File) => {
    setErrorMessage("");
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadBrandLogo(file);
      if (res?.url) {
        onChange(res.url);
      } else {
        setErrorMessage("Failed to upload brand logo. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process logo image.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = () => {
    onChange("");
    setErrorMessage("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
          Brand Logo <span className="text-muted-foreground text-[11px] font-normal normal-case">(SVG, PNG, JPG, WebP)</span>
        </label>
        {logoUrl && !disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] font-semibold text-muted-foreground hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
            aria-label="Remove current brand logo"
          >
            <Trash2 size={12} />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        className="hidden"
        aria-label="Brand logo file picker"
      />

      {/* Live Preview Area if logo is set */}
      {logoUrl ? (
        <div className="p-3 rounded-2xl bg-secondary/30 border border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-20 h-14 rounded-xl bg-card border border-border/80 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={`${brandName} logo preview`}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-foreground block truncate">
                Logo Active
              </span>
              <span className="text-[10px] text-muted-foreground font-mono block truncate max-w-[200px]">
                {logoUrl.startsWith("data:") ? "Custom uploaded asset" : logoUrl.split("/").pop()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isUploading ? "animate-spin" : ""} />
            <span>Replace</span>
          </button>
        </div>
      ) : (
        /* Dropzone if no logo set */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? "border-foreground bg-secondary/70 scale-[1.005]"
              : "border-border/80 hover:border-foreground/50 bg-secondary/20 hover:bg-secondary/40"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isUploading ? (
            <div className="py-2 flex flex-col items-center gap-1.5 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Uploading brand logo...</span>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-card border border-border/80 flex items-center justify-center text-muted-foreground shadow-2xs">
                <Upload size={16} />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  Drag &amp; drop brand logo here
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  or <span className="text-foreground font-bold underline">browse files</span> (SVG, PNG, JPG, WebP up to 5MB)
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Inline Validation Error */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
