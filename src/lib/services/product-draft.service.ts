/**
 * Admin Product Draft Preservation Service
 *
 * Provides resilient, privacy-safe local recovery of in-progress product creation
 * and editing configurations. Survives session expiration, page refresh, and
 * authentication redirects without losing complex assortments, pricing, or media.
 */

import { B2BProductInput } from "@/types/b2b";

export interface StoredProductDraft {
  savedAt: number;
  mode: "create" | "edit";
  productId?: string;
  data: Partial<B2BProductInput>;
}

const DRAFT_PREFIX = "ayaan_admin_product_draft_";

class ProductDraftService {
  private getStorageKey(idOrNew: string = "new"): string {
    return `${DRAFT_PREFIX}${idOrNew}`;
  }

  /**
   * Preserves current form state locally.
   * Excludes any private auth tokens or sensitive session credentials.
   */
  public saveDraft(idOrNew: string = "new", data: Partial<B2BProductInput>, mode: "create" | "edit" = "create"): void {
    if (typeof window === "undefined") return;

    try {
      // Clean sensitive or ephemeral runtime handles
      const sanitizedData = { ...data };
      delete (sanitizedData as any).token;
      delete (sanitizedData as any).password;

      const payload: StoredProductDraft = {
        savedAt: Date.now(),
        mode,
        productId: idOrNew !== "new" ? idOrNew : undefined,
        data: sanitizedData,
      };

      localStorage.setItem(this.getStorageKey(idOrNew), JSON.stringify(payload));
    } catch (err) {
      console.warn("Product draft preservation notice (storage quota or access):", err);
    }
  }

  /**
   * Retrieves a preserved product draft if available and recent (< 7 days).
   */
  public getDraft(idOrNew: string = "new"): StoredProductDraft | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem(this.getStorageKey(idOrNew));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredProductDraft;
      if (!parsed || !parsed.data) return null;

      // Discard drafts older than 7 days
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.savedAt > maxAgeMs) {
        this.clearDraft(idOrNew);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Checks if an unsaved draft exists for the given product ID or new product.
   */
  public hasDraft(idOrNew: string = "new"): boolean {
    return this.getDraft(idOrNew) !== null;
  }

  /**
   * Clears the draft artifact after successful publish or explicit discard.
   */
  public clearDraft(idOrNew: string = "new"): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(this.getStorageKey(idOrNew));
    } catch {}
  }
}

export const productDraftService = new ProductDraftService();
