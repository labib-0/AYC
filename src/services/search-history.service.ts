import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

class SearchHistoryService {
  private memoryFallback: Map<string, string[]> = new Map();

  private getStorageKey(): string {
    if (typeof window !== "undefined") {
      try {
        const activeUser = localStorage.getItem("ayaan_mock_active_user_v2");
        if (activeUser) {
          const parsed = JSON.parse(activeUser);
          if (parsed?.id) {
            return `ayaan_recent_searches_user_${parsed.id}`;
          }
        }
      } catch {
        // fallback
      }
    }
    return "ayaan_recent_searches_guest";
  }

  /**
   * Retrieve recent-search terms from the application's persistent / Redis-backed search-history mechanism.
   * Scoped to the appropriate authenticated user or guest session.
   * Display only real recorded searches. NEVER seeds or hardcodes fake terms.
   */
  async getRecentSearches(): Promise<string[]> {
    let localList: string[] = [];
    const key = this.getStorageKey();

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localList = parsed.filter(
              (t) => typeof t === "string" && t.trim().length > 0
            );
          }
        }
      } catch {
        localList = [];
      }
    } else {
      localList = this.memoryFallback.get(key) || [];
    }

    // Attempt to synchronize with backend Redis/cache if not in frontend-only mode
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<string[] | { data?: string[] }>("/search/history");
        const serverList = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(serverList) && serverList.length > 0) {
          const combined = Array.from(new Set([...localList, ...serverList])).slice(0, 8);
          this.persistLocal(combined);
          return combined;
        }
      } catch {
        // Graceful fallback to local storage
      }
    }

    return localList;
  }

  /**
   * Synchronous quick accessor for fast render hydration from localStorage
   */
  getRecentSearchesSync(): string[] {
    const key = this.getStorageKey();
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((t) => typeof t === "string" && t.trim().length > 0).slice(0, 8);
            this.memoryFallback.set(key, clean);
            return clean;
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    return this.memoryFallback.get(key) || [];
  }

  /**
   * Record a genuine search submission or selection.
   * Normalizes whitespace, deduplicates case-insensitively, and bounds to recency limit.
   */
  async recordSearch(query: string): Promise<string[]> {
    const term = query.trim().replace(/\s+/g, " ");
    if (!term) return [];

    const current = this.getRecentSearchesSync();
    const updated = [
      term,
      ...current.filter((item) => item.toLowerCase() !== term.toLowerCase()),
    ].slice(0, 8);

    this.persistLocal(updated);
    this.dispatchUpdateEvent();

    if (!isFrontendOnly()) {
      try {
        await apiClient.post("/search/history", { term });
      } catch {
        // Graceful degradation
      }
    }

    return updated;
  }

  /**
   * Remove a single recent search item
   */
  async removeSearch(termToRemove: string): Promise<string[]> {
    const current = this.getRecentSearchesSync();
    const updated = current.filter(
      (item) => item.toLowerCase() !== termToRemove.toLowerCase()
    );

    this.persistLocal(updated);
    this.dispatchUpdateEvent();

    if (!isFrontendOnly()) {
      try {
        await apiClient.delete(`/search/history?term=${encodeURIComponent(termToRemove)}`);
      } catch {
        // Graceful degradation
      }
    }

    return updated;
  }

  /**
   * Clear all stored recent searches
   */
  async clearAll(): Promise<void> {
    const key = this.getStorageKey();
    this.memoryFallback.delete(key);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    this.dispatchUpdateEvent();

    if (!isFrontendOnly()) {
      try {
        await apiClient.delete("/search/history");
      } catch {
        // Graceful degradation
      }
    }
  }

  private persistLocal(list: string[]): void {
    const key = this.getStorageKey();
    this.memoryFallback.set(key, list);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        // Ignore storage errors
      }
    }
  }

  private dispatchUpdateEvent(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:recent-searches-updated"));
    }
  }
}

export const searchHistoryService = new SearchHistoryService();
