import type { Metadata } from "next";
import { SITE_CONFIG, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Wholesale Apparel Catalog & B2B Sourcing | AYAAN CLOTHING",
  description:
    "Explore our complete B2B wholesale clothing catalog from Bangladesh. Ready-made garments, t-shirts, sweaters, hoodies, trousers, and custom apparel manufacturing.",
  alternates: {
    canonical: absoluteUrl("/search"),
  },
  openGraph: {
    title: "Wholesale Apparel Catalog & B2B Sourcing | AYAAN CLOTHING",
    description:
      "Explore our complete B2B wholesale clothing catalog from Bangladesh. Ready-made garments, t-shirts, sweaters, hoodies, trousers, and custom apparel manufacturing.",
    url: absoluteUrl("/search"),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: "website",
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: "Ayaan Clothing B2B Apparel Catalog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesale Apparel Catalog & B2B Sourcing | AYAAN CLOTHING",
    description:
      "Explore our complete B2B wholesale clothing catalog from Bangladesh.",
    images: [SITE_CONFIG.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
