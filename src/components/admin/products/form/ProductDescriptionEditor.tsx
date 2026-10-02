"use client";

import React, { useState, useRef, useCallback } from "react";
import { Bold, Italic, Eye, Edit3 } from "lucide-react";
import { applyFormatting, renderFormattedProductDescription } from "@/lib/product-description";

export interface ProductDescriptionEditorProps {
  id?: string;
  value: string;
  onChange: (e: { target: { value: string } } | any) => void;
  disabled?: boolean;
}

export default function ProductDescriptionEditor({
  id = "product-description-textarea",
  value,
  onChange,
  disabled = false,
}: ProductDescriptionEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const triggerChange = useCallback(
    (nextVal: string) => {
      if (typeof onChange === "function") {
        onChange({ target: { value: nextVal } });
      }
    },
    [onChange]
  );

  const handleFormat = useCallback(
    (format: "bold" | "italic") => {
      const textarea = textareaRef.current;
      if (!textarea || disabled) return;

      const { nextValue, selectionStart, selectionEnd } = applyFormatting(
        textarea,
        format
      );

      triggerChange(nextValue);

      // Re-focus and set selection range after React state flush
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
        }
      });
    },
    [onChange, disabled]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    // Handle Ctrl+B / Cmd+B for bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      handleFormat("bold");
    }

    // Handle Ctrl+I / Cmd+I for italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      handleFormat("italic");
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="w-full space-y-2">
      {/* Editor Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="product-description-textarea"
          className="block text-xs font-bold uppercase tracking-wider text-foreground"
        >
          Product Description
        </label>

        {/* Toolbar & Tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Formatting Buttons (only when in Write mode) */}
          {activeTab === "write" && (
            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/80">
              <button
                type="button"
                onClick={() => handleFormat("bold")}
                disabled={disabled}
                title="Bold (Ctrl+B)"
                aria-label="Format bold text"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-foreground hover:bg-card hover:shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Bold size={13} strokeWidth={2.6} />
                <span className="text-[11px] font-bold">B</span>
              </button>
              <button
                type="button"
                onClick={() => handleFormat("italic")}
                disabled={disabled}
                title="Italic (Ctrl+I)"
                aria-label="Format italic text"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-card hover:shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Italic size={13} strokeWidth={2.4} />
                <span className="text-[11px] italic font-semibold">I</span>
              </button>
            </div>
          )}

          {/* Write / Preview Tab Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-secondary/60 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "write"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 size={12} />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "preview"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="w-full">
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            id={id}
            data-testid={id}
            rows={8}
            value={value}
            disabled={disabled}
            onChange={(e) => triggerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Detailed wholesale product description, fabric specs, construction details, and stitch finish..."
            className="w-full min-h-[220px] sm:min-h-[260px] p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors leading-relaxed resize-y"
          />
        ) : (
          <div
            id="product-description-preview"
            data-testid="product-description-preview"
            className="w-full min-h-[220px] sm:min-h-[260px] p-4 sm:p-5 rounded-2xl border border-border/80 bg-secondary/15 text-xs sm:text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words"
          >
            {value && value.trim().length > 0 ? (
              renderFormattedProductDescription(value)
            ) : (
              <span className="text-muted-foreground italic">
                No description provided yet. Click &quot;Write&quot; to begin writing your product description.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Guidance & Counts */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-1 gap-2">
        <span className="flex items-center gap-1">
          Supports <code className="bg-secondary px-1 py-0.5 rounded font-mono text-[10px]">**bold**</code> and <code className="bg-secondary px-1 py-0.5 rounded font-mono text-[10px]">*italic*</code> formatting. All line breaks &amp; paragraphs are preserved.
        </span>
        <div className="tabular-nums font-medium">
          {wordCount} {wordCount === 1 ? "word" : "words"} &bull; {charCount} chars
        </div>
      </div>
    </div>
  );
}
