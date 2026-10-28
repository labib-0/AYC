"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Archive,
  CheckCircle,
  Eye,
  RefreshCw,
  LayoutTemplate,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  MoreVertical,
  Check,
  X,
} from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { cmsPageService } from "@/services/cms-page.service";
import { CmsPage, CmsPageStatus } from "@/types/cms";
import { PagePreviewModal } from "@/components/admin/pages/PagePreviewModal";

export default function AdminCmsPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CmsPageStatus>("all");
  const [footerFilter, setFooterFilter] = useState<"all" | "in_footer">("all");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Preview Modal
  const [previewPage, setPreviewPage] = useState<CmsPage | null>(null);

  // Delete Confirmation Modal
  const [deletingPage, setDeletingPage] = useState<CmsPage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cmsPageService.getAdminPages({ all: true });
      const items = Array.isArray(res) ? res : res?.data || [];
      setPages(items);
    } catch (err: any) {
      showToast(err?.message || "Failed to load CMS pages.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await cmsPageService.getAdminPages({ all: true, forceFresh: true });
      const items = Array.isArray(res) ? res : res?.data || [];
      setPages(items);
      showToast("Pages refreshed.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to refresh pages.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePublish = async (page: CmsPage) => {
    try {
      const updated = await cmsPageService.publishPage(page.id);
      setPages((prev) => prev.map((p) => (p.id === page.id ? updated : p)));
      showToast(`Page "${page.title}" published to live storefront.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to publish page.", "error");
    }
  };

  const handleUnpublish = async (page: CmsPage) => {
    try {
      const updated = await cmsPageService.unpublishPage(page.id);
      setPages((prev) => prev.map((p) => (p.id === page.id ? updated : p)));
      showToast(`Page "${page.title}" moved to draft status.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to unpublish page.", "error");
    }
  };

  const handleArchive = async (page: CmsPage) => {
    try {
      const updated = await cmsPageService.archivePage(page.id);
      setPages((prev) => prev.map((p) => (p.id === page.id ? updated : p)));
      showToast(`Page "${page.title}" archived.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to archive page.", "error");
    }
  };

  const handleToggleFooter = async (page: CmsPage) => {
    try {
      const nextShowInFooter = !page.show_in_footer;
      const updated = await cmsPageService.updateFooterSettings(page.id, {
        show_in_footer: nextShowInFooter,
        footer_label: page.footer_label || page.title,
        footer_sort_order: page.footer_sort_order || 0,
      });
      setPages((prev) => prev.map((p) => (p.id === page.id ? updated : p)));
      showToast(
        nextShowInFooter
          ? `Added "${page.title}" to dynamic footer Pages column.`
          : `Removed "${page.title}" from footer.`,
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to update footer placement.", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;
    setIsDeleting(true);
    try {
      await cmsPageService.deletePage(deletingPage.id);
      setPages((prev) => prev.filter((p) => p.id !== deletingPage.id));
      showToast(`Page "${deletingPage.title}" deleted.`, "success");
      setDeletingPage(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete page.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      if (statusFilter !== "all" && page.status !== statusFilter) return false;
      if (footerFilter === "in_footer" && !page.show_in_footer) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = page.title.toLowerCase().includes(q);
        const matchSlug = page.slug.toLowerCase().includes(q);
        if (!matchTitle && !matchSlug) return false;
      }
      return true;
    });
  }, [pages, statusFilter, footerFilter, search]);

  return (
    <AdminPageGate permission={ADMIN_PERMISSIONS.PAGE_VIEW} moduleName="CMS Pages">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-zinc-900 text-white">
                <LayoutTemplate size={20} />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                Page Builder / CMS
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Create, customize, and manage standalone storefront pages, structured content, and dynamic footer links.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            <Link
              href="/ayc/pages/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={15} />
              <span>Create New Page</span>
            </Link>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by page title or slug..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-zinc-50/50 focus:bg-white transition-colors"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  { key: "all", label: "All Pages" },
                  { key: "published", label: "Published" },
                  { key: "draft", label: "Drafts" },
                  { key: "archived", label: "Archived" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    statusFilter === tab.key
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {tab.label}
                  {tab.key === "all" ? (
                    <span className="ml-1.5 text-[10px] opacity-70">({pages.length})</span>
                  ) : (
                    <span className="ml-1.5 text-[10px] opacity-70">
                      ({pages.filter((p) => p.status === tab.key).length})
                    </span>
                  )}
                </button>
              ))}

              <div className="h-4 w-px bg-zinc-200 mx-1" />

              <button
                type="button"
                onClick={() => setFooterFilter(footerFilter === "all" ? "in_footer" : "all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors border ${
                  footerFilter === "in_footer"
                    ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                In Footer Pages Only
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw size={20} className="animate-spin text-zinc-400" />
              <span>Loading CMS pages...</span>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="p-12 text-center">
              <LayoutTemplate size={36} className="mx-auto text-zinc-300 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-800">No CMS pages found</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-4">
                {search || statusFilter !== "all" || footerFilter !== "all"
                  ? "Try adjusting your filters or search keywords."
                  : "Get started by building your first storefront landing page."}
              </p>
              <Link
                href="/ayc/pages/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm"
              >
                <Plus size={14} />
                <span>Create New Page</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4">Title & Slug</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sections</th>
                    <th className="py-3 px-4">Footer Placement</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {filteredPages.map((page) => {
                    const sectionsCount = (page.draft_sections || page.sections || []).length;
                    return (
                      <tr key={page.id} className="hover:bg-zinc-50/80 transition-colors group">
                        {/* Title & Slug */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <Link
                              href={`/ayc/pages/${page.id}`}
                              className="font-semibold text-zinc-900 hover:text-black hover:underline"
                            >
                              {page.title}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-400 font-mono text-[11px]">
                              <span>/{page.slug}</span>
                              {page.status === "published" && (
                                <Link
                                  href={`/${page.slug}`}
                                  target="_blank"
                                  className="text-zinc-400 hover:text-black inline-flex items-center gap-0.5"
                                  title="Open live storefront page in new tab"
                                >
                                  <ExternalLink size={11} />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {page.status === "published" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Published
                            </span>
                          ) : page.status === "draft" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                              Archived
                            </span>
                          )}
                        </td>

                        {/* Sections count */}
                        <td className="py-3.5 px-4 text-zinc-600">
                          <span className="font-semibold text-zinc-800">{sectionsCount}</span>{" "}
                          {sectionsCount === 1 ? "block" : "blocks"}
                        </td>

                        {/* Footer Placement Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleFooter(page)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                              page.show_in_footer
                                ? "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800"
                                : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                            }`}
                            title={
                              page.show_in_footer
                                ? "Currently shown in Footer Pages column. Click to remove."
                                : "Not shown in footer. Click to add to Pages column."
                            }
                          >
                            {page.show_in_footer ? (
                              <>
                                <Check size={12} className="text-white" />
                                <span>In Footer (#{page.footer_sort_order})</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full border border-zinc-400" />
                                <span>No</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Last Updated */}
                        <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                          {page.updated_at
                            ? new Date(page.updated_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewPage(page)}
                              className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
                              title="Preview Page"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Edit */}
                            <Link
                              href={`/ayc/pages/${page.id}`}
                              className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
                              title="Edit Page"
                            >
                              <Edit2 size={15} />
                            </Link>

                            {/* Publish / Unpublish */}
                            {page.status === "published" ? (
                              <button
                                type="button"
                                onClick={() => handleUnpublish(page)}
                                className="p-1.5 text-zinc-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                                title="Unpublish (Return to Draft)"
                              >
                                <Archive size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePublish(page)}
                                className="p-1.5 text-zinc-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                                title="Publish Page"
                              >
                                <CheckCircle size={15} />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setDeletingPage(page)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete Page"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deletingPage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 size={24} />
                <h3 className="text-base font-bold text-zinc-900">Delete CMS Page</h3>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Are you sure you want to delete <strong className="text-zinc-900">&quot;{deletingPage.title}&quot;</strong> (/{deletingPage.slug})?
                This action will remove the page and immediately unpublish it from the storefront and footer.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingPage(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Page"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewPage && (
          <PagePreviewModal
            page={previewPage}
            isOpen={Boolean(previewPage)}
            onClose={() => setPreviewPage(null)}
          />
        )}

        {/* Toast notifications */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
