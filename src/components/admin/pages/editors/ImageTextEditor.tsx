"use client";

import React from "react";
import { ImageTextData } from "@/types/cms";
import { CmsImageUploader } from "./CmsImageUploader";

interface ImageTextEditorProps {
  data: ImageTextData;
  onChange: (updated: ImageTextData) => void;
}

export function ImageTextEditor({ data, onChange }: ImageTextEditorProps) {
  const updateField = <K extends keyof ImageTextData>(field: K, val: ImageTextData[K]) => {
    onChange({ ...data, [field]: val });
  };

  return (
    <div className="space-y-4">
      {/* Badge */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Badge / Eyebrow (Optional)
        </label>
        <input
          type="text"
          value={data.badge || ""}
          onChange={(e) => updateField("badge", e.target.value)}
          placeholder="e.g. QUALITY ASSURANCE"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Heading */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={data.heading || ""}
          onChange={(e) => updateField("heading", e.target.value)}
          placeholder="e.g. Four-Tier Inspection on Every Production Run"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Image & Position */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CmsImageUploader
          label="Feature Image"
          value={data.imageUrl}
          onChange={(url) => updateField("imageUrl", url)}
        />
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
              Image Position
            </label>
            <select
              value={data.imagePosition || "left"}
              onChange={(e) => updateField("imagePosition", e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            >
              <option value="left">Image on Left, Text on Right</option>
              <option value="right">Image on Right, Text on Left</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
              Image Alt Text
            </label>
            <input
              type="text"
              value={data.imageAlt || ""}
              onChange={(e) => updateField("imageAlt", e.target.value)}
              placeholder="e.g. Fabric inspection team in Dhaka facility"
              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Body Text (HTML or Plain Text)
        </label>
        <textarea
          rows={6}
          value={data.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          placeholder="Detail your manufacturing processes, services, or brand story..."
          className="w-full px-3 py-2.5 text-xs font-mono border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-y leading-relaxed"
        />
      </div>

      {/* CTA Button */}
      <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
        <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wide mb-3">
          Action Link (Optional)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Link Text</label>
            <input
              type="text"
              value={data.ctaText || ""}
              onChange={(e) => updateField("ctaText", e.target.value)}
              placeholder="e.g. Download Compliance Certs"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Destination URL</label>
            <input
              type="text"
              value={data.ctaUrl || ""}
              onChange={(e) => updateField("ctaUrl", e.target.value)}
              placeholder="e.g. /compliance or /contact"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

