"use client";

import React, { useState } from "react";
import { CmsPage } from "@/types/cms";
import CmsPageView from "@/components/cms/CmsPageView";
import { X, Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";

interface PagePreviewModalProps {
  page: CmsPage;
  isOpen: boolean;
  onClose: () => void;
}

export function PagePreviewModal({ page, isOpen, onClose }: PagePreviewModalProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full h-[92vh] max-w-7xl bg-zinc-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-300">
        {/* Modal Header */}
        <div className="h-14 bg-white border-b border-zinc-200 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white">
              Preview Mode
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 truncate">
                {page.title || "Untitled Page"}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                /{page.slug || "slug"} (Working Draft Snapshot)
              </p>
            </div>
          </div>

          {/* Viewport Toggles */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewport === "desktop"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-black"
              }`}
            >
              <Monitor size={14} />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewport === "tablet"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-black"
              }`}
            >
              <Tablet size={14} />
              <span>Tablet (768px)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewport === "mobile"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-black"
              }`}
            >
              <Smartphone size={14} />
              <span>Mobile (375px)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-zinc-200/70">
          <div
            className={`bg-white shadow-xl rounded-xl overflow-hidden transition-all duration-200 flex flex-col h-full overflow-y-auto ${
              viewport === "desktop"
                ? "w-full max-w-6xl"
                : viewport === "tablet"
                ? "w-[768px]"
                : "w-[375px]"
            }`}
          >
            {/* Mock Header simulation bar */}
            <div className="bg-zinc-900 text-white text-[10px] tracking-wider uppercase font-semibold py-1.5 px-4 flex items-center justify-between shrink-0">
              <span>Ayaan Clothing Storefront Preview</span>
              <span className="text-zinc-400 font-mono text-[9px]">https://ayaanclothing.com/{page.slug}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <CmsPageView page={page} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
