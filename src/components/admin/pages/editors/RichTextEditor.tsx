"use client";

import React from "react";
import { RichTextData } from "@/types/cms";

interface RichTextEditorProps {
  data: RichTextData;
  onChange: (updated: RichTextData) => void;
}

export function RichTextEditor({ data, onChange }: RichTextEditorProps) {
  const updateField = <K extends keyof RichTextData>(field: K, val: RichTextData[K]) => {
    onChange({ ...data, [field]: val });
  };

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Section Heading (Optional)
        </label>
        <input
          type="text"
          value={data.heading || ""}
          onChange={(e) => updateField("heading", e.target.value)}
          placeholder="e.g. Our Manufacturing Heritage"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Subheading */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Subheading / Eyebrow (Optional)
        </label>
        <input
          type="text"
          value={data.subheading || ""}
          onChange={(e) => updateField("subheading", e.target.value)}
          placeholder="e.g. Over two decades of export craftsmanship"
          className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Max Width */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Container Max Width
        </label>
        <select
          value={data.maxWidth || "normal"}
          onChange={(e) => updateField("maxWidth", e.target.value as any)}
          className="w-full sm:w-60 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
        >
          <option value="narrow">Narrow (Optimal for articles / legal terms)</option>
          <option value="normal">Normal (Standard page width)</option>
          <option value="full">Full Width (Expanded)</option>
        </select>
      </div>

      {/* Body Content */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700">
            Body Content (HTML or Plain Text)
          </label>
          <span className="text-[11px] text-zinc-400">
            Supports standard HTML tags like &lt;p&gt;, &lt;h3&gt;, &lt;ul&gt;, &lt;strong&gt;
          </span>
        </div>
        <textarea
          rows={10}
          value={data.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          placeholder="Enter formatted content or paragraphs here..."
          className="w-full px-3 py-2.5 text-xs font-mono border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-y leading-relaxed"
        />
      </div>
    </div>
  );
}

