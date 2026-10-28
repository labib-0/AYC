"use client";

import React from "react";
import { FeatureGridData, FeatureCardItem } from "@/types/cms";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface FeatureGridEditorProps {
  data: FeatureGridData;
  onChange: (updated: FeatureGridData) => void;
}

export function FeatureGridEditor({ data, onChange }: FeatureGridEditorProps) {
  const items = data.items || [];

  const updateField = <K extends keyof FeatureGridData>(field: K, val: FeatureGridData[K]) => {
    onChange({ ...data, [field]: val });
  };

  const addItem = () => {
    const newItem: FeatureCardItem = {
      id: `feat_${Date.now()}`,
      title: "New Feature",
      description: "Description of this capability or guarantee.",
      icon: "ShieldCheck",
    };
    updateField("items", [...items, newItem]);
  };

  const updateItem = (index: number, updatedItem: FeatureCardItem) => {
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
            placeholder="e.g. Why Global Buyers Choose Ayaan"
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
            placeholder="e.g. End-to-End Export Infrastructure"
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      {/* Column Count */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
          Grid Columns
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

      {/* Feature Cards List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
            Feature Cards ({items.length})
          </label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Plus size={13} />
            <span>Add Card</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-500 bg-zinc-50">
            No feature cards added yet. Click &quot;Add Card&quot; to highlight your advantages.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/60 hover:bg-zinc-50 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-700">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800">
                      {item.title || "Untitled Card"}
                    </span>
                  </div>
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
                      title="Delete Card"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(index, { ...item, title: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Icon Name (Lucide Icon, e.g. ShieldCheck, Truck, Clock)
                    </label>
                    <input
                      type="text"
                      value={item.icon || ""}
                      onChange={(e) => updateItem(index, { ...item, icon: e.target.value })}
                      placeholder="ShieldCheck"
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(e) => updateItem(index, { ...item, description: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black resize-y"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Optional Target Link URL
                  </label>
                  <input
                    type="text"
                    value={item.linkUrl || ""}
                    onChange={(e) => updateItem(index, { ...item, linkUrl: e.target.value })}
                    placeholder="/products or https://..."
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

