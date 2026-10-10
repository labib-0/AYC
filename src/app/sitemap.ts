import { MetadataRoute } from "next";
import { productService } from "@/services/product.service";
import { getCanonicalBaseUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalBaseUrl();
  const now = new Date();

  // 1. Static Core Public Canonical Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // 2. Dynamic Canonical Product Pages
  // Deduplicates URLs and strictly includes published, storefront-visible items
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await productService.getProducts();
    if (Array.isArray(products)) {
      const seenSlugs = new Set<string>();

      productRoutes = products
        .filter((p) => {
          if (!p || !p.slug) return false;
          const status = (p.status || "").toLowerCase();
          if (status === "draft" || status === "unpublished") return false;
          if (p.isHiddenFromStorefront || (p as any).is_hidden_from_storefront) return false;
          if ((p as any).deleted_at) return false;

          const slug = p.slug.trim().toLowerCase();
          if (seenSlugs.has(slug)) return false;
          seenSlugs.add(slug);
          return true;
        })
        .map((p) => {
          const modDate = (p as any).updated_at || (p as any).updatedAt || now;
          const parsedDate = new Date(modDate);
          const validDate = isNaN(parsedDate.getTime()) ? now : parsedDate;

          return {
            url: `${baseUrl}/products/${encodeURIComponent(p.slug.trim())}`,
            lastModified: validDate,
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
