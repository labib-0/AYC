"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  Save,
  ExternalLink,
  Info,
  Code2,
} from "lucide-react";
import { homepageService } from "@/services/homepage.service";
import { CANONICAL_DOMAIN } from "@/lib/seo/config";

interface HomepageSeoManagerProps {
  initialVerificationCode?: string | null;
  onSaveSuccess?: (newToken: string | null) => void;
  showToast: (message: string, type: "success" | "error") => void;
  disabled?: boolean;
}

/**
 * Extracts verification token if administrator pastes the full <meta> tag.
 * Rejects arbitrary HTML, scripts, or event handlers.
 */
function parseVerificationInput(input: string): {
  token: string;
  wasExtractedFromTag: boolean;
  isValid: boolean;
  errorMessage?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { token: "", wasExtractedFromTag: false, isValid: true };
  }

  const lower = trimmed.toLowerCase();
  // Reject scripts, event handlers, iframes, and dangerous markup
  if (
    lower.includes("<script") ||
    lower.includes("</script") ||
    lower.includes("<iframe") ||
    lower.includes("<img") ||
    lower.includes("<svg") ||
    lower.includes("javascript:") ||
    lower.includes("onload=") ||
    lower.includes("onerror=")
  ) {
    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage:
        "Arbitrary HTML, scripts, and event handlers are strictly prohibited for security.",
    };
  }

  // Detect and extract from exact meta tag
  const metaRegexNameFirst = /<meta\s+[^>]*name=["']google-site-verification["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i;
  const metaRegexContentFirst = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']google-site-verification["'][^>]*\/?>/i;

  if (trimmed.startsWith("<meta") || trimmed.includes("<meta")) {
    const match = trimmed.match(metaRegexNameFirst) || trimmed.match(metaRegexContentFirst);
    if (match && match[1]) {
      const extractedToken = match[1].trim();
      const tokenValid = /^[A-Za-z0-9_\-+=]{8,128}$/.test(extractedToken);
      if (!tokenValid) {
        return {
          token: extractedToken,
          wasExtractedFromTag: true,
          isValid: false,
          errorMessage:
            "Extracted token contains invalid characters or does not meet length criteria (8-128 chars).",
        };
      }
      return {
        token: extractedToken,
        wasExtractedFromTag: true,
        isValid: true,
      };
    }

    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage:
        "The pasted meta tag is not a recognized Google site verification tag. Expected: <meta name=\"google-site-verification\" content=\"YOUR_TOKEN\" />",
    };
  }

  // Raw token: must not contain HTML brackets or quotes
  if (/[<>"']/.test(trimmed)) {
    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage:
        "Invalid token format. Do not include raw HTML or quotes. Paste either the verification token or the exact <meta> tag.",
    };
  }

  const tokenValid = /^[A-Za-z0-9_\-+=]{8,128}$/.test(trimmed);
  if (!tokenValid) {
    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage:
        "Verification code must be 8-128 characters containing letters, numbers, hyphens, underscores, or plus/equals signs.",
    };
  }

  return { token: trimmed, wasExtractedFromTag: false, isValid: true };
}

export function HomepageSeoManager({
  initialVerificationCode,
  onSaveSuccess,
  showToast,
  disabled = false,
}: HomepageSeoManagerProps) {
  const [tokenInput, setTokenInput] = useState<string>("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState(false);

  // Initialize from props
  useEffect(() => {
    const current = initialVerificationCode || null;
    setSavedToken(current);
    setTokenInput(current || "");
  }, [initialVerificationCode]);

  // Parse and validate live input
  const parseResult = useMemo(() => {
    return parseVerificationInput(tokenInput);
  }, [tokenInput]);

  const isDirty = useMemo(() => {
    const currentNormalized = parseResult.isValid ? parseResult.token : tokenInput.trim();
    const savedNormalized = savedToken || "";
    return currentNormalized !== savedNormalized;
  }, [parseResult, tokenInput, savedToken]);

  // Handle paste specifically to offer smart extraction
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText && pastedText.includes("<meta")) {
      const parsed = parseVerificationInput(pastedText);
      if (parsed.wasExtractedFromTag && parsed.isValid) {
        e.preventDefault();
        setTokenInput(parsed.token);
        setExtractedNotice(true);
        setTimeout(() => setExtractedNotice(false), 4000);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenInput(e.target.value);
    if (extractedNotice) {
      setExtractedNotice(false);
    }
  };

  const handleSave = async () => {
    if (!parseResult.isValid) {
      showToast(parseResult.errorMessage || "Please enter a valid verification code.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const cleanToken = parseResult.token.trim() || null;
      const result = await homepageService.updateGoogleSearchConsoleVerification(cleanToken);
      setSavedToken(result);
      setTokenInput(result || "");
      if (onSaveSuccess) {
        onSaveSuccess(result);
      }
      showToast(
        result
          ? "Google Search Console verification code saved. Added to homepage <head>."
          : "Google Search Console verification code removed from homepage.",
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save verification code.";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!savedToken && !tokenInput) return;
    setIsSaving(true);
    try {
      await homepageService.updateGoogleSearchConsoleVerification(null);
      setSavedToken(null);
      setTokenInput("");
      if (onSaveSuccess) {
        onSaveSuccess(null);
      }
      showToast("Google Search Console verification code removed.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove verification code.";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const sitemapUrl = `${CANONICAL_DOMAIN}/sitemap.xml`;

  const handleCopySitemap = async () => {
    try {
      await navigator.clipboard.writeText(sitemapUrl);
      setCopiedSitemap(true);
      showToast("Sitemap URL copied to clipboard.", "success");
      setTimeout(() => setCopiedSitemap(false), 2500);
    } catch {
      showToast("Unable to copy to clipboard.", "error");
    }
  };

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-6 shadow-2xs space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Search size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                  SEO & Google Search Console
                </h2>
                {savedToken ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={11} />
                    Configured on Storefront
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle size={11} />
                    Not Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify site ownership in Google Search Console and inspect indexing status.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {savedToken && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isSaving || disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-red-600 hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Remove verification token from homepage head"
              >
                <Trash2 size={13} />
                <span>Remove Token</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty || !parseResult.isValid || disabled}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isDirty && parseResult.isValid
                  ? "bg-primary text-primary-foreground shadow-xs hover:opacity-95"
                  : "bg-secondary text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              <Save size={13} />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Verification Code Form Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="gsc-verification-code"
              className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>Google Search Console Verification Code</span>
              <span className="text-muted-foreground font-normal lowercase">(content attribute)</span>
            </label>
            {extractedNotice && (
              <span className="text-2xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 animate-fade-in">
                <Check size={11} />
                Extracted token from meta tag
              </span>
            )}
          </div>

          <div className="relative">
            <input
              id="gsc-verification-code"
              type="text"
              value={tokenInput}
              onChange={handleInputChange}
              onPaste={handlePaste}
              placeholder="e.g. dBwP_abc123XYZ-9876543210 or paste full <meta> tag"
              disabled={isSaving || disabled}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-secondary/50 border text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all ${
                !parseResult.isValid
                  ? "border-red-500/60 focus:ring-red-500/30"
                  : isDirty
                  ? "border-primary/50 focus:ring-primary/20"
                  : "border-border/80 focus:ring-primary/20"
              }`}
            />
          </div>

          {/* Validation Error Message */}
          {!parseResult.isValid && parseResult.errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <AlertCircle size={14} className="shrink-0" />
              <span>{parseResult.errorMessage}</span>
            </div>
          )}

          {/* Helper Text */}
          <p className="text-2xs sm:text-xs text-muted-foreground leading-relaxed">
            Paste the verification code from the <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono">content</code> attribute of the Google Search Console HTML meta tag. Save this value to add the verification tag to your public homepage.
          </p>
        </div>

        {/* Live Meta Tag Preview */}
        <div className="bg-secondary/40 rounded-xl p-3 sm:p-4 border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-2xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Code2 size={13} className="text-primary" />
              Rendered HTML in Homepage &lt;head&gt;
            </span>
            <span>App Router Metadata API</span>
          </div>
          <div className="font-mono text-2xs sm:text-xs bg-card p-2.5 rounded-lg border border-border/70 text-foreground overflow-x-auto whitespace-pre">
            {parseResult.token ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {`<meta name="google-site-verification" content="${parseResult.token}" />`}
              </span>
            ) : (
              <span className="text-muted-foreground italic">
                &lt;!-- No verification meta tag rendered when field is empty --&gt;
              </span>
            )}
          </div>
        </div>

        {/* Verification Guidance Notice */}
        <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-sky-700 dark:text-sky-300">
            <Info size={15} />
            <span>Important Verification Notice</span>
          </div>
          <p className="text-2xs sm:text-xs text-muted-foreground leading-relaxed">
            Saving this code adds the verification tag to your homepage HTML. It does <strong>not</strong> automatically complete verification. You must return to Google Search Console and click the <strong>Verify</strong> button.
          </p>
          <div className="pt-1">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-2xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <span>Open Google Search Console</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Sitemap URL Quick Copy Container */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/20 p-3 sm:p-4 rounded-xl border border-border/80">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Production XML Sitemap
                </span>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Ready for Crawling
                </span>
              </div>
              <p className="text-2xs text-muted-foreground font-mono truncate">
                {sitemapUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopySitemap}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary/70 text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              {copiedSitemap ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Sitemap URL</span>
                </>
              )}
            </button>
          </div>
          <p className="text-2xs text-muted-foreground mt-1.5 px-1">
            Submit this sitemap under <strong>Sitemaps</strong> in Google Search Console to accelerate discovery of your homepage, catalog, and published product catalog.
          </p>
        </div>
      </div>
    </section>
  );
}
