import { MetadataRoute } from "next";
import { productService } from "@/services/product.service";
import { categoryService } from "@/services/category.service";
import { brandService } from "@/services/brand.service";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  // 1. Static Core Public Landing Routes
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
      url: `${baseUrl}/rfq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // 2. Audience Landing Routes (5 Core Taxonomies)
  const audiences = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"];
  const audienceRoutes: MetadataRoute.Sitemap = audiences.map((aud) => ({
    url: `${baseUrl}/search?audience=${encodeURIComponent(aud)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. Dynamic Category Routes
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categories = await categoryService.getCategories();
    if (Array.isArray(categories)) {
      const activeCats = categories.filter(
        (c) =>
          c.is_active !== false &&
          !["men", "women", "boys", "girls", "unisex"].includes(
            (c.name || "").toLowerCase()
          )
      );
      categoryRoutes = activeCats.map((cat) => ({
        url: `${baseUrl}/search?category=${encodeURIComponent(cat.name)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.warn("Sitemap category fetch notice:", err);
  }

  // 4. Dynamic Brand Routes
  let brandRoutes: MetadataRoute.Sitemap = [];
  try {
    const brands = await brandService.getBrands();
    if (Array.isArray(brands)) {
      const activeBrands = brands.filter((b) => b.is_active !== false);
      brandRoutes = activeBrands.map((b) => ({
        url: `${baseUrl}/search?brand=${encodeURIComponent(b.name)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75,
      }));
    }
  } catch (err) {
    console.warn("Sitemap brand fetch notice:", err);
  }

  // 5. Dynamic Product Pages
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await productService.getProducts();
    if (Array.isArray(products)) {
      const published = products.filter(
        (p) => p.status !== "draft" && p.status !== "unpublished"
      );
      productRoutes = published.map((p) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      }));
    }
  } catch (err) {
    console.warn("Sitemap product fetch notice:", err);
  }

  return [
    ...staticRoutes,
    ...audienceRoutes,
    ...categoryRoutes,
    ...brandRoutes,
    ...productRoutes,
  ];
}
