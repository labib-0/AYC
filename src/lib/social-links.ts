import { SocialLink } from "@/types/settings";

/**
 * List of major social media platform domains where a bare root domain (e.g. https://linkedin.com)
 * merely loads the platform landing/login page rather than an official business profile.
 */
export const GENERIC_PLATFORM_HOSTS = new Set([
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
  "threads.net",
]);

export interface SocialUrlValidation {
  isValid: boolean;
  isConfigured: boolean;
  isGenericPlaceholder: boolean;
  errorMessage?: string;
}

/**
 * Checks whether a URL is a secure, well-formed HTTP/HTTPS URL.
 * Strictly rejects dangerous protocols like `javascript:`, `data:`, `file:`, or malformed strings.
 */
export function isValidHttpUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Reject non-http(s) schemes immediately
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates a social media profile URL against safety, protocol (strictly https://),
 * provider domain matching, and generic placeholder rules.
 */
export function validateSocialProfileUrl(provider: string, rawUrl?: string | null): SocialUrlValidation {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: true, isConfigured: false, isGenericPlaceholder: false };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isValid: true, isConfigured: false, isGenericPlaceholder: false };
  }

  // Reject dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return {
      isValid: false,
      isConfigured: false,
      isGenericPlaceholder: false,
      errorMessage: "Unsafe URL scheme detected.",
    };
  }

  // Strictly enforce https:// for social profile links
  if (!/^https:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      isConfigured: false,
      isGenericPlaceholder: false,
      errorMessage: "Social links must start with https://.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      isConfigured: false,
      isGenericPlaceholder: false,
      errorMessage: "Please enter a valid URL.",
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, "");
  const hasQuery = Boolean(parsed.search && parsed.search.length > 1);
  const normProvider = (provider || "website").toLowerCase().trim();

  // Provider-specific domain & route verification
  if (normProvider === "linkedin") {
    if (!host.endsWith("linkedin.com")) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: false,
        errorMessage: "LinkedIn URL must be under linkedin.com.",
      };
    }
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic LinkedIn homepage. Please enter an official company or profile URL (e.g. https://www.linkedin.com/company/ayaanclothing).",
      };
    }
  } else if (normProvider === "tiktok") {
    if (!host.endsWith("tiktok.com")) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: false,
        errorMessage: "TikTok URL must be under tiktok.com.",
      };
    }
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic TikTok homepage. Please enter an official profile URL (e.g. https://www.tiktok.com/@ayaanclothing).",
      };
    }
  } else if (normProvider === "facebook") {
    if (!host.endsWith("facebook.com")) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: false,
        errorMessage: "Facebook URL must be under facebook.com.",
      };
    }
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic Facebook homepage. Please enter an official page or profile URL.",
      };
    }
  } else if (normProvider === "instagram") {
    if (!host.endsWith("instagram.com")) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: false,
        errorMessage: "Instagram URL must be under instagram.com.",
      };
    }
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic Instagram homepage. Please enter an official profile handle URL.",
      };
    }
  } else if (normProvider === "youtube") {
    if (!host.endsWith("youtube.com") && host !== "youtu.be") {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: false,
        errorMessage: "YouTube URL must be under youtube.com or youtu.be.",
      };
    }
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic YouTube homepage. Please enter a channel or profile URL.",
      };
    }
  } else if (normProvider === "x" || normProvider === "twitter") {
    if (!host.endsWith("x.com") && !host.endsWith("twitter.com")) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: false,
        errorMessage: "X / Twitter URL must be under x.com or twitter.com.",
      };
    }
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic X / Twitter homepage. Please enter a profile handle URL.",
      };
    }
  } else if (GENERIC_PLATFORM_HOSTS.has(host)) {
    if (!cleanPath && !hasQuery) {
      return {
        isValid: false,
        isConfigured: false,
        isGenericPlaceholder: true,
        errorMessage: "Generic platform homepage. Please provide a profile or channel URL.",
      };
    }
  }

  return { isValid: true, isConfigured: true, isGenericPlaceholder: false };
}

/**
 * Validates whether a social media URL is an actual configured business profile
 * rather than an unconfigured generic platform root (e.g. `https://linkedin.com`).
 */
export function isConfiguredSocialUrl(rawUrl?: string | null, provider?: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const validation = validateSocialProfileUrl(provider || "", rawUrl);
  return validation.isValid && validation.isConfigured;
}

/**
 * Filters an array of social links to return only active links with verified,
 * non-generic configured URLs.
 */
export function filterConfiguredSocialLinks(links?: SocialLink[] | null): SocialLink[] {
  if (!Array.isArray(links)) return [];
  return links.filter(
    (link) => link && link.is_active !== false && isConfiguredSocialUrl(link.url, link.provider)
  );
}
