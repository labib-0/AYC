import { MetadataRoute } from "next";
import { getCanonicalBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getCanonicalBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/sitemap.xml",
          "/search",
          "/products",
          "/products/",
          "/privacy-policy",
          "/terms-and-conditions",
          "/rfq",
        ],
        disallow: [
          "/ayc",
          "/ayc/*",
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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
