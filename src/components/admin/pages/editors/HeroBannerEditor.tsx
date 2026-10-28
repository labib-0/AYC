"use client";

import React from "react";
import { HeroBannerData } from "@/types/cms";
import { CmsImageUploader } from "./CmsImageUploader";

interface HeroBannerEditorProps {
  data: HeroBannerData;
  onChange: (updated: HeroBannerData) => void;
}

export function HeroBannerEditor({ data, onChange }: HeroBannerEditorProps) {
  const updateField = <K extends keyof HeroBannerData>(field: K, val: HeroBannerData[K]) => {
    onChange({ ...data, [field]: val });
  };

  return (
    <div className="space-y-4">
      {/* Badge / Pill */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Badge / Eyebrow (Optional)
        </label>
        <input
          type="text"
          value={data.badge || ""}
          onChange={(e) => updateField("badge", e.target.value)}
          placeholder="e.g. WHOLESALE APPAREL MANUFACTURER"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="e.g. Direct From Dhaka Garment Hub"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Subheadline / Description
        </label>
        <textarea
          rows={2}
          value={data.subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
          placeholder="e.g. Export-grade knitwear, woven garments, and custom private label manufacturing."
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-y"
        />
      </div>

      {/* Desktop & Mobile Background Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CmsImageUploader
          label="Hero Background Image (Desktop)"
          value={data.imageUrl}
          onChange={(url) => updateField("imageUrl", url)}
        />
        <CmsImageUploader
          label="Hero Background Image (Mobile - Optional)"
          value={data.mobileImageUrl}
          onChange={(url) => updateField("mobileImageUrl", url)}
        />
      </div>

      {/* Alignment & Overlay Opacity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
            Text Alignment
          </label>
          <select
            value={data.alignment || "left"}
            onChange={(e) => updateField("alignment", e.target.value as any)}
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
          >
            <option value="left">Left Aligned</option>
            <option value="center">Centered</option>
            <option value="right">Right Aligned</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
            Dark Overlay Opacity: {data.overlayOpacity ?? 40}%
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={data.overlayOpacity ?? 40}
            onChange={(e) => updateField("overlayOpacity", Number(e.target.value))}
            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>
      </div>

      {/* Primary CTA */}
      <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-3">
        <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
          Primary Call to Action Button
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Button Text</label>
            <input
              type="text"
              value={data.ctaText || ""}
              onChange={(e) => updateField("ctaText", e.target.value)}
              placeholder="e.g. Request Wholesale Quote"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Destination URL</label>
            <input
              type="text"
              value={data.ctaUrl || ""}
              onChange={(e) => updateField("ctaUrl", e.target.value)}
              placeholder="e.g. /rfq or https://..."
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Button Style</label>
            <select
              value={data.ctaVariant || "primary"}
              onChange={(e) => updateField("ctaVariant", e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            >
              <option value="primary">Solid Black</option>
              <option value="secondary">Solid White</option>
              <option value="outline">Outline Border</option>
            </select>
          </div>
        </div>
      </div>

      {/* Secondary CTA */}
      <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-3">
        <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
          Secondary Button (Optional)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Button Text</label>
            <input
              type="text"
              value={data.secondaryCtaText || ""}
              onChange={(e) => updateField("secondaryCtaText", e.target.value)}
              placeholder="e.g. Browse Products"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Destination URL</label>
            <input
              type="text"
              value={data.secondaryCtaUrl || ""}
              onChange={(e) => updateField("secondaryCtaUrl", e.target.value)}
              placeholder="e.g. /products"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

