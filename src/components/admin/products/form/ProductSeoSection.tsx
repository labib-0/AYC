"use client";

import React, { useState } from "react";
import { Search, X, Tag, Plus } from "lucide-react";

interface ProductSeoSectionProps {
  seoTitle: string;
  seoDescription: string;
  keywords?: string[];
  productName: string;
  slug: string;
  onSeoTitleChange: (val: string) => void;
  onSeoDescriptionChange: (val: string) => void;
  onKeywordsChange?: (val: string[]) => void;
}

const MAX_KEYWORDS = 15;
const MAX_KEYWORD_LENGTH = 50;

export default function ProductSeoSection({
  seoTitle,
  seoDescription,
  keywords = [],
  productName,
  slug,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onKeywordsChange,
}: ProductSeoSectionProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const displayTitle = seoTitle || productName || "Product Title Preview";
  const displaySlug = slug || "product-url-slug";
  const displayDesc =
    seoDescription ||
    "Discover premium wholesale apparel from Ayaan Clothing. High quality fabric with custom branding available.";

  const handleAddKeyword = (rawText: string) => {
    setInputError(null);
    const cleaned = rawText.trim().replace(/^,+|,+$/g, "");
    if (!cleaned) return;

    if (keywords.length >= MAX_KEYWORDS) {
      setInputError(`Maximum of ${MAX_KEYWORDS} SEO keywords allowed.`);
      return;
    }

    if (cleaned.length > MAX_KEYWORD_LENGTH) {
      setInputError(`Keyword must be ${MAX_KEYWORD_LENGTH} characters or less.`);
      return;
    }

    const lower = cleaned.toLowerCase();
    if (keywords.some((k) => k.toLowerCase() === lower)) {
      setInputError("Keyword is already added.");
      return;
    }

    const updated = [...keywords, cleaned];
    onKeywordsChange?.(updated);
    setKeywordInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddKeyword(keywordInput);
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    const updated = keywords.filter((_, i) => i !== indexToRemove);
    onKeywordsChange?.(updated);
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          Search Engine Optimization (SEO)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Control organic search titles, meta descriptions, and Google snippet appearance.
        </p>
      </div>

      <div className="space-y-4">
        {/* Search Engine Snippet Preview */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Search size={12} /> Google Search Preview
          </div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
            {displayTitle} | Ayaan Clothing
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
            https://ayaanclothing.com/products/{displaySlug}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {displayDesc}
          </p>
        </div>

        {/* SEO Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              SEO Page Title
            </label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {seoTitle.length} / 60 chars
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder={productName || "Leave empty to use Product Name"}
            className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors"
          />
        </div>

        {/* SEO Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Meta Description
            </label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {seoDescription.length} / 160 chars
            </span>
          </div>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="Brief summary for search engine results..."
            className="w-full p-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors resize-y leading-relaxed"
          />
        </div>

        {/* SEO Keywords (Phase 2 & Phase 25) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              SEO Keywords
            </label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {keywords.length} / {MAX_KEYWORDS} terms
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2 leading-normal">
            Add relevant search terms that describe this product. Use natural, specific phrases rather than repeating the same keyword.
          </p>

          {/* Tag Chips Display */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {keywords.map((kw, idx) => (
                <span
                  key={`${kw}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border/80 text-xs font-medium text-foreground"
                >
                  <Tag size={11} className="text-muted-foreground" />
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(idx)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-0.5"
                    aria-label={`Remove keyword ${kw}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Keyword Input & Add Button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => {
                setKeywordInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type keyword and press Enter or comma..."
              disabled={keywords.length >= MAX_KEYWORDS}
              className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleAddKeyword(keywordInput)}
              disabled={!keywordInput.trim() || keywords.length >= MAX_KEYWORDS}
              className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold uppercase tracking-wider text-foreground inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          {inputError && (
            <p className="text-[11px] text-destructive font-medium mt-1.5">
              {inputError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
