import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/search",
          "/products/",
          "/rfq",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/profile",
          "/profile/*",
          "/dashboard",
          "/dashboard/*",
          "/order-access",
          "/order-access/*",
          "/cart",
          "/checkout",
          "/login",
          "/signup",
          "/api/*",
          "/_next/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
