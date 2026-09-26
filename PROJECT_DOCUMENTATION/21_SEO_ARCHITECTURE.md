# 21 — SEO Architecture & Search Engine Optimization

## 1. Technical SEO Architecture Overview

The Ayaan Clothing platform implements an enterprise B2B apparel export SEO strategy built on **Next.js 16 metadata APIs**, automated schema.org structured data injection, dynamic sitemap compilation, and strict crawl directives.

---

## 2. Structured Data (Schema.org) Implementation

All Schema.org JSON-LD generation is centralized in [`src/lib/seo/structured-data.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/seo/structured-data.ts) and configured via [`src/lib/seo/config.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/seo/config.ts):

### 2.1 Organization & WebSite Schema (`generateOrganizationJsonLd`, `generateWebSiteJsonLd`)
Injected into the HTML `<head>` on all public storefront pages via [`src/app/layout.tsx`](file:///Users/luhasan/Documents/ayaan/src/app/layout.tsx):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "AYAAN CLOTHING",
  "legalName": "AYAAN CLOTHING",
  "alternateName": "AYC",
  "url": "https://ayaanclothing.com",
  "logo": "https://ayaanclothing.com/logo.png",
  "description": "Ready-made garments manufacturer and exporter from Bangladesh. B2B wholesale apparel, bulk fashion export, and custom OEM manufacturing for international buyers. Est. 2010.",
  "foundingDate": "2010",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "House #33 (2nd floor), Road #12, Sector #11",
    "addressLocality": "Uttara, Dhaka",
    "postalCode": "1230",
    "addressCountry": "BD"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+880 1842-786000",
    "contactType": "sales",
    "availableLanguage": ["English", "Bengali"]
  }
}
```

### 2.2 Product & Wholesale Offer Schema (`generateProductJsonLd`)
Rendered on `/products/[slug]` via [`src/lib/seo/product.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/seo/product.ts):
- `@type`: `Product`
- `name`: Garment Title (e.g., "Heavyweight French Terry Cotton Hoodie")
- `image`: Array of high-resolution 4:5 garment photographs.
- `sku`: Master product SKU.
- `offers`: `@type: AggregateOffer` containing lowest Tier 3 price (`lowPrice`), highest Tier 1 price (`highPrice`), `priceCurrency: "USD"`, and `availability: "https://schema.org/InStock"`.
- `manufacturer`: `@type: Organization, name: "AYAAN CLOTHING"`.

### 2.3 BreadcrumbList Schema (`generateBreadcrumbJsonLd`)
Implemented in [`src/lib/seo/breadcrumbs.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/seo/breadcrumbs.ts) providing structured navigation trails (`Home > Categories > T-Shirts > Heavyweight Cotton Tee`) recognized by Google for rich snippet rendering.

---

## 3. Dynamic XML Sitemap Engine (`src/app/sitemap.ts`)

Next.js automatically serves `/sitemap.xml` by executing [`src/app/sitemap.ts`](file:///Users/luhasan/Documents/ayaan/src/app/sitemap.ts). The generator dynamically aggregates URLs from the backend REST API:

1. **Static Marketing Roots**: `/`, `/search`, `/rfq`.
2. **Category URLs**: Iterates `GET /api/v1/categories`, generating `/search?category={slug}` entries.
3. **Brand URLs**: Iterates `GET /api/v1/brands`, generating `/search?brand={slug}` entries.
4. **Product Detail Pages**: Iterates `GET /api/v1/products?limit=1000`, generating `/products/{slug}` with `lastModified` timestamps reflecting `updated_at`.
5. **Fault-Tolerant Generation**: If the backend is temporarily unreachable during a build, the generator catches the error, logs a diagnostic notice, and outputs the static core sitemap without failing the production build.

---

## 4. Crawl Directives (`src/app/robots.ts`)

Served dynamically at `/robots.txt`:
```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/profile/',
          '/order-access/',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: 'https://ayaanclothing.com/sitemap.xml',
  };
}
```

---

## 5. SEO Status Matrix

| SEO Dimension | Implementation Status | Technical Details |
|---|:---:|---|
| **Title & Meta Tags** | **IMPLEMENTED** | Dynamic `generateMetadata()` on product, search, and category routes |
| **Open Graph & Twitter Cards** | **IMPLEMENTED** | Summary cards with large 4:5 featured garment images |
| **Organization Schema** | **IMPLEMENTED** | Global JSON-LD injected in root layout via `structured-data.ts` |
| **Product Schema** | **IMPLEMENTED** | Schema.org AggregateOffer compliant with Merchant Center rules |
| **Breadcrumb Schema** | **IMPLEMENTED** | Dynamic hierarchy built per garment style |
| **Dynamic XML Sitemap** | **IMPLEMENTED** | Aggregates all DB products, categories, and brands |
| **Robots Directives** | **IMPLEMENTED** | Disallows admin, dashboard, profile, and internal API routes |
| **Hreflang / Multilingual** | **PARTIALLY IMPLEMENTED** | English default; Bengali contact metadata; multi-locale URL paths planned |
