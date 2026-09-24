"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Download as DownloadIcon, Play } from "lucide-react";

export interface ProductGalleryProps {
  images: string[];
  productName: string;
  productSlug?: string;
  videoUrl?: string | null;
  youtubeVideoId?: string | null;
  youtubeEmbedUrl?: string | null;
  variant?: "detail" | "modal";
  /** Currently selected image index (controlled from parent) */
  selectedIndex?: number;
  /** Called when the active image changes */
  onImageChange?: (index: number) => void;
  /** Rendered over the main image (badges, brand logo) */
  overlayContent?: React.ReactNode;
  /** Optional custom video thumbnail button rendered at the end of the thumbnail rail */
  videoThumbnail?: React.ReactNode;
}

// ── Swipe/Drag Configuration ──────────────────────────────────────────────
const SWIPE_THRESHOLD = 35; // px: minimum horizontal movement to trigger swipe
const CLICK_THRESHOLD = 6; // px: max movement to still count as a click (not drag)

export default function ProductGallery({
  images = [],
  productName,
  productSlug,
  videoUrl,
  youtubeVideoId,
  youtubeEmbedUrl,
  variant = "detail",
  selectedIndex: controlledIndex,
  onImageChange,
  overlayContent,
  videoThumbnail,
}: ProductGalleryProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [mediaMode, setMediaMode] = useState<"image" | "video">("image");
  const currentIndex = controlledIndex ?? internalIndex;

  // Resolve YouTube Embed URL
  const resolvedYoutubeEmbedUrl = useMemo(() => {
    if (youtubeEmbedUrl) return youtubeEmbedUrl;
    if (youtubeVideoId) return `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
    if (!videoUrl) return null;
    const url = videoUrl.trim();
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  }, [youtubeEmbedUrl, youtubeVideoId, videoUrl]);

  // Reset to first image when images or product changes
  useEffect(() => {
    setMediaMode("image");
    setInternalIndex(0);
  }, [productName, productSlug]);

  const setIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, Math.max(0, images.length - 1)));
      setInternalIndex(clamped);
      setMediaMode("image");
      onImageChange?.(clamped);
    },
    [images.length, onImageChange]
  );

  // ── Lightbox State ────────────────────────────────────────────────────
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxTriggerRef = useRef<HTMLButtonElement>(null);

  const openLightbox = useCallback(() => {
    if (images.length === 0) return;
    setLightboxIndex(currentIndex);
    setIsLightboxOpen(true);
  }, [currentIndex, images.length]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    // Sync main gallery to lightbox's position on close
    setIndex(lightboxIndex);
    // Return focus to the trigger
    requestAnimationFrame(() => {
      lightboxTriggerRef.current?.focus();
    });
  }, [lightboxIndex, setIndex]);

  // ── Body Scroll Lock ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isLightboxOpen]);

  // ── ESC & Navigation Keys (Capture phase to prevent closing parent modal) ──
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeLightbox();
      }
      if (e.key === "ArrowLeft") setLightboxIndex((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight") setLightboxIndex((p) => Math.min(images.length - 1, p + 1));
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [isLightboxOpen, closeLightbox, images.length]);

  // ── Download Handler ──────────────────────────────────────────────────
  const handleDownload = useCallback(
    async (imageUrl: string, imageIndex: number) => {
      const slug = productSlug || productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const paddedIdx = String(imageIndex + 1).padStart(2, "0");
      const ext = imageUrl.match(/\.(jpe?g|png|webp|avif|gif)/i)?.[1] || "jpg";
      const filename = `${slug}-${paddedIdx}.${ext}`;

      try {
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) throw new Error("Fetch failed");
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
      }
    },
    [productName, productSlug]
  );

  // ── Swipe/Drag Hook ─────────────────────────────────────────────────────
  const useSwipe = (
    onSwipeLeft: () => void,
    onSwipeRight: () => void,
    onTap?: () => void
  ) => {
    const startRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const isDraggingRef = useRef(false);
    const hasCapturedRef = useRef(false);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
      if (e.button !== 0) return;
      startRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      isDraggingRef.current = false;
      hasCapturedRef.current = false;
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
      if (!startRef.current) return;
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      if (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD) {
        isDraggingRef.current = true;
        if (!hasCapturedRef.current) {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            hasCapturedRef.current = true;
          } catch { /* ignore */ }
        }
      }
    }, []);

    const onPointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (!startRef.current) return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        const isHorizontalSwipe = absDx >= SWIPE_THRESHOLD && absDx > absDy * 0.8;

        if (isHorizontalSwipe) {
          if (dx < 0) onSwipeLeft();
          else onSwipeRight();
        }

        if (hasCapturedRef.current) {
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch { /* ignore */ }
          hasCapturedRef.current = false;
        }

        startRef.current = null;
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      },
      [onSwipeLeft, onSwipeRight]
    );

    const onPointerCancel = useCallback((e: React.PointerEvent) => {
      if (hasCapturedRef.current) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch { /* ignore */ }
        hasCapturedRef.current = false;
      }
      startRef.current = null;
      isDraggingRef.current = false;
    }, []);

    const onClick = useCallback(
      (e: React.MouseEvent) => {
        if (isDraggingRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onTap?.();
      },
      [onTap]
    );

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick };
  };

  // ── Main Gallery Swipe Handlers ─────────────────────────────────────────
  const mainSwipe = useSwipe(
    () => setIndex(currentIndex + 1),
    () => setIndex(currentIndex - 1),
    openLightbox
  );

  // ── Lightbox Swipe Handlers ─────────────────────────────────────────────
  const lightboxSwipe = useSwipe(
    () => setLightboxIndex((p) => Math.min(images.length - 1, p + 1)),
    () => setLightboxIndex((p) => Math.max(0, p - 1))
  );

  // ── Thumbnail Drag to Scroll ─────────────────────────────────────────────
  const [isThumbDragging, setIsThumbDragging] = useState(false);
  const thumbDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasCaptured: false });
  const isThumbDraggingRef = useRef(false);

  const onThumbPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (!thumbContainerRef.current) return;
    thumbDragRef.current = {
      isDown: true,
      startX: e.pageX - thumbContainerRef.current.offsetLeft,
      scrollLeft: thumbContainerRef.current.scrollLeft,
      hasCaptured: false,
    };
    isThumbDraggingRef.current = false;
  }, []);

  const onThumbPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!thumbDragRef.current.isDown || !thumbContainerRef.current) return;
    const x = e.pageX - thumbContainerRef.current.offsetLeft;
    const walk = (x - thumbDragRef.current.startX) * 1.5; // Drag speed
    
    if (Math.abs(walk) > 6) {
      if (!isThumbDraggingRef.current) {
        isThumbDraggingRef.current = true;
        setIsThumbDragging(true);
        if (!thumbDragRef.current.hasCaptured) {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            thumbDragRef.current.hasCaptured = true;
          } catch { /* ignore */ }
        }
      }
      thumbContainerRef.current.scrollLeft = thumbDragRef.current.scrollLeft - walk;
    }
  }, []);

  const onThumbPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (thumbDragRef.current.hasCaptured) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
    }
    thumbDragRef.current.isDown = false;
    thumbDragRef.current.hasCaptured = false;
    
    if (isThumbDraggingRef.current) {
      setTimeout(() => {
        isThumbDraggingRef.current = false;
        setIsThumbDragging(false);
      }, 50);
    } else {
      setIsThumbDragging(false);
    }
  }, []);

  // ── Thumbnail Navigation Arrows ──────────────────────────────────────────
  const [showThumbArrows, setShowThumbArrows] = useState(false);
  const [thumbScrollLeft, setThumbScrollLeft] = useState(0);
  const [thumbMaxScroll, setThumbMaxScroll] = useState(0);

  useEffect(() => {
    const el = thumbContainerRef.current;
    if (!el) return;
    
    const updateScroll = () => {
      setThumbScrollLeft(el.scrollLeft);
      const maxScroll = Math.ceil(el.scrollWidth - el.clientWidth);
      setThumbMaxScroll(maxScroll);
      setShowThumbArrows(maxScroll > 0);
    };
    
    updateScroll();
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    el.addEventListener("scroll", updateScroll, { passive: true });
    
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScroll);
    };
  }, [images.length, resolvedYoutubeEmbedUrl]);

  const scrollThumbRail = useCallback((direction: "left" | "right") => {
    if (!thumbContainerRef.current) return;
    const clientWidth = thumbContainerRef.current.clientWidth;
    const scrollAmount = clientWidth * 0.75;
    thumbContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // ── Thumbnail Auto-Scroll ──────────────────────────────────────────────
  const thumbContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!thumbContainerRef.current) return;
    const activeThumb = thumbContainerRef.current.children[currentIndex] as HTMLElement | undefined;
    activeThumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIndex]);

  const hasMultiple = images.length > 1;
  const hasMediaRail = images.length > 1 || (images.length > 0 && (!!resolvedYoutubeEmbedUrl || !!videoThumbnail));

  const isModal = variant === "modal";
  const mainRadiusClass = isModal ? "rounded-xl" : "rounded-2xl";
  const thumbSizeClass = isModal ? "w-11 sm:w-12 rounded-lg" : "w-12 sm:w-14 rounded-lg";
  const maxHeightConstraint = isModal ? "max-h-[290px] sm:max-h-[330px]" : "";

  if (images.length === 0 && !resolvedYoutubeEmbedUrl) {
    return (
      <div className={`relative aspect-[4/5] aspect-product ${mainRadiusClass} overflow-hidden bg-secondary border border-border/70 shadow-sm flex items-center justify-center`}>
        <span className="text-xs text-muted-foreground font-sans uppercase tracking-wider">No images</span>
      </div>
    );
  }

  return (
    <>
      {/* ── MAIN GALLERY CONTAINER ── */}
      <div className={`space-y-2.5 w-full ${isModal ? "max-w-[340px] mx-auto" : ""}`}>
        {/* Video Mode: YouTube Iframe */}
        {mediaMode === "video" && resolvedYoutubeEmbedUrl ? (
          <div className={`relative aspect-[4/5] aspect-product ${mainRadiusClass} ${maxHeightConstraint} overflow-hidden bg-secondary border border-border/70 shadow-sm group`}>
            <div className="w-full h-full bg-black flex items-center justify-center">
              <iframe
                src={`${resolvedYoutubeEmbedUrl}?autoplay=1&rel=0`}
                title={`${productName} product video`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Quick exit / switch back to photos pill */}
            <button
              type="button"
              onClick={() => setMediaMode("image")}
              className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-md bg-black/75 hover:bg-black text-white text-[11px] font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-xs border border-white/20 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <span>← Back to Photos</span>
            </button>
          </div>
        ) : (
          /* Image Mode: Main Image with Swipe + Click to Lightbox */
          <div className={`relative aspect-[4/5] aspect-product ${mainRadiusClass} ${maxHeightConstraint} overflow-hidden bg-secondary border border-border/70 shadow-sm group`}>
            <button
              ref={lightboxTriggerRef}
              type="button"
              className={`w-full h-full cursor-zoom-in touch-pan-y select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mainRadiusClass}`}
              aria-label={`View ${productName} image ${currentIndex + 1} of ${images.length} — click to enlarge`}
              {...mainSwipe}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[currentIndex] || "/placeholder.jpg"}
                alt={`${productName} — image ${currentIndex + 1}`}
                loading={currentIndex === 0 ? "eager" : "lazy"}
                decoding="async"
                className="w-full h-full object-contain object-center transition-transform duration-200 group-hover:scale-[1.02] pointer-events-none"
                draggable={false}
              />
            </button>

            {/* Overlays (badges, brand logo) */}
            {overlayContent}

            {/* Prev/Next Arrows (desktop, multi-image) */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIndex(currentIndex - 1); }}
                  disabled={currentIndex === 0}
                  aria-label="Previous image"
                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-foreground shadow-sm transition-all cursor-pointer hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    currentIndex === 0 ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIndex(currentIndex + 1); }}
                  disabled={currentIndex === images.length - 1}
                  aria-label="Next image"
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-foreground shadow-sm transition-all cursor-pointer hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    currentIndex === images.length - 1 ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            {/* Dot Indicators (mobile) */}
            {hasMultiple && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:hidden pointer-events-none">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`block rounded-full transition-all duration-200 ${
                      idx === currentIndex
                        ? "w-5 h-1.5 bg-white shadow-sm"
                        : "w-1.5 h-1.5 bg-white/50"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── THUMBNAIL RAIL ── */}
        {hasMediaRail && (
          <div className="relative w-full group/rail">
            {showThumbArrows && thumbScrollLeft > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); scrollThumbRail("left"); }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 sm:-translate-x-3 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-background/95 border border-border/80 shadow-md flex items-center justify-center text-foreground cursor-pointer z-10 opacity-0 group-hover/rail:opacity-100 transition-opacity disabled:opacity-0 hidden sm:flex"
                aria-label="Scroll thumbnails left"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            {showThumbArrows && thumbScrollLeft < thumbMaxScroll - 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); scrollThumbRail("right"); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 sm:translate-x-3 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-background/95 border border-border/80 shadow-md flex items-center justify-center text-foreground cursor-pointer z-10 opacity-0 group-hover/rail:opacity-100 transition-opacity disabled:opacity-0 hidden sm:flex"
                aria-label="Scroll thumbnails right"
              >
                <ChevronRight size={14} />
              </button>
            )}

            <div
              ref={thumbContainerRef}
              className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar select-none touch-pan-x"
              onPointerDown={onThumbPointerDown}
              onPointerMove={onThumbPointerMove}
              onPointerUp={onThumbPointerUp}
              onPointerCancel={onThumbPointerUp}
            >
              {images.map((img, idx) => {
                const isActive = mediaMode === "image" && idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      if (isThumbDraggingRef.current || isThumbDragging) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      setMediaMode("image");
                      setIndex(idx);
                    }}
                    className={`${thumbSizeClass} aspect-[4/5] aspect-product overflow-hidden border-2 shrink-0 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? "border-foreground ring-2 ring-foreground/25 shadow-xs opacity-100 scale-[1.02]"
                        : "border-border/80 opacity-70 hover:opacity-100 hover:border-foreground/50 hover:shadow-2xs active:scale-95"
                    }`}
                    aria-label={`Select image ${idx + 1}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`${productName} thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain object-center pointer-events-none"
                      draggable={false}
                    />
                  </button>
                );
              })}

              {/* Video Thumbnail Button */}
              {videoThumbnail ? (
                videoThumbnail
              ) : resolvedYoutubeEmbedUrl ? (
                <button
                  type="button"
                  onClick={(e) => {
                    if (isThumbDraggingRef.current || isThumbDragging) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    setMediaMode("video");
                  }}
                  className={`relative aspect-[4/5] aspect-product ${thumbSizeClass} overflow-hidden border-2 shrink-0 transition-all cursor-pointer bg-black/90 flex flex-col items-center justify-center group ${
                    mediaMode === "video"
                      ? "border-foreground ring-2 ring-foreground/25 shadow-xs opacity-100 scale-[1.02]"
                      : "border-border/80 opacity-80 hover:opacity-100 hover:border-foreground/50 hover:shadow-2xs active:scale-95"
                  }`}
                  aria-label="Watch product video"
                  title="Watch product video"
                  aria-current={mediaMode === "video" ? "true" : undefined}
                >
                  {images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[0]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-45 transition-opacity pointer-events-none"
                      draggable={false}
                    />
                  )}
                  <div className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Play size={isModal ? 9 : 10} className="fill-current ml-0.5" />
                  </div>
                  <span className="relative z-10 text-[7px] sm:text-[8px] font-sans font-bold uppercase tracking-wider text-white mt-0.5 drop-shadow-xs">
                    Video
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── LIGHTBOX (Z-[300] to sit cleanly over Quick Add modal) ── */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image gallery viewer`}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={closeLightbox} aria-hidden="true" />

          {/* Toolbar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            {/* Counter */}
            <span className="text-xs sm:text-sm font-sans font-semibold text-white/80 tracking-wider">
              {lightboxIndex + 1} / {images.length}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(images[lightboxIndex], lightboxIndex)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider text-white bg-white/15 hover:bg-white/25 border border-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={`Download image ${lightboxIndex + 1}`}
              >
                <DownloadIcon size={14} />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={closeLightbox}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close image viewer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Image Area (swipeable) */}
          <div
            className="relative w-full h-full flex items-center justify-center px-4 sm:px-16 py-16 sm:py-20 select-none touch-pan-y"
            {...lightboxSwipe}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex]}
              alt={`${productName} — enlarged view ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Prev/Next */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => setLightboxIndex((p) => Math.max(0, p - 1))}
                disabled={lightboxIndex === 0}
                aria-label="Previous image"
                className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  lightboxIndex === 0 ? "opacity-30 pointer-events-none" : "opacity-80 hover:opacity-100"
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxIndex((p) => Math.min(images.length - 1, p + 1))}
                disabled={lightboxIndex === images.length - 1}
                aria-label="Next image"
                className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  lightboxIndex === images.length - 1 ? "opacity-30 pointer-events-none" : "opacity-80 hover:opacity-100"
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Dot Indicators (bottom) */}
          {hasMultiple && (
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`block rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    idx === lightboxIndex
                      ? "w-6 h-2 bg-white shadow-sm"
                      : "w-2 h-2 bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                  aria-current={idx === lightboxIndex ? "true" : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
