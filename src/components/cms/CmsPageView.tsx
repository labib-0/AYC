"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Clock, Eye } from "lucide-react";
import { CmsPage } from "@/types/cms";
import CmsSectionRenderer from "./CmsSectionRenderer";
import StorefrontBreadcrumbs from "@/components/common/StorefrontBreadcrumbs";
import { buildCmsBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/config";

interface CmsPageViewProps {
  page: CmsPage;
}

export default function CmsPageView({ page }: CmsPageViewProps) {
  const sections = (page.sections || []).filter((s) => s.is_visible !== false);
  const hasHeroBanner = sections.length > 0 && sections[0].type === "hero_banner";

  const { crumbs, jsonLdItems } = buildCmsBreadcrumbs(page);

  // WebPage Schema.org JSON-LD
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.meta_title || page.title,
    description: page.meta_description || undefined,
    url: absoluteUrl(`/${page.slug}`),
    datePublished: page.published_at || undefined,
    dateModified: page.updated_at || undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: jsonLdItems.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <article className="min-h-screen bg-background text-foreground flex flex-col">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Draft Preview Indicator Banner */}
      {page.is_preview && (
        <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Eye size={16} />
            <span>ADMIN DRAFT PREVIEW — This unpublished draft is visible only to authorized administrators.</span>
          </div>
          <Link
            href={`/ayc/pages/${page.id}`}
            className="px-2.5 py-1 bg-slate-950 text-white rounded-md text-[11px] hover:bg-slate-800 transition-colors"
          >
            Return to Editor
          </Link>
        </div>
      )}

      {/* Top Breadcrumb Navigation */}
      <div className="w-full bg-background border-b border-border/40 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <StorefrontBreadcrumbs items={crumbs} className="mb-0" />
        </div>
      </div>

      {/* Standard Header if no hero banner is present */}
      {!hasHeroBanner && (
        <header className="w-full bg-secondary/15 border-b border-border/60 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight mb-4">
              {page.title}
            </h1>
            {page.meta_description && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {page.meta_description}
              </p>
            )}
          </div>
        </header>
      )}

      {/* Render Page Sections in Saved Sequence */}
      <main className="flex-1 w-full">
        {sections.length > 0 ? (
          sections.map((section, idx) => (
            <CmsSectionRenderer key={section.id || `sec-${idx}`} section={section} />
          ))
        ) : (
          <div className="py-20 text-center text-muted-foreground text-sm">
            <p>This page currently has no published content sections.</p>
          </div>
        )}
      </main>
    </article>
  );
}

