import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { WishlistProvider } from "@/lib/WishlistContext";
import { RfqProvider } from "@/lib/RfqContext";
import { ProductModalProvider } from "@/lib/ProductModalContext";
import { PreferencesProvider } from "@/lib/PreferencesContext";
import { headers } from "next/headers";
import StorefrontShell from "@/components/layout/StorefrontShell";
import { generateOrganizationJsonLd, generateWebSiteJsonLd, SITE_URL } from "@/lib/seo";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
    template: "%s | AYAAN CLOTHING",
  },
  description:
    "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel, bulk fashion export, and custom OEM manufacturing for international buyers. Est. 2010.",
  authors: [{ name: "AYAAN CLOTHING" }],
  creator: "AYAAN CLOTHING",
  publisher: "AYAAN CLOTHING",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AYAAN CLOTHING",
    title: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
    description:
      "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel for international buyers.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AYAAN CLOTHING — Bangladesh Garments Manufacturer & Exporter",
    description:
      "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel for international buyers.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdOrg = generateOrganizationJsonLd();
  const jsonLdWebSite = generateWebSiteJsonLd();

  const headersList = await headers();
  const host = headersList.get("host") || "";
  const isAdminHeader = headersList.get("x-is-admin-host") === "1" || headersList.get("x-admin-app") === "true";
  const isAdminHost = isAdminHeader || host.includes(":3001") || host.startsWith("admin.") || host === "admin.localhost";

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground`}>
        <AuthProvider>
          <PreferencesProvider>
            <CartProvider>
              <WishlistProvider>
                <RfqProvider>
                  <ProductModalProvider>
                    <StorefrontShell isAdminHost={isAdminHost}>{children}</StorefrontShell>
                  </ProductModalProvider>
                </RfqProvider>
              </WishlistProvider>
            </CartProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

