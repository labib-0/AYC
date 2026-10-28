"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { uploadCmsPageImage } from "@/lib/services/storage";

interface CmsImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  className?: string;
}

export function CmsImageUploader({
  value,
  onChange,
  label = "Image",
  helperText = "PNG, JPG, WebP, or SVG (Max 5MB)",
  className = "",
}: CmsImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const res = await uploadCmsPageImage(file);
      if (res?.url) {
        onChange(res.url);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-medium text-zinc-500 hover:text-black underline transition-colors"
        >
          {showUrlInput ? "Upload File Instead" : "Enter Direct URL"}
        </button>
      </div>

      {showUrlInput ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg or /images/..."
            className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-2 text-zinc-400 hover:text-red-600 border border-zinc-200 rounded-md hover:bg-zinc-50"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : value ? (
        <div className="relative border border-zinc-200 rounded-lg p-2 bg-zinc-50 flex items-center gap-3">
          <div className="relative w-16 h-16 rounded overflow-hidden bg-zinc-200 shrink-0 border border-zinc-300">
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-zinc-700 truncate" title={value}>
              {value}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Image uploaded</p>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-white rounded transition-colors"
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-lg p-4 text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-zinc-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className="flex flex-col items-center justify-center gap-1.5">
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-zinc-600" />
                <span className="text-xs text-zinc-600 font-medium">Uploading image...</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <Upload size={14} />
                </div>
                <div className="text-xs text-zinc-700 font-medium">
                  Click to upload or drag & drop
                </div>
                <div className="text-[10px] text-zinc-400">{helperText}</div>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

