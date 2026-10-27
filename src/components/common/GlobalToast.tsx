"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { FlashToast, consumeFlashToast, FLASH_TOAST_EVENT_NAME } from "@/lib/flash-toast";

export default function GlobalToast() {
  const [toasts, setToasts] = useState<FlashToast[]>([]);
  const pathname = usePathname();
  const displayedIdsRef = useRef<Set<string>>(new Set());

  // Check and consume flash toast on mount or route transition
  const checkFlashToast = useCallback(() => {
    const flash = consumeFlashToast();
    if (flash && !displayedIdsRef.current.has(flash.id)) {
      displayedIdsRef.current.add(flash.id);
      setToasts((prev) => {
        // Prevent duplicate messages if already showing the exact message
        if (prev.some((t) => t.id === flash.id || t.message === flash.message)) {
          return prev;
        }
        return [...prev, flash];
      });
    }
  }, []);

  useEffect(() => {
    // Initial and route change consumption
    checkFlashToast();

    // Live event listener for same-page dispatches
    const handleFlashEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FlashToast>;
      const detail = customEvent.detail;
      if (detail && !displayedIdsRef.current.has(detail.id)) {
        displayedIdsRef.current.add(detail.id);
        setToasts((prev) => {
          if (prev.some((t) => t.id === detail.id || t.message === detail.message)) {
            return prev;
          }
          return [...prev, detail];
        });
      }
    };

    window.addEventListener(FLASH_TOAST_EVENT_NAME, handleFlashEvent);
    return () => {
      window.removeEventListener(FLASH_TOAST_EVENT_NAME, handleFlashEvent);
    };
  }, [checkFlashToast, pathname]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-3rem)] sm:max-w-sm pointer-events-none"
      aria-live="polite"
      id="global-auth-toast-container"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: FlashToast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrance animation
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismissal after 3.5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 250);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      data-testid={`global-toast-${toast.type}`}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
      } ${
        isSuccess
          ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-700 dark:text-emerald-100"
          : "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/90 dark:border-red-700 dark:text-red-100"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
      )}
      <span className="text-xs sm:text-sm font-semibold flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 250);
        }}
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

