# AYC — Technical SEO & Google Search Console Guide

## 1. Technical SEO Architecture

Ayaan Clothing incorporates enterprise technical SEO conventions across the public storefront to maximize organic search discovery for international ready-made garments (RMG) sourcing.

### Core SEO Invariants
1. **Canonical Host**: All indexing points to the canonical apex domain `https://ayaanclothing.com` (enforced via HTTPS 301 redirects in Nginx).
2. **Dynamic XML Sitemap**: Generated on demand at `/sitemap.xml` with ISO-8601 `lastmod` timestamps reflecting actual product catalog update times.
3. **Structured Data**: Schema.org JSON-LD embedded on the homepage and every product detail page.
4. **Proxy URL Normalization**: Prevents crawler errors caused by leading slash submissions in search engine webmaster tools.

---

## 2. Dynamic XML Sitemap & URL Normalization

### 2.1 Implementation (`src/app/sitemap.ts`)
The sitemap dynamically aggregates:
- Core storefront routes (`/`, `/products`, `/search`, `/privacy-policy`, `/terms-and-conditions`).
- Published wholesale products from `/api/v1/products` with change frequency set to `daily` and priority `0.8`.
- Accurate `lastmod` dates pulled from `products.updated_at`.

```typescript
// Sample generated sitemap entry
<url>
  <loc>https://ayaanclothing.com/products/mens-pima-cotton-polo</loc>
  <lastmod>2026-10-10T14:22:18+00:00</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.8</priority>
</url>
```

### 2.2 Leading Slash Normalization in `src/proxy.ts`
When site administrators submit sitemaps in the Google Search Console (GSC) input field, webmaster tools prefix the domain (`https://ayaanclothing.com/`) with whatever input is typed. If an operator types `/sitemap.xml`, the resulting requested path is `//sitemap.xml`.

Many web servers issue an HTTP 308 or 301 redirect for double slashes. However, Googlebot often marks redirected sitemap submissions as *"Couldn't fetch"*.

**The Solution in `src/proxy.ts`**:
```typescript
// Rewrite double-slash sitemap requests directly to canonical path without redirect hops
if (url.pathname !== '/sitemap.xml' && /^\/+sitemap\.xml\/?$/i.test(url.pathname)) {
  url.pathname = '/sitemap.xml';
  return NextResponse.rewrite(url);
}
if (url.pathname !== '/robots.txt' && /^\/+robots\.txt\/?$/i.test(url.pathname)) {
  url.pathname = '/robots.txt';
  return NextResponse.rewrite(url);
}
```
This rewrite serves the clean XML payload with an immediate **HTTP 200 OK**, completely resolving crawler fetch errors.

---

## 3. Crawl Directives (`/robots.txt`)

Generated dynamically at `src/app/robots.ts`:
```txt
User-agent: *
Allow: /
Allow: /products
Allow: /products/*
Allow: /search
Allow: /privacy-policy
Allow: /terms-and-conditions

# Disallow private customer account and checkout services
Disallow: /cart
Disallow: /checkout
Disallow: /dashboard/
Disallow: /profile/
Disallow: /order-access/
Disallow: /auth/

# Disallow administrative operations portal
Disallow: /ayc/
Disallow: /admin/
Disallow: /api/

Sitemap: https://ayaanclothing.com/sitemap.xml
```

---

## 4. Structured Data (Schema.org JSON-LD)

### 4.1 Organization & B2B Exporter Entity (Homepage)
Embedded in `src/app/page.tsx`:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Ayaan Clothing",
  "legalName": "M/S AYAAN  CLOTHING",
  "url": "https://ayaanclothing.com",
  "logo": "https://ayaanclothing.com/storage/branding/logo.png",
  "description": "Ready-Made Garments Manufacturer & International Apparel Exporter",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "House #33 (2nd floor), Road #12, Sector #11",
    "addressLocality": "Uttara",
    "addressRegion": "Dhaka",
    "postalCode": "1230",
    "addressCountry": "BD"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+8801620853502",
    "contactType": "customer service",
    "availableLanguage": ["English", "Bengali"]
  }
}
```

### 4.2 Wholesale Product Structured Data (PDP)
Embedded in `src/app/products/[slug]/page.tsx`:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Men's Pima Cotton Pique Polo Shirt",
  "image": ["https://ayaanclothing.com/storage/products/polo-hero.webp"],
  "description": "Premium 220 GSM combed cotton polo shirt with reactive dye and twin-needle stitching.",
  "sku": "EXP-POLO-001",
  "brand": {
    "@type": "Brand",
    "name": "Ayaan Clothing"
  },
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "4.20",
    "highPrice": "5.50",
    "offerCount": "3",
    "availability": "https://schema.org/InStock",
    "eligibleQuantity": {
      "@type": "QuantitativeValue",
      "minValue": "50",
      "unitCode": "C62"
    }
  }
}
```

---

## 5. Google Search Console (GSC) Setup Guide for Site Owners

Site owners must perform the following manual steps inside Google Search Console:

### Step 5.1: Property Verification
1. Log in to [Google Search Console](https://search.google.com/search-console).
2. Choose **URL prefix**: `https://ayaanclothing.com` (or Domain verification).
3. Select **HTML tag** method. Copy the verification string (e.g., `google-site-verification=abc123xyz...`).
4. In the AYC Admin Portal, navigate to `/ayc/homepage` $\to$ **SEO & Search Console Verification**.
5. Paste the verification token and click **Save Verification Token**.
6. Return to Google Search Console and click **Verify**.

### Step 5.2: Sitemap Submission
1. In the GSC sidebar, select **Sitemaps**.
2. Under "Add a new sitemap", enter `sitemap.xml` (do NOT type a leading slash).
3. Click **Submit**.
4. Confirm the status changes to **Success**.

### Step 5.3: Troubleshooting GSC "Couldn't Fetch"
- If GSC displays "Couldn't fetch", verify that:
  1. The path was entered as `sitemap.xml` rather than `//sitemap.xml`.
  2. The server returns HTTP 200 for `curl -I https://ayaanclothing.com/sitemap.xml`.
  3. No Bangladesh access restrictions are blocking Googlebot (Googlebot crawls from US IP addresses; domestic Geo-blocking does not affect US crawlers).
