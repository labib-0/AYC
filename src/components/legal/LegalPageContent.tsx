"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck, FileText, Clock, RefreshCw } from "lucide-react";
import { LegalPage } from "@/types/settings";
import { siteSettingsService } from "@/services/site-settings.service";
import { useSiteSettings } from "@/lib/SiteSettingsContext";

interface LegalPageContentProps {
  type: "privacy_policy" | "terms_conditions";
  initialTitle: string;
}

export default function LegalPageContent({ type, initialTitle }: LegalPageContentProps) {
  const { settings } = useSiteSettings();
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPage() {
      try {
        const data = await siteSettingsService.getPublicLegalPage(type);
        if (isMounted && data) {
          setPage(data);
        }
      } catch (err) {
        console.warn(`Failed to load ${type}:`, err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadPage();
    return () => {
      isMounted = false;
    };
  }, [type]);

  const title = page?.title || initialTitle;
  const content = page?.content || "";
  const updatedAt = page?.updated_at
    ? new Date(page.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Current Policy";

  const Icon = type === "privacy_policy" ? ShieldCheck : FileText;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center space-x-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-slate-700 dark:text-slate-200 font-medium">{title}</span>
        </nav>

        {/* Page Header */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-10 mb-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon size={24} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Official commercial agreement for {settings.site_title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full w-fit">
              <Clock size={13} />
              <span>Last updated: {updatedAt}</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="mt-8">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-5/6" />
                <div className="h-20 bg-slate-200 dark:bg-white/10 rounded" />
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-6">
                {renderFormattedContent(content)}
              </div>
            )}
          </div>
        </div>

        {/* Commercial Inquiries Note */}
        <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm">
          <div>
            <span className="font-semibold text-slate-800 dark:text-white block">
              Have questions regarding our legal or commercial terms?
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Our export trade compliance department is available for verified corporate buyers.
            </span>
          </div>
          <Link
            href="/rfq"
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            Contact Export Desk
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Clean markdown-like renderer supporting headings, bullet points, bolding, and paragraphs.
 */
function renderFormattedContent(rawContent: string) {
  if (!rawContent) return null;

  const sections = rawContent.split("\n\n");

  return sections.map((section, secIdx) => {
    const trimmed = section.trim();

    // H2 Heading: ## ...
    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={secIdx}
          className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-8 mb-3 first:mt-0"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }

    // H3 Heading: ### ...
    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={secIdx}
          className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2"
        >
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
    }

    // Bullet List: lines starting with - or *
    const lines = trimmed.split("\n");
    const isBulletList = lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "));
    if (isBulletList && lines.length > 0) {
      return (
        <ul key={secIdx} className="list-disc pl-5 space-y-2 text-slate-700 dark:text-slate-300">
          {lines.map((line, lineIdx) => (
            <li key={lineIdx}>
              {formatInlineText(line.replace(/^[-*]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    // Standard Paragraph
    return (
      <p key={secIdx} className="text-slate-700 dark:text-slate-300 leading-relaxed">
        {formatInlineText(trimmed)}
      </p>
    );
  });
}

function formatInlineText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
