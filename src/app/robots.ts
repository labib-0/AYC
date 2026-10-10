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
          "/search",
          "/products/",
          "/privacy-policy",
          "/terms-and-conditions",
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
          "/rfq",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
