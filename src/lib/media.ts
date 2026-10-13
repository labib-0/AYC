/**
 * Canonical Image URL Normalization Architecture for Ayaan Clothing
 *
 * Enforces Phase 5 requirements:
 * 1. Absolute production URLs (https://ayaanclothing.com/storage/...) resolve correctly.
 * 2. Relative storage paths (/storage/... or storage/...) are normalized with leading slash.
 * 3. Raw subfolder paths (products/..., brands/..., categories/..., banners/...) are prefixed with /storage/.
 * 4. Localhost / 127.0.0.1 / private port URLs in production are stripped to relative /storage/... paths.
 * 5. Data URLs (data:image/...) and Object URLs (blob:...) are preserved untouched for local previews.
 * 6. Broken root paths (/storage, /storage/, empty) return fallback or empty string.
 */

function isAdminMediaContext(): boolean {
  if (typeof window === "undefined" || !window.location || typeof window.location.pathname !== "string") return false;
  const pathname = window.location.pathname;
  const hostname = window.location.hostname || "";
  return (
    pathname === "/ayc" ||
    pathname.startsWith("/ayc/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    window.location.port === "3001" ||
    hostname.startsWith("admin.") ||
    hostname === "admin.localhost"
  );
}

export function normalizeImageUrl(url?: string | null, fallback: string = ""): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Preserve local browser object previews and base64 preview data
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // Reject bare root /storage directory references (prevents broken-image 404s)
  if (trimmed === "/storage" || trimmed === "/storage/" || trimmed === "storage" ||
      trimmed === "/ayc/storage" || trimmed === "/ayc/storage/") {
    return fallback;
  }
  if (/^https?:\/\/[^\/]+\/(ayc\/)?storage\/?$/i.test(trimmed)) {
    return fallback;
  }

  const isAdmin = isAdminMediaContext();
  const storagePrefix = isAdmin ? "/ayc/storage" : "/storage";

  // Clean localhost or IP-based storage URLs to relative storage paths
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/(ayc\/)?storage\/(.+)$/i.test(trimmed)) {
    const match = trimmed.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/(ayc\/)?storage\/(.+)$/i);
    return `${storagePrefix}/${match![4]}`;
  }

  // Clean api.ayaanclothing.com or other subdomains pointing to /storage/
  if (/^https?:\/\/api\.ayaanclothing\.com\/(ayc\/)?storage\/(.+)$/i.test(trimmed)) {
    const match = trimmed.match(/^https?:\/\/api\.ayaanclothing\.com\/(ayc\/)?storage\/(.+)$/i);
    return `${storagePrefix}/${match![2]}`;
  }

  // Production domain with /storage/ or /ayc/storage/
  if (/^https?:\/\/(www\.)?ayaanclothing\.com\/(ayc\/)?storage\/(.+)$/i.test(trimmed)) {
    const match = trimmed.match(/^https?:\/\/(www\.)?ayaanclothing\.com\/(ayc\/)?storage\/(.+)$/i);
    return `${storagePrefix}/${match![3]}`;
  }

  // Valid external HTTP/HTTPS URL (e.g. Unsplash, S3, CDN)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Starts with /ayc/storage/
  if (trimmed.startsWith("/ayc/storage/")) {
    return trimmed;
  }

  // Starts with /storage/
  if (trimmed.startsWith("/storage/")) {
    return isAdmin ? `/ayc${trimmed}` : trimmed;
  }

  // Starts with storage/
  if (trimmed.startsWith("storage/")) {
    return `${storagePrefix}/${trimmed.slice(8)}`;
  }

  // Relative folder paths like products/xxx.jpg
  if (/^(products|brands|categories|banners|documents|branding)\//i.test(trimmed)) {
    return `${storagePrefix}/${trimmed}`;
  }

  // Absolute site paths like /placeholder.jpg, /logo.png, /brands/nike.svg
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Checks whether an image URL points to a valid, renderable media path
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed === "/storage" || trimmed === "/storage/" || trimmed === "storage") return false;
  if (/^https?:\/\/[^\/]+\/storage\/?$/i.test(trimmed)) return false;
  return true;
}

/**
 * Generates a normalized, canonical uniqueness key for media records to prevent duplicate rendering.
 * Strips origin domain, /ayc prefix, /storage prefix, query parameters, and hashes.
 */
export function getCanonicalMediaKey(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "/placeholder.jpg" || trimmed.includes("placeholder")) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  let clean = trimmed.split("?")[0].split("#")[0];
  clean = clean.replace(/^https?:\/\/[^\/]+/i, "");
  clean = clean.replace(/^\/ayc/, "");
  clean = clean.replace(/^\/?storage\//, "");
  clean = clean.replace(/^\/+/, "");
  return clean.toLowerCase();
}

/**
 * Deduplicates an array of media URLs, preserving order (primary image first)
 * and skipping invalid/placeholder entries.
 */
export function deduplicateMediaUrls(urls: Array<string | null | undefined>): string[] {
  const seenKeys = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "/placeholder.jpg" || trimmed.includes("placeholder")) continue;
    const key = getCanonicalMediaKey(trimmed);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(normalizeImageUrl(trimmed));
  }

  return result;
}

/**
 * Authoritatively resolves the primary thumbnail URL for a product record.
 * Inspects all possible backend/frontend representations in priority order:
 * 1. primary_image_url / primaryImageUrl (string)
 * 2. image_url / imageUrl / image (string)
 * 3. primaryImage relation object: { image_url }
 * 4. images array: checks objects with is_primary === true first, then first valid object or string URL
 * 5. media array: checks first valid object or string URL
 * 6. Normalizes storage/relative paths via normalizeImageUrl()
 * 7. Ignores generic placeholder references and returns null for authentic neutral no-image state.
 */
export function resolveProductThumbnail(product?: any): string | null {
  if (!product || typeof product !== "object") return null;

  const sanitize = (val?: string | null): string | null => {
    if (!val || typeof val !== "string") return null;
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === "/placeholder.jpg" ||
      trimmed.includes("placeholder") ||
      trimmed.includes("default.jpg")
    ) {
      return null;
    }
    const normalized = normalizeImageUrl(trimmed);
    if (!isValidImageUrl(normalized) || normalized.includes("placeholder")) {
      return null;
    }
    return normalized;
  };

  // 1. Direct explicit primary image fields
  const directPrimary = sanitize(product.primary_image_url || product.primaryImageUrl);
  if (directPrimary) return directPrimary;

  // 2. Direct single image URL fields
  const directImage = sanitize(product.image_url || product.imageUrl || product.image);
  if (directImage) return directImage;

  // 3. Primary image relation object
  if (product.primaryImage && typeof product.primaryImage === "object") {
    const fromRel = sanitize(product.primaryImage.image_url || product.primaryImage.url);
    if (fromRel) return fromRel;
  }
  if (product.primary_image && typeof product.primary_image === "object") {
    const fromRel = sanitize(product.primary_image.image_url || product.primary_image.url);
    if (fromRel) return fromRel;
  }

  // 4. images collection / array
  if (Array.isArray(product.images) && product.images.length > 0) {
    // Check for marked is_primary first
    for (const item of product.images) {
      if (item && typeof item === "object" && (item.is_primary || item.isPrimary)) {
        const primaryCandidate = sanitize(item.image_url || item.url || item.src);
        if (primaryCandidate) return primaryCandidate;
      }
    }
    // Then check in order of sort_order or index
    for (const item of product.images) {
      const candidate = typeof item === "string" ? item : item?.image_url || item?.url || item?.src;
      const resolved = sanitize(candidate);
      if (resolved) return resolved;
    }
  }

  // 5. media collection / array
  if (Array.isArray(product.media) && product.media.length > 0) {
    for (const item of product.media) {
      const candidate = typeof item === "string" ? item : item?.url || item?.image_url;
      const resolved = sanitize(candidate);
      if (resolved) return resolved;
    }
  }

  return null;
}

