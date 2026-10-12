import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { WishlistProvider } from "@/lib/WishlistContext";
import { RfqProvider } from "@/lib/RfqContext";
import { ProductModalProvider } from "@/lib/ProductModalContext";
import { PreferencesProvider } from "@/lib/PreferencesContext";
import { SiteSettingsProvider } from "@/lib/SiteSettingsContext";
import { headers } from "next/headers";
import StorefrontShell from "@/components/layout/StorefrontShell";
import GlobalNumberInputWheelGuard from "@/components/common/GlobalNumberInputWheelGuard";
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
    default: "Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh",
    template: "%s | Ayaan Clothing",
  },
  description:
    "Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-256x256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  authors: [{ name: "Ayaan Clothing" }],
  creator: "Ayaan Clothing",
  publisher: "Ayaan Clothing",
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
    siteName: "Ayaan Clothing",
    title: "Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh",
    description:
      "Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ayaan Clothing | Garment Manufacturer & Exporter in Bangladesh",
    description:
      "Bangladesh garment manufacturer and exporter supplying wholesale apparel, original-branded stock lots, factory surplus, and custom OEM production to international buyers.",
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
        <GlobalNumberInputWheelGuard />
        <AuthProvider>
          <SiteSettingsProvider>
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
          </SiteSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

