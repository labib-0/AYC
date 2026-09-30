"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Save,
  AlertCircle,
  ExternalLink,
  Eye,
  Edit3,
  RefreshCw,
  Clock,
} from "lucide-react";
import { siteSettingsService } from "@/services/site-settings.service";
import { LegalPage } from "@/types/settings";

interface LegalPagesAdminSettingsProps {
  onNotify: (message: string) => void;
}

export default function LegalPagesAdminSettings({ onNotify }: LegalPagesAdminSettingsProps) {
  const [activeType, setActiveType] = useState<"privacy_policy" | "terms_conditions">(
    "privacy_policy"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active page state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // View mode: 'edit' or 'preview'
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const loadLegalPage = async (type: "privacy_policy" | "terms_conditions") => {
    setLoading(true);
    setError(null);
    try {
      const data = await siteSettingsService.getAdminLegalPage(type);
      if (data) {
        setTitle(data.title || (type === "privacy_policy" ? "Privacy Policy" : "Terms & Conditions"));
        setContent(data.content || "");
        setIsActive(data.is_active !== false);
        setUpdatedAt(data.updated_at || null);
      }
    } catch (err: unknown) {
      console.warn("Notice: Failed to fetch legal page, loading fallback template.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegalPage(activeType);
  }, [activeType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Page title is required.");
      return;
    }

    if (!content.trim()) {
      setError("Content cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const updated = await siteSettingsService.updateAdminLegalPage(activeType, {
        title: title.trim(),
        content: content.trim(),
        is_active: isActive,
      });
      setUpdatedAt(updated.updated_at || new Date().toISOString());
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
      onNotify(`${title} content saved and published to storefront.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update legal page.");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = activeType === "privacy_policy" ? "/privacy-policy" : "/terms-and-conditions";

  return (
    <div className="space-y-6">
      {/* Subtabs for Legal Pages */}
      <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl border border-border/60 w-fit">
        <button
          type="button"
          onClick={() => setActiveType("privacy_policy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeType === "privacy_policy"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck size={14} className={activeType === "privacy_policy" ? "text-primary" : ""} />
          <span>Privacy Policy</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveType("terms_conditions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeType === "terms_conditions"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={14} className={activeType === "terms_conditions" ? "text-primary" : ""} />
          <span>Terms &amp; Conditions</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Notice</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 bg-card border border-border/80 rounded-2xl space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>{title || "Legal Document Editor"}</span>
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Storefront Route:</span>
                  <Link
                    href={publicUrl}
                    target="_blank"
                    className="text-primary hover:underline flex items-center gap-1 font-mono font-medium"
                  >
                    <span>{publicUrl}</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              {/* Status and Last Updated */}
              <div className="flex items-center gap-3">
                {updatedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-lg">
                    <Clock size={12} />
                    <span>
                      Updated: {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  {isActive ? "Published" : "Draft / Hidden"}
                </button>
              </div>
            </div>

            {/* Document Title */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
              />
            </div>

            {/* Editor Toolbar with Edit / Live Preview Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Document Content (Markdown / Structured Text)
                </label>
                <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode("edit")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "edit"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit3 size={13} />
                    <span>Edit Source</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "preview"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye size={13} />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>

              {viewMode === "edit" ? (
                <div className="space-y-2">
                  <textarea
                    rows={16}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter legal terms using markdown headings (## Heading 2) and paragraphs..."
                    className="w-full p-4 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary leading-relaxed resize-y"
                  />
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>
                      Supports standard markdown: <code className="bg-secondary px-1 py-0.5 rounded">## Heading</code>,{" "}
                      <code className="bg-secondary px-1 py-0.5 rounded">- bullet list</code>, and{" "}
                      <code className="bg-secondary px-1 py-0.5 rounded">**bold**</code>.
                    </span>
                    <span>{content.length} characters</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-border bg-background min-h-[300px] max-h-[500px] overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">
                  <div className="border-b border-border pb-3 mb-4">
                    <span className="text-lg font-bold text-foreground block">{title}</span>
                    <span className="text-[11px] text-muted-foreground">Storefront Customer View Simulation</span>
                  </div>
                  {content.split("\n\n").map((chunk, i) => {
                    const trimmed = chunk.trim();
                    if (trimmed.startsWith("## ")) {
                      return (
                        <h2 key={i} className="text-sm sm:text-base font-bold text-foreground mt-4 mb-2">
                          {trimmed.replace(/^##\s+/, "")}
                        </h2>
                      );
                    }
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                      return (
                        <ul key={i} className="list-disc pl-5 space-y-1">
                          {trimmed.split("\n").map((line, j) => (
                            <li key={j}>{line.replace(/^[-*]\s+/, "")}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={i} className="text-muted-foreground">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving Document...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save &amp; Publish {title}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
