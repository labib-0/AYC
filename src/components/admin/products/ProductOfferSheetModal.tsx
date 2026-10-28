"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { B2BProductInput } from "@/types/b2b";
import { apiClient } from "@/services/api-client";
import {
  FileText,
  Download,
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Printer,
  CheckCircle2,
} from "lucide-react";

interface ProductOfferSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: B2BProductInput | null;
}

export default function ProductOfferSheetModal({
  isOpen,
  onClose,
  product,
}: ProductOfferSheetModalProps) {
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("Loading Offer Sheet...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [isCacheHit, setIsCacheHit] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on unmount or close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch Offer Sheet PDF binary directly
  const fetchPdfBinary = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (!product?.id) return;

      const baseUrl = apiClient.getBaseUrl();
      const token = apiClient.getToken();
      const headers: Record<string, string> = {
        Accept: "application/pdf",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const forceParam = forceRegenerate ? "&force=1" : "";
      const endpoint = `${baseUrl}/products/${product.id}/offer-sheet?format=pdf${forceParam}`;
      const res = await fetch(endpoint, { headers });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.message || `Failed to generate Offer Sheet (HTTP ${res.status})`
        );
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.message || "Expected PDF binary from document service but received non-PDF response."
        );
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("Received empty PDF document from server.");
      }

      const cacheHeader = res.headers.get("x-pdf-cache") || "";
      setIsCacheHit(cacheHeader === "HIT");

      // Extract authoritative filename from Content-Disposition header if available
      const disposition = res.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
      let resolvedFilename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : "";

      if (!resolvedFilename) {
        const cleanSku = (product.sku || product.name || `product_${product.id}`)
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 35);
        resolvedFilename = `Offer-Sheet-${cleanSku}.pdf`;
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const objectUrl = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(objectUrl);
      setFilename(resolvedFilename);
      setLoading(false);
      setIsProcessing(false);
    },
    [product?.id, product?.sku, product?.name, pdfUrl]
  );

  // Coordinated fetch checking status first to handle processing and error states gracefully
  const fetchOfferSheet = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (!product?.id) return;

      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }

      setLoading(true);
      setError(null);
      setIsProcessing(false);
      setStatusMessage(forceRegenerate ? "Generating latest Offer Sheet..." : "Checking Offer Sheet status...");

      try {
        const baseUrl = apiClient.getBaseUrl();
        const token = apiClient.getToken();
        const headers: Record<string, string> = {
          Accept: "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // If forced, immediately proceed to PDF generation
        if (forceRegenerate) {
          await fetchPdfBinary(true);
          return;
        }

        // Fast status check
        const statusRes = await fetch(`${baseUrl}/products/${product.id}/offer-sheet?status_only=1`, { headers });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          const info = statusJson?.data;

          if (info?.is_processing) {
            setIsProcessing(true);
            setStatusMessage("Generating latest Offer Sheet in background...");
            // Poll after 1.5 seconds
            pollTimerRef.current = setTimeout(() => {
              fetchOfferSheet(false);
            }, 1500);
            return;
          }

          if (info?.status === "failed") {
            setError(info.error_message || "Offer Sheet generation failed previously. Click Retry to generate.");
            setLoading(false);
            return;
          }
        }

        // Not processing; fetch and render PDF directly
        setStatusMessage("Retrieving Offer Sheet...");
        await fetchPdfBinary(false);
      } catch (err: any) {
        console.error("[AYC] Offer Sheet fetch error:", err);
        setError(err?.message || "Failed to load product Offer Sheet.");
        setLoading(false);
        setIsProcessing(false);
      }
    },
    [product?.id, fetchPdfBinary]
  );

  useEffect(() => {
    if (!isOpen || !product?.id) {
      setPdfBlob(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    fetchOfferSheet(false);

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const handleDownload = () => {
    if (!pdfBlob) return;
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename || `AYC_Offer_Sheet_${product.sku || product.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      const baseUrl = apiClient.getBaseUrl();
      window.open(`${baseUrl}/products/${product.id}/offer-sheet`, "_blank");
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch {
        handleOpenNewTab();
      }
    } else {
      handleOpenNewTab();
    }
  };

  const brandName =
    typeof product.brand === "string"
      ? product.brand
      : (product.brand as any)?.name || "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-sheet-modal-title"
    >
      {/* Click outside backdrop dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[900px] bg-card border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="offer-sheet-modal-title"
                  className="text-sm sm:text-base font-bold font-sans text-foreground truncate max-w-md sm:max-w-lg"
                >
                  Offer Sheet
                </h3>
                {product.sku && (
                  <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-secondary text-foreground/80 border border-border/60">
                    {product.sku}
                  </span>
                )}
                {product.status === "published" ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Published
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                    Draft
                  </span>
                )}
                {isCacheHit && !loading && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <CheckCircle2 size={10} /> Fast Persisted View
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-md sm:max-w-lg mt-0.5">
                {product.name}
                {brandName ? ` • ${brandName}` : ""}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {pdfBlob && !loading && (
              <>
                <button
                  type="button"
                  onClick={() => fetchOfferSheet(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Regenerate latest Offer Sheet from saved product data"
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Print Offer Sheet"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Open in new window"
                >
                  <ExternalLink size={13} />
                  <span>New Tab</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-xs"
                  title="Download Offer Sheet PDF"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Canvas */}
        <div className="flex-1 bg-muted/40 relative overflow-hidden flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/85 backdrop-blur-xs gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <div className="text-center px-4">
                <p className="text-sm font-semibold text-foreground">
                  {statusMessage}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isProcessing
                    ? "Product data was updated. Assembling new 4:5 gallery and verified pricing tiers..."
                    : "Retrieving canonical vector layout and verified product specifications"}
                </p>
              </div>
            </div>
          )}

          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-foreground">
                Unable to Load Offer Sheet
              </h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {error}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchOfferSheet(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                >
                  <RefreshCw size={13} />
                  Retry Generation
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/80 hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer"
                >
                  <ExternalLink size={13} />
                  Open Direct Link
                </button>
              </div>
            </div>
          ) : (
            pdfUrl && (
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#view=FitH`}
                className="w-full h-full border-0 bg-white"
                title={`Offer Sheet for ${product.name}`}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
