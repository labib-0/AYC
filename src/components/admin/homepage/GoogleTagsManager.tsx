"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Code2,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Info,
  FileCode2,
  Terminal,
} from "lucide-react";
import { homepageService } from "@/services/homepage.service";
import { ApiError } from "@/services/api-client";

interface GoogleTagsManagerProps {
  initialHeadCode?: string | null;
  initialBodyCode?: string | null;
  onSaveSuccess?: (headCode: string | null, bodyCode: string | null) => void;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

const MAX_SNIPPET_BYTES = 65536; // 64 KB limit

export function GoogleTagsManager({
  initialHeadCode,
  initialBodyCode,
  onSaveSuccess,
  showToast,
  disabled = false,
}: GoogleTagsManagerProps) {
  // Saved server state
  const [savedHeadCode, setSavedHeadCode] = useState<string>(initialHeadCode || "");
  const [savedBodyCode, setSavedBodyCode] = useState<string>(initialBodyCode || "");

  // Working draft state
  const [headCode, setHeadCode] = useState<string>(initialHeadCode || "");
  const [bodyCode, setBodyCode] = useState<string>(initialBodyCode || "");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"head" | "body">("head");

  // Load initial tags from API on mount
  useEffect(() => {
    let mounted = true;
    const fetchTags = async () => {
      try {
        setIsLoading(true);
        const res = await homepageService.getGoogleTags();
        if (!mounted) return;
        const loadedHead = res.head_code || "";
        const loadedBody = res.body_code || "";
        setSavedHeadCode(loadedHead);
        setSavedBodyCode(loadedBody);
        setHeadCode((prev) => (prev === (initialHeadCode || "") ? loadedHead : prev));
        setBodyCode((prev) => (prev === (initialBodyCode || "") ? loadedBody : prev));
      } catch {
        if (!mounted) return;
        const h = initialHeadCode || "";
        const b = initialBodyCode || "";
        setSavedHeadCode(h);
        setSavedBodyCode(b);
        setHeadCode((prev) => (prev === "" ? h : prev));
        setBodyCode((prev) => (prev === "" ? b : prev));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchTags();

    return () => {
      mounted = false;
    };
  }, [initialHeadCode, initialBodyCode]);

  // Byte size calculations
  const headBytes = useMemo(() => new Blob([headCode]).size, [headCode]);
  const bodyBytes = useMemo(() => new Blob([bodyCode]).size, [bodyCode]);

  const isHeadOversized = headBytes > MAX_SNIPPET_BYTES;
  const isBodyOversized = bodyBytes > MAX_SNIPPET_BYTES;
  const hasOversizedField = isHeadOversized || isBodyOversized;

  // Dirty detection
  const isHeadDirty = headCode !== savedHeadCode;
  const isBodyDirty = bodyCode !== savedBodyCode;
  const isDirty = isHeadDirty || isBodyDirty;

  // Configured detection
  const isHeadConfigured = savedHeadCode.trim().length > 0;
  const isBodyConfigured = savedBodyCode.trim().length > 0;
  const isAnyConfigured = isHeadConfigured || isBodyConfigured;

  // Reset to last saved server state
  const handleReset = (scope: "all" | "head" | "body" = "all") => {
    if (scope === "head") {
      setHeadCode(savedHeadCode);
      showToast("Unsaved Head Code changes reverted.", "success");
    } else if (scope === "body") {
      setBodyCode(savedBodyCode);
      showToast("Unsaved Body Code changes reverted.", "success");
    } else {
      setHeadCode(savedHeadCode);
      setBodyCode(savedBodyCode);
      showToast("Unsaved changes reset to last saved state.", "success");
    }
  };

  // Helper to extract diagnostic message from error
  const extractErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) {
      if (err.errors) {
        const detailMsgs = Object.values(err.errors).flat().join(" ");
        if (detailMsgs) return detailMsgs;
      }
      return err.message || fallback;
    }
    if (err instanceof Error) {
      return err.message || fallback;
    }
    return fallback;
  };

  // Clear single snippet
  const handleClearSnippet = async (scope: "head" | "body") => {
    const label = scope === "head" ? "Head Code" : "Body Code";
    if (!window.confirm(`Are you sure you want to remove the ${label} tracking snippet?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = scope === "head" ? { head_code: null } : { body_code: null };
      const res = await homepageService.updateGoogleTags(payload);
      if (scope === "head") {
        const newHead = res.head_code || "";
        setSavedHeadCode(newHead);
        setHeadCode(newHead);
      } else {
        const newBody = res.body_code || "";
        setSavedBodyCode(newBody);
        setBodyCode(newBody);
      }

      if (onSaveSuccess) {
        onSaveSuccess(res.head_code, res.body_code);
      }
      showToast(`${label} snippet removed successfully.`, "success");
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, `Failed to remove ${label} snippet.`), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all snippets
  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to remove all Google tracking codes? This will immediately disable tracking on the public storefront.")) {
      return;
    }

    setIsSaving(true);
    try {
      await homepageService.updateGoogleTags({ head_code: null, body_code: null });
      setSavedHeadCode("");
      setSavedBodyCode("");
      setHeadCode("");
      setBodyCode("");
      if (onSaveSuccess) {
        onSaveSuccess(null, null);
      }
      showToast("Google tracking snippets removed successfully.", "success");
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, "Failed to remove Google tracking snippets."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save changes
  const handleSave = async (scope: "all" | "head" | "body" = "all") => {
    if (scope === "head" && isHeadOversized) {
      showToast("Head Code exceeds the maximum permitted size of 64 KB.", "error");
      return;
    }
    if (scope === "body" && isBodyOversized) {
      showToast("Body Code exceeds the maximum permitted size of 64 KB.", "error");
      return;
    }
    if (scope === "all" && hasOversizedField) {
      showToast("One or more snippets exceed the maximum permitted size of 64 KB.", "error");
      return;
    }

    setIsSaving(true);
    try {
      let payload: { head_code?: string | null; body_code?: string | null } = {};

      if (scope === "head") {
        payload = { head_code: headCode.trim() ? headCode : null };
      } else if (scope === "body") {
        payload = { body_code: bodyCode.trim() ? bodyCode : null };
      } else {
        // If only one field is dirty, update only that field to guarantee independent preservation
        if (isHeadDirty && !isBodyDirty) {
          payload = { head_code: headCode.trim() ? headCode : null };
        } else if (isBodyDirty && !isHeadDirty) {
          payload = { body_code: bodyCode.trim() ? bodyCode : null };
        } else {
          payload = {
            head_code: headCode.trim() ? headCode : null,
            body_code: bodyCode.trim() ? bodyCode : null,
          };
        }
      }

      const res = await homepageService.updateGoogleTags(payload);
      const newHead = res.head_code || "";
      const newBody = res.body_code || "";

      setSavedHeadCode(newHead);
      setSavedBodyCode(newBody);
      setHeadCode(newHead);
      setBodyCode(newBody);

      if (onSaveSuccess) {
        onSaveSuccess(res.head_code, res.body_code);
      }
      showToast("Google tags and tracking settings saved successfully.", "success");
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, "Failed to save Google tracking snippets."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-6 shadow-2xs space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Code2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                  Google Tags &amp; Tracking
                </h2>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {isHeadConfigured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit shrink-0">
                      <CheckCircle2 size={10} />
                      Head: Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-muted text-muted-foreground border border-border w-fit shrink-0">
                      Head: Empty
                    </span>
                  )}
                  {isBodyConfigured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit shrink-0">
                      <CheckCircle2 size={10} />
                      Body: Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-muted text-muted-foreground border border-border w-fit shrink-0">
                      Body: Empty
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 sm:mt-0.5">
                Configure Google tag (gtag.js), Google Analytics 4, and Google Tag Manager snippets without editing source code.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 w-full sm:w-auto">
            {isDirty && (
              <button
                type="button"
                onClick={() => handleReset("all")}
                disabled={isSaving || disabled}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
                title="Cancel and revert unsaved changes"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}

            {isAnyConfigured && !isDirty && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isSaving || disabled}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-red-600 hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
                title="Clear both tracking snippets"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave("all")}
              disabled={isSaving || !isDirty || hasOversizedField || disabled}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-1 sm:flex-none ${
                isDirty && !hasOversizedField
                  ? "bg-primary text-primary-foreground shadow-xs hover:opacity-95"
                  : "bg-secondary text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security & Isolation Notice */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3.5 flex items-start gap-3">
          <div className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert size={16} />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-300">
              Privileged Storefront Executable Configuration
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Tracking snippets configured here are injected directly into the public storefront HTML document.
              To preserve administrative security, scripts are strictly isolated and <strong>never executed</strong> inside the admin control panel.
              Only authorized super-administrators can edit these settings.
            </p>
          </div>
        </div>

        {/* Editor Tab Navigation */}
        <div className="flex border-b border-border/70 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab("head")}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "head"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal size={14} />
            <span>Head Code (&lt;head&gt;)</span>
            {headCode.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("body")}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "body"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode2 size={14} />
            <span>Body Code (&lt;body&gt;)</span>
            {bodyCode.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Field 1: Head Code Editor */}
        {activeTab === "head" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="google-tag-head-code"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <span>Head Code</span>
                  <span className="text-2xs font-normal text-muted-foreground">(&lt;head&gt;)</span>
                </label>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Paste Google tag, Google Analytics, Google Tag Manager, or other approved tracking code intended for the HTML &lt;head&gt; section.
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xs font-mono font-medium ${
                    isHeadOversized ? "text-red-500 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {headBytes.toLocaleString()} / {MAX_SNIPPET_BYTES.toLocaleString()} bytes
                </span>
              </div>
            </div>

            <div className="relative rounded-xl border border-border/80 bg-zinc-950 dark:bg-zinc-950/80 overflow-hidden focus-within:border-primary/80 transition-colors">
              <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-2xs text-zinc-400 font-mono flex items-center justify-between">
                <span>HTML / JavaScript</span>
                <span>{headCode.split("\n").length} lines</span>
              </div>
              <textarea
                id="google-tag-head-code"
                rows={9}
                value={headCode}
                onChange={(e) => setHeadCode(e.target.value)}
                disabled={isLoading || isSaving || disabled}
                placeholder={`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXXXXX');\n</script>`}
                className="w-full p-3 bg-transparent text-emerald-400 dark:text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-emerald-500/30 selection:text-white"
                spellCheck={false}
              />
            </div>
            {isHeadOversized && (
              <p className="text-2xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                Snippet exceeds 64 KB limit ({headBytes} bytes). Please trim unnecessary whitespace or comments.
              </p>
            )}

            {/* Tab-level Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave("head")}
                  disabled={isSaving || !isHeadDirty || isHeadOversized || disabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isHeadDirty && !isHeadOversized
                      ? "bg-primary text-primary-foreground shadow-xs hover:opacity-95"
                      : "bg-secondary text-muted-foreground opacity-60 cursor-not-allowed"
                  }`}
                >
                  <Save size={12} />
                  <span>Save Head Code</span>
                </button>
                {isHeadDirty && (
                  <button
                    type="button"
                    onClick={() => handleReset("head")}
                    disabled={isSaving || disabled}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-medium transition-all cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Revert</span>
                  </button>
                )}
              </div>
              {savedHeadCode.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearSnippet("head")}
                  disabled={isSaving || disabled}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 size={12} />
                  <span>Clear Head Code</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Field 2: Body Code Editor */}
        {activeTab === "body" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="google-tag-body-code"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <span>Body Code</span>
                  <span className="text-2xs font-normal text-muted-foreground">(&lt;body&gt;)</span>
                </label>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Paste tracking or Google Tag Manager fallback code intended immediately after the opening &lt;body&gt; tag.
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xs font-mono font-medium ${
                    isBodyOversized ? "text-red-500 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {bodyBytes.toLocaleString()} / {MAX_SNIPPET_BYTES.toLocaleString()} bytes
                </span>
              </div>
            </div>

            <div className="relative rounded-xl border border-border/80 bg-zinc-950 dark:bg-zinc-950/80 overflow-hidden focus-within:border-primary/80 transition-colors">
              <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-2xs text-zinc-400 font-mono flex items-center justify-between">
                <span>HTML / Fallback</span>
                <span>{bodyCode.split("\n").length} lines</span>
              </div>
              <textarea
                id="google-tag-body-code"
                rows={7}
                value={bodyCode}
                onChange={(e) => setBodyCode(e.target.value)}
                disabled={isLoading || isSaving || disabled}
                placeholder={`<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->`}
                className="w-full p-3 bg-transparent text-emerald-400 dark:text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-emerald-500/30 selection:text-white"
                spellCheck={false}
              />
            </div>
            {isBodyOversized && (
              <p className="text-2xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                Snippet exceeds 64 KB limit ({bodyBytes} bytes). Please trim unnecessary whitespace or comments.
              </p>
            )}

            {/* Tab-level Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave("body")}
                  disabled={isSaving || !isBodyDirty || isBodyOversized || disabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isBodyDirty && !isBodyOversized
                      ? "bg-primary text-primary-foreground shadow-xs hover:opacity-95"
                      : "bg-secondary text-muted-foreground opacity-60 cursor-not-allowed"
                  }`}
                >
                  <Save size={12} />
                  <span>Save Body Code</span>
                </button>
                {isBodyDirty && (
                  <button
                    type="button"
                    onClick={() => handleReset("body")}
                    disabled={isSaving || disabled}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-medium transition-all cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Revert</span>
                  </button>
                )}
              </div>
              {savedBodyCode.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearSnippet("body")}
                  disabled={isSaving || disabled}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 size={12} />
                  <span>Clear Body Code</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Integration Instructions */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-2xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Info size={13} className="text-sky-500" />
            <span>Usage &amp; Deployment Guidelines</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            <li>Paste complete snippets exactly as provided by Google (including &lt;script&gt; and &lt;noscript&gt; tags).</li>
            <li>Changes take effect immediately on the public storefront without requiring server restarts or rebuilds.</li>
            <li>Both fields are completely independent; saving one preserves the other unchanged.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default GoogleTagsManager;
