/**
 * Explorer Coordinator Service
 *
 * Coordinates exclusive single-active-explorer behavior on the homepage across:
 * 1. Hot Sale ("hot-sale")
 * 2. Featured Products ("featured")
 * 3. Shop By Brand ("shop-by-brand")
 *
 * Rules:
 * - Only ONE section is the active product explorer at any time.
 * - When Hot Sale opens, it becomes active while Featured remains collapsed/default.
 * - When Load More is clicked in Hot Sale, Hot Sale becomes the ONLY active explorer,
 *   auto-pagination starts, filter rail appears, and other sections close.
 * - When Featured Products is activated (filters, load more, tabs),
 *   Hot Sale closes, and Featured becomes the ONLY active explorer.
 */

export type ExplorerSection = "hot-sale" | "featured" | "shop-by-brand";

export type ExplorerAction = "open" | "load-more" | "filter" | "tab-change" | "activate" | "close";

export interface ExplorerEventDetail {
  activeSection: ExplorerSection;
  action?: ExplorerAction;
}

export const EXPLORER_ACTIVE_EVENT = "ayaan:explorer-active";

/**
 * Notify all homepage sections that an explorer section has become active.
 */
export function notifyExplorerActive(
  section: ExplorerSection,
  action?: ExplorerAction
): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ExplorerEventDetail>(EXPLORER_ACTIVE_EVENT, {
      detail: { activeSection: section, action },
    })
  );
}

/**
 * Subscribe to explorer activation events.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToExplorerActive(
  callback: (detail: ExplorerEventDetail) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ExplorerEventDetail>;
    if (customEvent && customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(EXPLORER_ACTIVE_EVENT, handler);

  return () => {
    window.removeEventListener(EXPLORER_ACTIVE_EVENT, handler);
  };
}
