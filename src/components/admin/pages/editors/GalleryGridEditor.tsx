"use client";

import React from "react";
import { GalleryGridData, GalleryImageItem } from "@/types/cms";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { CmsImageUploader } from "./CmsImageUploader";

interface GalleryGridEditorProps {
  data: GalleryGridData;
  onChange: (updated: GalleryGridData) => void;
}

export function GalleryGridEditor({ data, onChange }: GalleryGridEditorProps) {
  const items = data.items || [];

  const updateField = <K extends keyof GalleryGridData>(field: K, val: GalleryGridData[K]) => {
    onChange({ ...data, [field]: val });
  };

  const addItem = () => {
    const newItem: GalleryImageItem = {
      id: `img_${Date.now()}`,
      imageUrl: "",
      caption: "",
      alt: "Production facility photo",
    };
    updateField("items", [...items, newItem]);
  };

  const updateItem = (index: number, updatedItem: GalleryImageItem) => {
    const next = [...items];
    next[index] = updatedItem;
    updateField("items", next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    updateField("items", next);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    updateField("items", next);
  };

  return (
    <div className="space-y-4">
      {/* Headings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
            Section Heading (Optional)
          </label>
          <input
            type="text"
            value={data.heading || ""}
            onChange={(e) => updateField("heading", e.target.value)}
            placeholder="e.g. Factory & Laboratory Floor"
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
            Subheading / Eyebrow (Optional)
          </label>
          <input
            type="text"
            value={data.subheading || ""}
            onChange={(e) => updateField("subheading", e.target.value)}
            placeholder="e.g. Modern circular knitting & automated cutting lines"
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      {/* Grid Columns */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Gallery Columns
        </label>
        <select
          value={data.columns || 3}
          onChange={(e) => updateField("columns", Number(e.target.value) as any)}
          className="w-full sm:w-48 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
        >
          <option value={2}>2 Columns</option>
          <option value={3}>3 Columns (Recommended)</option>
          <option value={4}>4 Columns</option>
        </select>
      </div>

      {/* Gallery Items */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
            Gallery Images ({items.length})
          </label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Plus size={13} />
            <span>Add Image</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-500 bg-zinc-50">
            No images added yet. Click &quot;Add Image&quot; to show facilities, certifications, or team.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/60 hover:bg-zinc-50 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-700">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveItem(index, "up")}
                      className="p-1 text-zinc-400 hover:text-black disabled:opacity-30 disabled:hover:text-zinc-400"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, "down")}
                      className="p-1 text-zinc-400 hover:text-black disabled:opacity-30 disabled:hover:text-zinc-400"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-zinc-400 hover:text-red-600 ml-1"
                      title="Delete Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <CmsImageUploader
                  label="Image"
                  value={item.imageUrl}
                  onChange={(url) => updateItem(index, { ...item, imageUrl: url })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Caption (Optional)
                    </label>
                    <input
                      type="text"
                      value={item.caption || ""}
                      onChange={(e) => updateItem(index, { ...item, caption: e.target.value })}
                      placeholder="e.g. Automated cut line"
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={item.alt || ""}
                      onChange={(e) => updateItem(index, { ...item, alt: e.target.value })}
                      placeholder="e.g. Fabric cutting machinery"
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

