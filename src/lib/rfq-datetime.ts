/**
 * RFQ Date & Time Utilities
 * Centralized parsing, formatting, filtering, and sorting for B2B RFQs.
 * Uses local business time (Asia/Dhaka, UTC+6) consistently.
 */

import { RfqRecord } from "@/types/b2b";

export const BUSINESS_TIMEZONE = "Asia/Dhaka";

export type DateQuickFilter = "ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM";
export type TimeQuickFilter = "ALL" | "MORNING" | "AFTERNOON" | "EVENING" | "CUSTOM";
export type RfqSortOrder = "newest" | "oldest";

export interface RfqDateTimeFilterState {
  dateFilter: DateQuickFilter;
  customDate?: string; // YYYY-MM-DD
  timeFilter: TimeQuickFilter;
  timeFrom?: string; // HH:mm (24h)
  timeTo?: string; // HH:mm (24h)
  sortOrder: RfqSortOrder;
}

export const DEFAULT_DATETIME_FILTER: RfqDateTimeFilterState = {
  dateFilter: "ALL",
  customDate: "",
  timeFilter: "ALL",
  timeFrom: "",
  timeTo: "",
  sortOrder: "newest",
};

/**
 * Format ISO timestamp into clean date string (e.g. "23 Sep 2026")
 */
export function formatRfqDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Format ISO timestamp into clean 12h time string (e.g. "05:42 PM")
 */
export function formatRfqTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

/**
 * Format ISO timestamp into combined date & time string:
 * "23 Sep 2026 · 5:42 PM"
 */
export function formatRfqDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const datePart = d.toLocaleDateString("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} · ${timePart}`;
  } catch {
    return "—";
  }
}

/**
 * Extracts YYYY-MM-DD string in Asia/Dhaka timezone
 */
export function getDhakaDateString(d: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Extracts hour (0-23) and minute (0-59) in Asia/Dhaka timezone
 */
export function getDhakaHourMinute(d: Date): { hour: number; minute: number; totalMinutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);

  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10) % 24;
    if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  return { hour, minute, totalMinutes: hour * 60 + minute };
}

/**
 * Check whether an RFQ matches date and time filters
 */
export function isRfqMatchingDateTime(
  rfq: RfqRecord,
  filter: RfqDateTimeFilterState,
  referenceDate: Date = new Date()
): boolean {
  if (!rfq.createdAt) return filter.dateFilter === "ALL" && filter.timeFilter === "ALL";

  const rfqDate = new Date(rfq.createdAt);
  if (isNaN(rfqDate.getTime())) return false;

  const rfqDateStr = getDhakaDateString(rfqDate);
  const todayStr = getDhakaDateString(referenceDate);

  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getDhakaDateString(yesterday);

  // ── 1. Date Filtering ─────────────────────────────────────────────────────
  if (filter.dateFilter === "TODAY") {
    if (rfqDateStr !== todayStr) return false;
  } else if (filter.dateFilter === "YESTERDAY") {
    if (rfqDateStr !== yesterdayStr) return false;
  } else if (filter.dateFilter === "LAST_7_DAYS") {
    const diffMs = referenceDate.getTime() - rfqDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 0 || diffDays > 7) return false;
  } else if (filter.dateFilter === "LAST_30_DAYS") {
    const diffMs = referenceDate.getTime() - rfqDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 0 || diffDays > 30) return false;
  } else if (filter.dateFilter === "CUSTOM" && filter.customDate) {
    if (rfqDateStr !== filter.customDate) return false;
  }

  // ── 2. Time Filtering ─────────────────────────────────────────────────────
  if (filter.timeFilter !== "ALL") {
    const { hour, totalMinutes } = getDhakaHourMinute(rfqDate);

    if (filter.timeFilter === "MORNING") {
      // 06:00 to 11:59
      if (hour < 6 || hour >= 12) return false;
    } else if (filter.timeFilter === "AFTERNOON") {
      // 12:00 to 16:59
      if (hour < 12 || hour >= 17) return false;
    } else if (filter.timeFilter === "EVENING") {
      // 17:00 to 23:59
      if (hour < 17) return false;
    } else if (filter.timeFilter === "CUSTOM") {
      if (filter.timeFrom) {
        const [fromH, fromM] = filter.timeFrom.split(":").map((v) => parseInt(v, 10));
        const fromMinutes = (fromH || 0) * 60 + (fromM || 0);
        if (totalMinutes < fromMinutes) return false;
      }
      if (filter.timeTo) {
        const [toH, toM] = filter.timeTo.split(":").map((v) => parseInt(v, 10));
        const toMinutes = (toH || 0) * 60 + (toM || 0);
        if (totalMinutes > toMinutes) return false;
      }
    }
  }

  return true;
}

/**
 * Sorts RFQ records by creation timestamp
 */
export function sortRfqsByTimestamp(
  rfqs: RfqRecord[],
  order: RfqSortOrder = "newest"
): RfqRecord[] {
  return [...rfqs].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return order === "newest" ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Calculates Today's RFQ activity summary
 */
export function getTodayRfqSummary(
  rfqs: RfqRecord[],
  referenceDate: Date = new Date()
): {
  todayTotal: number;
  todayNew: number;
  latestRfqDateFormatted: string;
  latestRfqNumber?: string;
} {
  const todayStr = getDhakaDateString(referenceDate);

  let todayTotal = 0;
  let todayNew = 0;

  for (const rfq of rfqs) {
    if (!rfq.createdAt) continue;
    const rDateStr = getDhakaDateString(new Date(rfq.createdAt));
    if (rDateStr === todayStr) {
      todayTotal++;
      if (rfq.status === "SUBMITTED" || rfq.status === "UNDER_REVIEW") {
        todayNew++;
      }
    }
  }

  // Find latest RFQ
  const sorted = sortRfqsByTimestamp(rfqs, "newest");
  const latest = sorted[0];

  return {
    todayTotal,
    todayNew,
    latestRfqDateFormatted: latest?.createdAt ? formatRfqDateTime(latest.createdAt) : "—",
    latestRfqNumber: latest?.rfqNumber,
  };
}
