"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutTemplate,
  Layers,
  Settings,
  Navigation,
  Globe,
  Save,
  CheckCircle,
  Eye,
  ExternalLink,
  Archive,
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
} from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { cmsPageService } from "@/services/cms-page.service";
import { CmsPage, CmsSection, RESERVED_SLUGS } from "@/types/cms";
import { SectionListEditor } from "@/components/admin/pages/SectionListEditor";
import { PagePreviewModal } from "@/components/admin/pages/PagePreviewModal";
import { CmsImageUploader } from "@/components/admin/pages/editors/CmsImageUploader";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

type TabType = "sections" | "settings" | "navigation" | "seo";

export default function AdminCmsPageEditor() {
  const params = useParams();
  const router = useRouter();
  const pageId = params?.id as string;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [allPages, setAllPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("sections");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Editable Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [parentId, setParentId] = useState<string | number | "">("");
  const [breadcrumbLabel, setBreadcrumbLabel] = useState("");
  const [showInFooter, setShowInFooter] = useState(false);
  const [footerLabel, setFooterLabel] = useState("");
  const [footerSortOrder, setFooterSortOrder] = useState<number>(0);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [isIndexable, setIsIndexable] = useState(true);
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [scheduledUnpublishAt, setScheduledUnpublishAt] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch page details
  const loadPageData = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const [fetchedPage, allPagesRes] = await Promise.all([
        cmsPageService.getAdminPageById(pageId),
        cmsPageService.getAdminPages({ all: true }),
      ]);

      if (!fetchedPage) {
        showToast("CMS Page not found.", "error");
        setLoading(false);
        return;
      }

      setPage(fetchedPage);
      const otherPages = Array.isArray(allPagesRes)
        ? allPagesRes
        : allPagesRes?.data || [];
      setAllPages(otherPages.filter((p: CmsPage) => String(p.id) !== String(pageId)));

      // Initialize form fields
      setTitle(fetchedPage.title || "");
      setSlug(fetchedPage.slug || "");
      // Priority: draft_sections if exists and non-empty, else published sections
      const activeDraft =
        fetchedPage.draft_sections && fetchedPage.draft_sections.length > 0
          ? fetchedPage.draft_sections
          : fetchedPage.sections || [];
      setSections(JSON.parse(JSON.stringify(activeDraft)));
      setParentId(fetchedPage.parent_id || "");
      setBreadcrumbLabel(fetchedPage.breadcrumb_label || "");
      setShowInFooter(Boolean(fetchedPage.show_in_footer));
      setFooterLabel(fetchedPage.footer_label || "");
      setFooterSortOrder(fetchedPage.footer_sort_order ?? 0);
      setMetaTitle(fetchedPage.meta_title || "");
      setMetaDescription(fetchedPage.meta_description || "");
      setCanonicalUrl(fetchedPage.canonical_url || "");
      setOgImageUrl(fetchedPage.og_image_url || "");
      setIsIndexable(fetchedPage.is_indexable !== false);
      setScheduledPublishAt(fetchedPage.scheduled_publish_at ? fetchedPage.scheduled_publish_at.slice(0, 16) : "");
      setScheduledUnpublishAt(fetchedPage.scheduled_unpublish_at ? fetchedPage.scheduled_unpublish_at.slice(0, 16) : "");
      setHasUnsavedChanges(false);
    } catch (err: any) {
      showToast(err?.message || "Failed to load page.", "error");
    } finally {
      setLoading(false);
    }
  }, [pageId, showToast]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Mark changes dirty
  const handleSectionsChange = (newSections: CmsSection[]) => {
    setSections(newSections);
    setHasUnsavedChanges(true);
  };

  // Compile full page object for preview modal
  const previewPageObject: CmsPage = useMemo(() => {
    return {
      ...(page || {
        id: pageId,
        title,
        slug,
        status: "draft",
        sections,
        show_in_footer: showInFooter,
        footer_sort_order: footerSortOrder,
        is_indexable: isIndexable,
      }),
      title,
      slug,
      sections, // preview displays current draft sections
      draft_sections: sections,
      breadcrumb_label: breadcrumbLabel || null,
      show_in_footer: showInFooter,
      footer_label: footerLabel || null,
      footer_sort_order: footerSortOrder,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      canonical_url: canonicalUrl || null,
      og_image_url: ogImageUrl || null,
      is_preview: true,
    };
  }, [
    page,
    pageId,
    title,
    slug,
    sections,
    breadcrumbLabel,
    showInFooter,
    footerLabel,
    footerSortOrder,
    metaTitle,
    metaDescription,
    canonicalUrl,
    ogImageUrl,
    isIndexable,
  ]);

  // Save Draft (does NOT touch live storefront if published)
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      showToast("Page title is required.", "error");
      return;
    }

    const cleanSlug = slugify(slug || title);
    if (!cleanSlug) {
      showToast("Valid slug is required.", "error");
      return;
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      showToast(`"${cleanSlug}" is a reserved system path.`, "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<CmsPage> = {
        title: title.trim(),
        slug: cleanSlug,
        draft_sections: sections,
        parent_id: parentId ? Number(parentId) : null,
        breadcrumb_label: breadcrumbLabel.trim() || null,
        show_in_footer: showInFooter,
        footer_label: (footerLabel.trim() || title.trim()),
        footer_sort_order: Number(footerSortOrder) || 0,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        canonical_url: canonicalUrl.trim() || null,
        og_image_url: ogImageUrl.trim() || null,
        is_indexable: isIndexable,
        scheduled_publish_at: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
        scheduled_unpublish_at: scheduledUnpublishAt ? new Date(scheduledUnpublishAt).toISOString() : null,
      };

      const updated = await cmsPageService.updatePage(pageId, payload);
      setPage(updated);
      setHasUnsavedChanges(false);
      showToast("Draft changes saved successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save draft.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Publish (promotes draft_sections -> sections on live site)
  const handlePublish = async () => {
    setPublishing(true);
    try {
      // First save any current changes to draft
      await handleSaveDraft();
      // Then invoke publish endpoint
      const published = await cmsPageService.publishPage(pageId);
      setPage(published);
      setHasUnsavedChanges(false);
      showToast(`Page "${published.title}" is now LIVE on the storefront!`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to publish page.", "error");
    } finally {
      setPublishing(false);
    }
  };

  // Unpublish
  const handleUnpublish = async () => {
    try {
      const unpublished = await cmsPageService.unpublishPage(pageId);
      setPage(unpublished);
      showToast(`Page "${unpublished.title}" has been moved to draft.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to unpublish.", "error");
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
        <RefreshCw size={24} className="animate-spin text-zinc-400" />
        <span>Loading CMS page editor...</span>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-16 text-center space-y-4">
        <AlertCircle size={32} className="mx-auto text-red-500" />
        <h3 className="text-base font-bold text-zinc-900">Page Not Found</h3>
        <p className="text-xs text-zinc-500">The requested CMS page could not be located.</p>
        <Link
          href="/ayc/pages"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black rounded-lg"
        >
          <ArrowLeft size={14} />
          <span>Return to Pages</span>
        </Link>
      </div>
    );
  }

  return (
    <AdminPageGate permission={ADMIN_PERMISSIONS.PAGE_EDIT} moduleName="Edit CMS Page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Breadcrumb & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/ayc/pages"
              className="p-2 text-zinc-500 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
              title="Back to Pages List"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-zinc-900 truncate max-w-md">
                  {title || "Untitled Page"}
                </h1>
                {page.status === "published" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Draft
                  </span>
                )}
                {hasUnsavedChanges && (
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    Unsaved Draft Changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 font-mono">
                <span>https://ayaanclothing.com/{slug}</span>
                {page.status === "published" && (
                  <Link
                    href={`/${page.slug}`}
                    target="_blank"
                    className="text-zinc-400 hover:text-black inline-flex items-center gap-0.5"
                    title="Open live storefront page"
                  >
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Preview Button */}
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 shadow-sm transition-colors"
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>

            {/* Save Draft */}
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? "Saving..." : "Save Draft"}</span>
            </button>

            {/* Publish Live */}
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              <span>{publishing ? "Publishing..." : "Publish to Live"}</span>
            </button>

            {page.status === "published" && (
              <button
                type="button"
                onClick={handleUnpublish}
                className="p-2 text-zinc-400 hover:text-amber-600 rounded-lg hover:bg-zinc-100 transition-colors"
                title="Unpublish (Return to Draft)"
              >
                <Archive size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Editor Tabs Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto pb-0">
          {[
            { id: "sections", label: "Page Sections", icon: Layers, count: sections.length },
            { id: "settings", label: "General Settings", icon: Settings },
            { id: "navigation", label: "Footer & Breadcrumbs", icon: Navigation },
            { id: "seo", label: "SEO & Social", icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-black text-black bg-zinc-50/50"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Page Sections */}
        {activeTab === "sections" && (
          <SectionListEditor sections={sections} onChange={handleSectionsChange} />
        )}

        {/* Tab 2: General Settings */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
            <h3 className="text-sm font-semibold text-zinc-900">Page Identity & URL</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Changing the slug automatically records previous paths to trigger permanent 301 redirects.
                </p>
              </div>
            </div>

            {/* Parent Page for Hierarchy */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                Parent Page (Optional Hierarchy)
              </label>
              <select
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full sm:w-80 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white"
              >
                <option value="">No Parent (Root Storefront Page)</option>
                {allPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                Sets up breadcrumb navigation: Home &gt; [Parent Page] &gt; [This Page].
              </p>
            </div>

            {/* Automated Scheduling */}
            <div className="border-t border-zinc-100 pt-6 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Clock size={14} />
                <span>Publication Scheduling (Optional)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Scheduled Publish Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledPublishAt}
                    onChange={(e) => {
                      setScheduledPublishAt(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Scheduled Unpublish Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledUnpublishAt}
                    onChange={(e) => {
                      setScheduledUnpublishAt(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Navigation & Footer */}
        {activeTab === "navigation" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Dynamic Footer Placement</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure how and where this page appears in the global storefront footer column.
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <input
                id="footerToggle"
                type="checkbox"
                checked={showInFooter}
                onChange={(e) => {
                  setShowInFooter(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black"
              />
              <div>
                <label htmlFor="footerToggle" className="text-xs font-semibold text-zinc-900 cursor-pointer">
                  Display in dynamic &quot;PAGES&quot; Footer Column
                </label>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  When enabled, this link automatically joins the 3rd column of the Ayaan Clothing storefront footer.
                </p>
              </div>
            </div>

            {showInFooter && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                    Footer Display Label
                  </label>
                  <input
                    type="text"
                    value={footerLabel}
                    onChange={(e) => {
                      setFooterLabel(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder={title || "e.g. About Ayaan"}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Defaults to page title if left empty. Keep brief for clean footer styling.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                    Footer Sort Order
                  </label>
                  <input
                    type="number"
                    value={footerSortOrder}
                    onChange={(e) => {
                      setFooterSortOrder(Number(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full sm:w-32 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Items are sorted ascending (0, 10, 20...).
                  </p>
                </div>
              </div>
            )}

            {/* Breadcrumb Label */}
            <div className="border-t border-zinc-100 pt-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                Breadcrumb Label Override (Optional)
              </label>
              <input
                type="text"
                value={breadcrumbLabel}
                onChange={(e) => {
                  setBreadcrumbLabel(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder={title}
                className="w-full sm:w-80 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Label shown in top storefront breadcrumb trail: Home &gt; {breadcrumbLabel || title}.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: SEO & Social */}
        {activeTab === "seo" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">SEO & Social Graph Metadata</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Controls search engine indexing tags, OpenGraph previews, and canonical links.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder={`${title} | Ayaan Clothing`}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Summary of page content for search engines..."
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  Canonical URL (Optional)
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => {
                    setCanonicalUrl(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder={`https://ayaanclothing.com/${slug}`}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <CmsImageUploader
                  label="Social Share Image (OpenGraph / Twitter Card)"
                  value={ogImageUrl}
                  onChange={(url) => {
                    setOgImageUrl(url);
                    setHasUnsavedChanges(true);
                  }}
                  helperText="Recommended 1200x630px JPG or PNG"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="indexableCheck"
                  type="checkbox"
                  checked={isIndexable}
                  onChange={(e) => {
                    setIsIndexable(e.target.checked);
                    setHasUnsavedChanges(true);
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black"
                />
                <label htmlFor="indexableCheck" className="text-xs font-semibold text-zinc-800 cursor-pointer">
                  Allow search engines to index this page (robots: index, follow)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewOpen && (
          <PagePreviewModal
            page={previewPageObject}
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
          />
        )}

        {/* Product Toast */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
