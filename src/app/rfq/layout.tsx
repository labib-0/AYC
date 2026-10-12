import type { Metadata } from "next";
import { canonicalUrl, SITE_CONFIG } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Request for Quotation (RFQ)",
  description:
    "Submit a B2B Request for Quotation (RFQ) for wholesale garments, apparel manufacturing, and bulk export orders from Ayaan Clothing in Bangladesh.",
  alternates: {
    canonical: canonicalUrl("/rfq"),
  },
  openGraph: {
    title: "Request for Quotation (RFQ) | Ayaan Clothing",
    description:
      "Submit a B2B Request for Quotation (RFQ) for wholesale garments, apparel manufacturing, and bulk export orders from Ayaan Clothing in Bangladesh.",
    url: canonicalUrl("/rfq"),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: "website",
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: "Ayaan Clothing — Request for Quotation (RFQ)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Request for Quotation (RFQ) | Ayaan Clothing",
    description:
      "Submit a B2B Request for Quotation (RFQ) for wholesale garments, apparel manufacturing, and bulk export orders from Ayaan Clothing in Bangladesh.",
    images: [SITE_CONFIG.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RfqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
