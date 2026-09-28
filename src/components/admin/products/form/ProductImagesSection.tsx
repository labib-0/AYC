"use client";

import { useState, useRef, useMemo } from "react";
import { 
  Upload, 
  Plus, 
  Trash2, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Image as ImageIcon,
  Video,
  Play,
  ExternalLink,
  Loader2
} from "lucide-react";
import { uploadProductImage } from "@/lib/services/storage";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/media";

interface ProductImagesSectionProps {
  images: string[];
  videoUrl?: string;
  onChange: (images: string[]) => void;
  onVideoUrlChange?: (videoUrl: string) => void;
  error?: string;
}

interface UploadingPreview {
  id: string;
  name: string;
  previewUrl: string;
}

export default function ProductImagesSection({
  images,
  videoUrl = "",
  onChange,
  onVideoUrlChange,
  error,
}: ProductImagesSectionProps) {
  const [urlInput, setUrlInput] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingPreviews, setUploadingPreviews] = useState<UploadingPreview[]>([]);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically filter out any invalid bare /storage or empty strings passed in images
  const cleanImages = useMemo(() => {
    return (images || []).filter((u) => isValidImageUrl(u));
  }, [images]);

  // Helper to detect video info
  const videoDetails = useMemo(() => {
    if (!videoUrl || !videoUrl.trim()) return null;
    const url = videoUrl.trim();

    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return {
        provider: "YouTube",
        id: ytMatch[1],
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
        thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
    if (vimeoMatch) {
      return {
        provider: "Vimeo",
        id: vimeoMatch[1],
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        thumbnail: null,
      };
    }

    // Direct video file
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
      return {
        provider: "Direct MP4",
        id: null,
        embedUrl: url,
        thumbnail: null,
      };
    }

    return {
      provider: "Video Link",
      id: null,
      embedUrl: url,
      thumbnail: null,
    };
  }, [videoUrl]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    const validFiles: { file: File; preview: UploadingPreview }[] = [];
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
      const previewUrl = URL.createObjectURL(file);
      validFiles.push({
        file,
        preview: {
          id: `upl_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          previewUrl,
        },
      });
    }

    if (validFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    setUploadingPreviews((prev) => [...prev, ...validFiles.map((v) => v.preview)]);

    const newUrls: string[] = [];
    try {
      for (const item of validFiles) {
        try {
          const res = await uploadProductImage(item.file);
          if (res?.url && isValidImageUrl(res.url)) {
            newUrls.push(normalizeImageUrl(res.url));
          }
        } catch (itemErr) {
          const msg = itemErr instanceof Error ? itemErr.message : "Failed to upload image.";
          setUploadError(`Upload failed for "${item.file.name}": ${msg}`);
        } finally {
          URL.revokeObjectURL(item.preview.previewUrl);
          setUploadingPreviews((prev) => prev.filter((p) => p.id !== item.preview.id));
        }
      }

      if (newUrls.length > 0) {
        onChange([...cleanImages, ...newUrls]);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      setUploadError("Please enter a valid URL (http:// or https://).");
      return;
    }

    // Auto-detect if user pasted a video URL while on image tab or vice-versa
    const isVideo = /(?:youtu\.be\/|youtube\.com\/|vimeo\.com\/|\.(mp4|webm|ogg|mov))/i.test(trimmed);

    if (urlType === "video" || isVideo) {
      // Validate video URL
      const isYt = /(?:youtu\.be\/|youtube\.com\/)/i.test(trimmed);
      const isVimeo = /vimeo\.com\//i.test(trimmed);
      const isDirect = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed);

      if (!isYt && !isVimeo && !isDirect) {
        setUploadError("Video URL must be a supported video source (YouTube, Vimeo, or direct MP4/WebM video).");
        return;
      }

      setUploadError(null);
      onVideoUrlChange?.(trimmed);
      setUrlInput("");
    } else {
      // Image URL
      setUploadError(null);
      const normalized = normalizeImageUrl(trimmed);
      if (!isValidImageUrl(normalized)) {
        setUploadError("The entered image URL is invalid. Please provide a direct file link.");
        return;
      }
      onChange([...cleanImages, normalized]);
      setUrlInput("");
    }
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const copy = [...cleanImages];
    const [selected] = copy.splice(index, 1);
    onChange([selected, ...copy]);
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cleanImages.length) return;
    const copy = [...cleanImages];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  const handleRemove = (index: number) => {
    onChange(cleanImages.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = () => {
    onVideoUrlChange?.("");
  };

  const totalImageCount = cleanImages.length + uploadingPreviews.length;
  const totalMediaCount = totalImageCount + (videoUrl ? 1 : 0);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
            Product Media &amp; Gallery
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Storefront renders 3:4 presentation. Video appears after all product images.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {videoUrl && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
              1 Video
            </span>
          )}
          <span className="text-xs font-bold text-muted-foreground tabular-nums">
            {totalImageCount} Image{totalImageCount !== 1 ? "s" : ""}
          </span>
        </div>
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
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            {isUploading ? (
              <Loader2 size={18} className="animate-spin text-primary" />
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

      {/* Unified Media URL Input with Image/Video Type Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => setUrlType("image")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                urlType === "image"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Image URL
            </button>
            <button
              type="button"
              onClick={() => setUrlType("video")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                urlType === "video"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video size={12} className="text-rose-600" />
              Video URL
            </button>
          </div>

          <div className="flex-1 relative flex items-center">
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
              placeholder={
                urlType === "video"
                  ? "Paste YouTube, Vimeo, or direct MP4 URL..."
                  : "Paste direct image URL (https://...)"
              }
              className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleAddUrl}
            className="h-9 px-3.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            {urlType === "video" ? "Add Video" : "Add URL"}
          </button>
        </div>

        {urlType === "video" && (
          <p className="text-[10px] text-muted-foreground">
            Supported video formats: YouTube (watch, shorts, embed), Vimeo, or direct MP4/WebM files. Video appears at the end of the media gallery.
          </p>
        )}
      </div>

      {/* Upload/Validation Error */}
      {(uploadError || error) && (
        <p className="text-xs text-red-500 flex items-center gap-1.5 font-medium bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
          <AlertCircle size={14} className="shrink-0" />
          {uploadError || error}
        </p>
      )}

      {/* Media Gallery Grid (Images First, Video Strictly at the End) */}
      {totalMediaCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {/* Persisted / Uploaded Images 1..N */}
          {cleanImages.map((imgUrl, index) => {
            const isPrimary = index === 0;
            const normalizedSrc = normalizeImageUrl(imgUrl);
            const isFailed = failedUrls[imgUrl] || false;

            return (
              <div
                key={`${imgUrl}-${index}`}
                className={`relative group rounded-xl overflow-hidden border transition-all ${
                  isPrimary
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border/80 hover:border-foreground/40"
                }`}
              >
                {/* 3:4 Thumbnail Container */}
                <div className="aspect-[3/4] w-full bg-secondary/50 dark:bg-white/5 relative overflow-hidden flex items-center justify-center p-1">
                  {!isFailed ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={normalizedSrc}
                      alt={`Product preview ${index + 1}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={() => {
                        setFailedUrls((prev) => ({ ...prev, [imgUrl]: true }));
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-secondary/70 text-muted-foreground select-none">
                      <ImageIcon size={22} className="opacity-30 mb-1.5 text-foreground" />
                      <span className="text-[10px] font-semibold text-foreground/70">Image Unavailable</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="mt-1 text-[10px] text-red-500 hover:text-red-600 font-semibold underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Primary Badge */}
                  {isPrimary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 z-10">
                      <Star size={10} fill="currentColor" /> Primary
                    </div>
                  )}

                  {/* Hover Controls Overlay */}
                  <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                    <div className="flex items-center justify-between">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(index)}
                          className="px-2 py-1 rounded bg-card/90 text-foreground text-[10px] font-bold uppercase tracking-wider hover:bg-card flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Set as Primary Image"
                        >
                          <Star size={10} /> Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto shadow-xs cursor-pointer"
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
                        className="p-1 rounded bg-card/90 text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                        title="Move Left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-white">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === cleanImages.length - 1}
                        onClick={() => handleMove(index, "right")}
                        className="p-1 rounded bg-card/90 text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer"
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

          {/* Immediate Local Previews for Currently Uploading Files */}
          {uploadingPreviews.map((upl) => (
            <div
              key={upl.id}
              className="relative rounded-xl overflow-hidden border border-dashed border-primary/60 bg-secondary/30 animate-pulse"
            >
              <div className="aspect-[3/4] w-full relative overflow-hidden flex flex-col items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upl.previewUrl}
                  alt={upl.name}
                  className="w-full h-full object-contain opacity-50 blur-[0.5px]"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2 text-center text-white">
                  <Loader2 size={22} className="animate-spin text-white mb-1.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Uploading...</span>
                  <span className="text-[9px] text-white/75 truncate max-w-[120px] mt-0.5">{upl.name}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Video Media Card — Strictly Placed at the END */}
          {videoUrl && videoDetails && (
            <div className="relative group rounded-xl overflow-hidden border-2 border-rose-400/80 dark:border-rose-800 bg-black/90 shadow-md">
              <div className="aspect-[3/4] w-full relative overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                {/* Background Video Poster/Thumbnail if available */}
                {videoDetails.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={videoDetails.thumbnail}
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 to-black" />
                )}

                {/* Video Indicator Badge */}
                <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 z-10">
                  <Play size={10} className="fill-current" /> Video
                </div>

                {/* End-Of-Gallery Marker */}
                <div className="absolute top-2 right-2 bg-black/70 text-white/80 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/20 z-10">
                  End of Gallery
                </div>

                <div className="relative z-10 flex flex-col items-center gap-1.5 my-auto">
                  <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={16} className="fill-current ml-0.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {videoDetails.provider}
                    </span>
                    <span className="text-[10px] text-white/70 truncate max-w-[130px] block">
                      Product Video
                    </span>
                  </div>
                </div>

                {/* Hover Controls */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                  <div className="flex items-center justify-between">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs"
                      title="Open Video URL"
                    >
                      <ExternalLink size={10} /> Test Link
                    </a>
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="p-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto shadow-xs cursor-pointer"
                      title="Delete Video"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-white/80 bg-black/60 px-2 py-1 rounded-md border border-white/10 block font-medium">
                      Appears after all photos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {totalMediaCount === 0 && (
        <div className="border border-border/60 rounded-xl p-8 text-center text-muted-foreground space-y-1">
          <ImageIcon size={28} className="mx-auto opacity-40 mb-1" />
          <p className="text-xs font-semibold text-foreground">No media added yet</p>
          <p className="text-[11px]">Upload photos or add video URL above to showcase this product.</p>
        </div>
      )}
    </div>
  );
}
