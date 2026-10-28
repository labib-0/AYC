import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import {
  CmsPage,
  CmsPageFooterItem,
  CmsPageRedirectResponse,
} from "@/types/cms";

export interface AdminPagesQueryParams {
  status?: string;
  search?: string;
  show_in_footer?: boolean;
  page?: number;
  per_page?: number;
  all?: boolean;
  forceFresh?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

/**
 * In-memory fallback store for offline / mock testing
 */
let inMemoryPages: CmsPage[] = [];

export class CmsPageService {
  private cachedFooterPages: { data: CmsPageFooterItem[]; timestamp: number } | null = null;
  private inFlightFooterPromise: Promise<CmsPageFooterItem[]> | null = null;

  public invalidateCache(): void {
    this.cachedFooterPages = null;
    this.inFlightFooterPromise = null;
  }

  /* ─────────────────────────────────────────────────────────────
   * Public Storefront APIs
   * ───────────────────────────────────────────────────────────── */

  /**
   * Fetch published footer-enabled pages with in-flight deduplication
   */
  async getFooterPages(forceFresh: boolean = false): Promise<CmsPageFooterItem[]> {
    if (forceFresh) {
      this.invalidateCache();
    }

    if (
      !forceFresh &&
      this.cachedFooterPages &&
      Date.now() - this.cachedFooterPages.timestamp < 30_000
    ) {
      return this.cachedFooterPages.data;
    }

    if (!forceFresh && this.inFlightFooterPromise) {
      return this.inFlightFooterPromise;
    }

    const fetchPromise = (async () => {
      if (!isFrontendOnly()) {
        try {
          const res = await apiClient.get<any>("/pages/footer");
          const items = Array.isArray(res) ? res : res?.data;
          if (Array.isArray(items)) {
            this.cachedFooterPages = { data: items, timestamp: Date.now() };
            return items;
          }
          return [];
        } catch (err) {
          console.warn("Public footer pages fetch notice:", err);
          return [];
        }
      }

      // Mock / fallback
      const mockItems: CmsPageFooterItem[] = inMemoryPages
        .filter((p) => p.status === "published" && p.show_in_footer)
        .sort((a, b) => (a.footer_sort_order || 0) - (b.footer_sort_order || 0))
        .map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          footer_label: p.footer_label,
          footer_sort_order: p.footer_sort_order,
        }));

      this.cachedFooterPages = { data: mockItems, timestamp: Date.now() };
      return mockItems;
    })();

    this.inFlightFooterPromise = fetchPromise;
    fetchPromise.finally(() => {
      this.inFlightFooterPromise = null;
    });

    return fetchPromise;
  }

  /**
   * Fetch published page by slug (returns redirect payload if previous slug)
   */
  async getPublishedPageBySlug(
    slug: string
  ): Promise<CmsPage | CmsPageRedirectResponse | null> {
    const clean = slug.toLowerCase().trim();

    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/pages/${clean}`, {
          cache: "no-store",
        });
        if (res?.redirect && res?.canonical_slug) {
          return res as CmsPageRedirectResponse;
        }
        const data = res?.data || res;
        if (data && data.slug) {
          return data as CmsPage;
        }
        return null;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) {
          return null;
        }
        console.warn("CMS page fetch notice:", err);
        return null;
      }
    }

    // Mock fallback
    const matched = inMemoryPages.find(
      (p) => p.slug.toLowerCase() === clean && p.status === "published"
    );
    if (matched) return matched;

    // Check previous slugs
    const prevMatch = inMemoryPages.find(
      (p) =>
        p.status === "published" &&
        p.previous_slugs &&
        p.previous_slugs.map((s) => s.toLowerCase()).includes(clean)
    );
    if (prevMatch) {
      return {
        success: true,
        redirect: true,
        canonical_slug: prevMatch.slug,
        canonical_url: `/${prevMatch.slug}`,
        status_code: 301,
      };
    }

    return null;
  }

  /**
   * Lightweight list of published indexable pages for sitemap
   */
  async getPublishedPages(): Promise<
    Array<{ id: number | string; title: string; slug: string; updated_at?: string; published_at?: string }>
  > {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/pages/published");
        const items = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(items)) {
          return items;
        }
        return [];
      } catch (err) {
        console.warn("CMS published sitemap fetch notice:", err);
        return [];
      }
    }

    return inMemoryPages
      .filter((p) => p.status === "published" && p.is_indexable !== false)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        updated_at: p.updated_at,
        published_at: p.published_at || undefined,
      }));
  }

  /* ─────────────────────────────────────────────────────────────
   * Authenticated Admin APIs
   * ───────────────────────────────────────────────────────────── */

  /**
   * Retrieve paginated or full CMS pages list for Admin
   */
  async getAdminPages(params?: AdminPagesQueryParams): Promise<any> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/pages", {
          params: params as any,
        });
        return res?.data || res;
      } catch (err: any) {
        throw err;
      }
    }

    let list = [...inMemoryPages];
    if (params?.status) {
      list = list.filter((p) => p.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }
    if (params?.show_in_footer !== undefined) {
      list = list.filter((p) => p.show_in_footer === params.show_in_footer);
    }

    list.sort((a, b) => {
      const dateA = new Date(a.updated_at || 0).getTime();
      const dateB = new Date(b.updated_at || 0).getTime();
      return dateB - dateA;
    });

    if (params?.all) {
      return list;
    }

    const perPage = params?.per_page || 15;
    const page = params?.page || 1;
    const offset = (page - 1) * perPage;
    const paginated = list.slice(offset, offset + perPage);

    return {
      data: paginated,
      current_page: page,
      per_page: perPage,
      total: list.length,
      last_page: Math.ceil(list.length / perPage) || 1,
    };
  }

  /**
   * Fetch single page details by ID
   */
  async getAdminPageById(id: number | string): Promise<CmsPage | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/pages/${id}`);
        return res?.data || res;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null;
        throw err;
      }
    }
    return inMemoryPages.find((p) => String(p.id) === String(id)) || null;
  }

  /**
   * Create new page draft
   */
  async createPage(payload: Partial<CmsPage>): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/admin/pages", payload);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    const newId = Date.now();
    const newPage: CmsPage = {
      id: newId,
      title: payload.title || "Untitled Page",
      slug: payload.slug || `page-${newId}`,
      status: payload.status || "draft",
      sections: payload.sections || [],
      draft_sections: payload.draft_sections || payload.sections || [],
      parent_id: payload.parent_id || null,
      breadcrumb_label: payload.breadcrumb_label || null,
      show_in_footer: Boolean(payload.show_in_footer),
      footer_label: payload.footer_label || null,
      footer_sort_order: payload.footer_sort_order || 0,
      meta_title: payload.meta_title || null,
      meta_description: payload.meta_description || null,
      canonical_url: payload.canonical_url || null,
      og_image_url: payload.og_image_url || null,
      is_indexable: payload.is_indexable !== false,
      scheduled_publish_at: payload.scheduled_publish_at || null,
      scheduled_unpublish_at: payload.scheduled_unpublish_at || null,
      published_at: payload.status === "published" ? new Date().toISOString() : null,
      previous_slugs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryPages.push(newPage);
    this.dispatchUpdateEvents();
    return newPage;
  }

  /**
   * Update existing page draft/settings
   */
  async updatePage(id: number | string, payload: Partial<CmsPage>): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/admin/pages/${id}`, payload);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    const idx = inMemoryPages.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw new Error("CMS Page not found");

    const existing = inMemoryPages[idx];
    const prevSlugs = [...(existing.previous_slugs || [])];
    if (payload.slug && payload.slug !== existing.slug && !prevSlugs.includes(existing.slug)) {
      prevSlugs.push(existing.slug);
    }

    const updated: CmsPage = {
      ...existing,
      ...payload,
      previous_slugs: prevSlugs,
      updated_at: new Date().toISOString(),
    };

    inMemoryPages[idx] = updated;
    this.dispatchUpdateEvents();
    return updated;
  }

  /**
   * Atomically publish working draft
   */
  async publishPage(id: number | string): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/pages/${id}/publish`);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    const idx = inMemoryPages.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw new Error("CMS Page not found");

    const existing = inMemoryPages[idx];
    const publishedSections = existing.draft_sections && existing.draft_sections.length > 0
      ? existing.draft_sections
      : existing.sections;

    const updated: CmsPage = {
      ...existing,
      status: "published",
      sections: publishedSections,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryPages[idx] = updated;
    this.dispatchUpdateEvents();
    return updated;
  }

  /**
   * Unpublish page
   */
  async unpublishPage(id: number | string): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/pages/${id}/unpublish`);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    const idx = inMemoryPages.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw new Error("CMS Page not found");

    const updated: CmsPage = {
      ...inMemoryPages[idx],
      status: "draft",
      updated_at: new Date().toISOString(),
    };

    inMemoryPages[idx] = updated;
    this.dispatchUpdateEvents();
    return updated;
  }

  /**
   * Archive page
   */
  async archivePage(id: number | string): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/pages/${id}/archive`);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    const idx = inMemoryPages.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw new Error("CMS Page not found");

    const updated: CmsPage = {
      ...inMemoryPages[idx],
      status: "archived",
      updated_at: new Date().toISOString(),
    };

    inMemoryPages[idx] = updated;
    this.dispatchUpdateEvents();
    return updated;
  }

  /**
   * Soft-delete page
   */
  async deletePage(id: number | string): Promise<boolean> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      await apiClient.delete(`/admin/pages/${id}`);
      this.dispatchUpdateEvents();
      return true;
    }

    inMemoryPages = inMemoryPages.filter((p) => String(p.id) !== String(id));
    this.dispatchUpdateEvents();
    return true;
  }

  /**
   * Restore deleted page
   */
  async restorePage(id: number | string): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/pages/${id}/restore`);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    throw new Error("Restore not supported in mock mode.");
  }

  /**
   * Update footer visibility and sorting
   */
  async updateFooterSettings(
    id: number | string,
    payload: { show_in_footer: boolean; footer_label?: string | null; footer_sort_order?: number }
  ): Promise<CmsPage> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.patch<any>(`/admin/pages/${id}/footer`, payload);
      const item = res?.data || res;
      this.dispatchUpdateEvents();
      return item;
    }

    return this.updatePage(id, payload);
  }

  /**
   * Bulk reorder footer order
   */
  async reorderFooter(
    orders: Array<{ id: number | string; footer_sort_order: number }>
  ): Promise<CmsPageFooterItem[]> {
    this.invalidateCache();

    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>("/admin/pages/reorder-footer", { orders });
      const items = Array.isArray(res) ? res : res?.data;
      this.dispatchUpdateEvents();
      return items || [];
    }

    for (const ord of orders) {
      const page = inMemoryPages.find((p) => String(p.id) === String(ord.id));
      if (page) {
        page.footer_sort_order = ord.footer_sort_order;
      }
    }

    this.dispatchUpdateEvents();
    return this.getFooterPages(true);
  }

  /**
   * Fetch working draft preview
   */
  async getDraftPreview(id: number | string): Promise<CmsPage | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/pages/${id}/preview`);
        return res?.data || res;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null;
        throw err;
      }
    }

    const page = inMemoryPages.find((p) => String(p.id) === String(id));
    if (!page) return null;

    return {
      ...page,
      sections: page.draft_sections && page.draft_sections.length > 0 ? page.draft_sections : page.sections,
      is_preview: true,
    };
  }

  /**
   * Helper to notify all open browser tabs and components to revalidate CMS cache
   */
  private dispatchUpdateEvents(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:page-updated"));
      window.dispatchEvent(new CustomEvent("ayaan:page-footer-updated"));
      window.dispatchEvent(new CustomEvent("ayaan:data-updated"));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ayaan_cms_pages_updated",
          newValue: String(Date.now()),
        })
      );
    }
  }
}

export const cmsPageService = new CmsPageService();
