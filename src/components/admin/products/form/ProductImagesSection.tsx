"use client";

import { useState, useRef } from "react";
import { 
  Upload, 
  Plus, 
  Trash2, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Image as ImageIcon 
} from "lucide-react";
import { uploadProductImage } from "@/lib/services/storage";

interface ProductImagesSectionProps {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
}

export default function ProductImagesSection({
  images,
  onChange,
  error,
}: ProductImagesSectionProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          setUploadError(`"${file.name}" is not a supported image file.`);
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds 15MB file size limit.`);
          continue;
        }
        const res = await uploadProductImage(file);
        if (res?.url) {
          newUrls.push(res.url);
        }
      }
      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      setUploadError("Please enter a valid image URL (http:// or https://).");
      return;
    }
    setUploadError(null);
    onChange([...images, trimmed]);
    setUrlInput("");
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const copy = [...images];
    const [selected] = copy.splice(index, 1);
    onChange([selected, ...copy]);
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Product Images
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Storefront renders 3:4 presentation. Source image ratio is preserved.
          </p>
        </div>
        <span className="text-xs font-bold text-muted-foreground tabular-nums">
          {images.length} Image{images.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Drag & Drop Uploader */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-foreground bg-foreground/5 scale-[0.99]"
            : "border-border/80 hover:border-foreground/50 hover:bg-secondary/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            {isUploading ? (
              <span className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <Upload size={18} />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">
              {isUploading ? "Uploading Images..." : "Click or Drag & Drop Images Here"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Supports PNG, JPG, WebP. Multiple uploads allowed.
            </p>
          </div>
        </div>
      </div>

      {/* URL Input Fallback */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddUrl();
            }
          }}
          placeholder="Or paste direct image URL (https://...)"
          className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
        />
        <button
          type="button"
          onClick={handleAddUrl}
          className="h-9 px-3.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus size={13} />
          Add URL
        </button>
      </div>

      {/* Upload/Validation Error */}
      {(uploadError || error) && (
        <p className="text-xs text-red-500 flex items-center gap-1.5 font-medium bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
          <AlertCircle size={14} className="shrink-0" />
          {uploadError || error}
        </p>
      )}

      {/* Image Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {images.map((imgUrl, index) => {
            const isPrimary = index === 0;
            return (
              <div
                key={`${imgUrl}-${index}`}
                className={`relative group rounded-xl overflow-hidden border transition-all ${
                  isPrimary
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border/80 hover:border-foreground/40"
                }`}
              >
                {/* 4:5 Thumbnail Container — Canonical 4:5 */}
                <div className="aspect-[4/5] w-full bg-secondary/50 dark:bg-white/5 relative overflow-hidden flex items-center justify-center p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Product preview ${index + 1}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />

                  {/* Primary Badge */}
                  {isPrimary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Primary
                    </div>
                  )}

                  {/* Hover Controls Overlay */}
                  <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex items-center justify-between">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(index)}
                          className="px-2 py-1 rounded bg-card/90 text-foreground text-[10px] font-bold uppercase tracking-wider hover:bg-card flex items-center gap-1 shadow-xs"
                          title="Set as Primary Image"
                        >
                          <Star size={10} /> Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto shadow-xs"
                        title="Delete Image"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Order Controls */}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, "left")}
                        className="p-1 rounded bg-card/90 text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                        title="Move Left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-white">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={() => handleMove(index, "right")}
                        className="p-1 rounded bg-card/90 text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                        title="Move Right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length === 0 && (
        <div className="border border-border/60 rounded-xl p-8 text-center text-muted-foreground space-y-1">
          <ImageIcon size={28} className="mx-auto opacity-40 mb-1" />
          <p className="text-xs font-semibold text-foreground">No images added yet</p>
          <p className="text-[11px]">Upload or paste a URL above to showcase this product.</p>
        </div>
      )}
    </div>
  );
}
