"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FileCheck,
  Camera,
  ExternalLink,
} from "lucide-react";

export interface CustomerReceiptUploaderProps {
  id?: string;
  selectedFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  isUploading?: boolean;
  error?: string | null;
  currentReceiptUrl?: string | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function CustomerReceiptUploader({
  id = "input-customer-receipt-upload",
  selectedFile,
  previewUrl,
  onFileSelect,
  onFileRemove,
  disabled = false,
  isUploading = false,
  error = null,
  currentReceiptUrl = null,
}: CustomerReceiptUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const displayError = clientError || error;

  const validateAndHandleFile = useCallback(
    (file: File) => {
      setClientError(null);

      // 1. Validate file size (10 MB limit)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setClientError("File size exceeds 10 MB. Please upload a receipt image under 10 MB.");
        return;
      }

      // 2. Reject active SVG content for security
      const mime = (file.type || "").toLowerCase();
      const name = file.name.toLowerCase();
      if (mime.includes("svg") || name.endsWith(".svg")) {
        setClientError("SVG files are not permitted for security reasons. Please upload a standard receipt image (JPG, PNG, WebP, AVIF, GIF, or BMP).");
        return;
      }

      // 3. Validate image MIME or common image extension
      const isImage =
        mime.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(name);

      if (!isImage) {
        setClientError("Invalid file type. Please select a valid payment receipt image.");
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndHandleFile(file);
    }
    // Reset native input value so selecting the same file again triggers change
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndHandleFile(file);
    }
  };

  const triggerPicker = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading) {
      e.preventDefault();
      triggerPicker();
    }
  };

  return (
    <div className="space-y-3" id="customer-receipt-uploader-root">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="input-customer-receipt-upload"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif,image/tiff,image/*"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
        aria-label="Upload Payment Receipt"
      />

      {/* State A: File Selected — Rich Preview & Replacement Card */}
      {selectedFile && previewUrl ? (
        <div
          className="p-4 rounded-2xl border-2 border-amber-400 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs"
          id="receipt-file-selected-card"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Thumbnail Preview with Modal / Inspection Fit */}
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 shrink-0 shadow-2xs">
              <img
                src={previewUrl}
                alt="Selected Receipt Preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>Ready for Verification Submission</span>
              </div>
              <p
                className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-sm"
                title={selectedFile.name}
              >
                {selectedFile.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-mono font-medium">{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span className="uppercase font-semibold">
                  {selectedFile.type ? selectedFile.type.replace("image/", "") : "Image"}
                </span>
                <span>•</span>
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  Auto-derives crisp WebP on save
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Replace or Remove */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={triggerPicker}
              disabled={disabled || isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              id="btn-replace-receipt"
            >
              <RefreshCw size={12} />
              <span>Replace Image</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setClientError(null);
                onFileRemove();
              }}
              disabled={disabled || isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              id="btn-remove-receipt"
            >
              <Trash2 size={12} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* State B: Empty / Dropzone State */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerPicker}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          className={`relative p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all duration-150 cursor-pointer text-center group ${
            isDragOver
              ? "border-amber-500 bg-amber-500/10 scale-[1.008] shadow-md ring-2 ring-amber-400/30"
              : "border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-slate-900/40 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20"
          } ${disabled || isUploading ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
          id="receipt-dropzone"
          aria-label="Upload payment receipt by clicking or dragging an image"
        >
          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              {isDragOver ? (
                <FileCheck size={22} className="animate-bounce" />
              ) : (
                <Upload size={22} />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isDragOver ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Drop your receipt image here to select
                  </span>
                ) : (
                  <span>
                    Drag &amp; drop your wire / bank receipt here, or{" "}
                    <span className="text-amber-600 dark:text-amber-400 underline underline-offset-2">
                      browse files
                    </span>
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Supported formats: JPG, PNG, WebP, AVIF, GIF, BMP (Max 10 MB)
              </p>
            </div>

            {/* Explicit Action Button for Clear Discoverability */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerPicker();
                }}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs group-hover:shadow-sm"
                id="btn-choose-receipt-image"
              >
                <Camera size={13} />
                <span>Choose Receipt Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation / Error Feedback Alert */}
      {displayError && (
        <div
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-400 flex items-start gap-2 shadow-2xs"
          id="receipt-upload-error-banner"
        >
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="space-y-0.5">
            <span className="font-bold block">File Selection Notice</span>
            <p className="text-[11px] leading-relaxed">{displayError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
