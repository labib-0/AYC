"use client";

import React from "react";
import { FaqAccordionData, FaqAccordionItem } from "@/types/cms";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface FaqAccordionEditorProps {
  data: FaqAccordionData;
  onChange: (updated: FaqAccordionData) => void;
}

export function FaqAccordionEditor({ data, onChange }: FaqAccordionEditorProps) {
  const items = data.items || [];

  const updateField = <K extends keyof FaqAccordionData>(field: K, val: FaqAccordionData[K]) => {
    onChange({ ...data, [field]: val });
  };

  const addItem = () => {
    const newItem: FaqAccordionItem = {
      id: `faq_${Date.now()}`,
      question: "Frequently Asked Question?",
      answer: "Detailed answer explaining wholesale terms, lead times, or procedures.",
    };
    updateField("items", [...items, newItem]);
  };

  const updateItem = (index: number, updatedItem: FaqAccordionItem) => {
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
            placeholder="e.g. Frequently Asked Questions"
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
            placeholder="e.g. Everything you need to know about bulk orders"
            className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      {/* Q&A Items */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
            Questions & Answers ({items.length})
          </label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Plus size={13} />
            <span>Add Question</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-500 bg-zinc-50">
            No questions added yet. Click &quot;Add Question&quot; to build your FAQ accordion.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/60 hover:bg-zinc-50 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-700 shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800 truncate">
                      {item.question || "Untitled Question"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                      title="Delete Question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Question
                  </label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateItem(index, { ...item, question: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Answer (HTML or Plain Text)
                  </label>
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(e) => updateItem(index, { ...item, answer: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-black resize-y leading-relaxed"
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

