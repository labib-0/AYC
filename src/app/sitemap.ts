import { MetadataRoute } from "next";
import { productService } from "@/services/product.service";
import { siteSettingsService } from "@/services/site-settings.service";
import { getCanonicalBaseUrl, canonicalUrl } from "@/lib/seo";

/**
 * Revalidate sitemap at most once every hour (ISR).
 * Allows catalog updates to reflect automatically in the sitemap.
 */
export const revalidate = 3600;

/**
 * Safely parse and validate an authoritative timestamp.
 * Returns a valid Date object if the timestamp is well-formed,
 * within a realistic historical range (>= 2020), and not in the future.
 * Returns undefined if invalid or missing to allow omitting <lastmod>.
 */
function parseAuthoritativeDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (typeof raw !== "string" && !(raw instanceof Date)) return undefined;

  const parsed = new Date(raw);
  const time = parsed.getTime();
  if (isNaN(time)) return undefined;

  // Reject future timestamps (with 60-second clock skew tolerance)
  const now = Date.now();
  if (time > now + 60_000) return undefined;

  // Reject prehistoric or corrupted dates
  if (parsed.getUTCFullYear() < 2020) return undefined;

  return parsed;
}

/**
 * Resolves the authoritative modification date for a product:
 * Priority 1: updated_at / updatedAt (when content, pricing, or images genuinely changed)
 * Priority 2: created_at / createdAt (authoritative publication/creation fallback)
 * Priority 3: undefined (omit lastmod rather than fabricating a current/misleading timestamp)
 */
function getProductLastmod(p: any): Date | undefined {
  const updatedRaw = p.updated_at || p.updatedAt;
  const parsedUpdated = parseAuthoritativeDate(updatedRaw);
  if (parsedUpdated) return parsedUpdated;

  const createdRaw = p.created_at || p.createdAt;
  const parsedCreated = parseAuthoritativeDate(createdRaw);
  if (parsedCreated) return parsedCreated;

  return undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalBaseUrl();

  // 1. Resolve authoritative timestamps for legal static pages
  let privacyPolicyDate: Date | undefined = undefined;
  let termsConditionsDate: Date | undefined = undefined;

  try {
    const publicSettings = await siteSettingsService.getPublicSettings();
    if (publicSettings?.legal_pages && Array.isArray(publicSettings.legal_pages)) {
      for (const page of publicSettings.legal_pages) {
        if (!page?.updated_at) continue;
        const parsed = parseAuthoritativeDate(page.updated_at);
        if (!parsed) continue;

        if (page.type === "privacy_policy" || (page.url && page.url.includes("privacy-policy"))) {
          privacyPolicyDate = parsed;
        } else if (
          page.type === "terms_conditions" ||
          page.type === "terms-and-conditions" ||
          (page.url && page.url.includes("terms-and-conditions"))
        ) {
          termsConditionsDate = parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Sitemap legal pages fetch notice:", err);
  }

  // 2. Static Core Public Canonical Routes
  // Note: Root and search omit lastModified because no single static file timestamp
  // can be established reliably without fabricating a misleading current date.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      ...(privacyPolicyDate ? { lastModified: privacyPolicyDate } : {}),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      ...(termsConditionsDate ? { lastModified: termsConditionsDate } : {}),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // 3. Dynamic Canonical Product Pages
  // Deduplicates URLs and strictly includes published, storefront-visible items with authentic timestamps
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await productService.getProducts({ all: true });
    if (Array.isArray(products)) {
      const seenSlugs = new Set<string>();

      productRoutes = products
        .filter((p) => {
          if (!p || !p.slug) return false;
          const status = (p.status || "").toLowerCase();
          if (status !== "published") return false;
          if (p.isHiddenFromStorefront || (p as any).is_hidden_from_storefront) return false;
          if ((p as any).deleted_at) return false;

          const slug = p.slug.trim().toLowerCase();
          if (seenSlugs.has(slug)) return false;
          seenSlugs.add(slug);
          return true;
        })
        .map((p) => {
          const lastmod = getProductLastmod(p);

          return {
            url: canonicalUrl(`/products/${p.slug.trim()}`),
            ...(lastmod ? { lastModified: lastmod } : {}),
            changeFrequency: "weekly" as const,
            priority: 0.8,
          };
        });
    }
  } catch (err) {
    console.warn("Sitemap product fetch notice:", err);
  }

  return [...staticRoutes, ...productRoutes];
}
