"use client";

import React from "react";
import { CallToActionData } from "@/types/cms";

interface CtaEditorProps {
  data: CallToActionData;
  onChange: (updated: CallToActionData) => void;
}

export function CtaEditor({ data, onChange }: CtaEditorProps) {
  const updateField = <K extends keyof CallToActionData>(field: K, val: CallToActionData[K]) => {
    onChange({ ...data, [field]: val });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Call to Action Headline
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="e.g. Ready to Scale Your Apparel Production?"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Supporting Subtext (Optional)
        </label>
        <textarea
          rows={2}
          value={data.subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
          placeholder="e.g. Connect directly with our Dhaka merchandising team for volume pricing and production timelines."
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-y"
        />
      </div>

      {/* Background Color Theme */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Background Color Theme
        </label>
        <select
          value={data.backgroundColor || "default"}
          onChange={(e) => updateField("backgroundColor", e.target.value as any)}
          className="w-full sm:w-60 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
        >
          <option value="default">Charcoal / Black (Default)</option>
          <option value="navy">Navy Blue</option>
          <option value="orange">AYC Amber / Orange</option>
          <option value="slate">Slate Gray</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Primary Button */}
        <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-2">
          <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
            Primary Button
          </h4>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Button Text</label>
            <input
              type="text"
              value={data.primaryBtnText || ""}
              onChange={(e) => updateField("primaryBtnText", e.target.value)}
              placeholder="e.g. Request Instant Quote"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Destination URL</label>
            <input
              type="text"
              value={data.primaryBtnUrl || ""}
              onChange={(e) => updateField("primaryBtnUrl", e.target.value)}
              placeholder="e.g. /rfq"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
        </div>

        {/* Secondary Button */}
        <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-2">
          <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
            Secondary Button (Optional)
          </h4>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Button Text</label>
            <input
              type="text"
              value={data.secondaryBtnText || ""}
              onChange={(e) => updateField("secondaryBtnText", e.target.value)}
              placeholder="e.g. WhatsApp Consultation"
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">Destination URL</label>
            <input
              type="text"
              value={data.secondaryBtnUrl || ""}
              onChange={(e) => updateField("secondaryBtnUrl", e.target.value)}
              placeholder="e.g. https://wa.me/..."
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

