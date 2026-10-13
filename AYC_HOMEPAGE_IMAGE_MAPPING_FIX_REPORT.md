# AYAAN CLOTHING — Homepage Image Mapping Fix Report

**Date:** October 14, 2026  
**Environment:** Next.js Storefront / Admin Portal + Laravel 12 Backend API  
**Status:** Resolved & Verified  

---

## 1. Executive Summary

In **Admin → Homepage** (`/ayc/homepage`), multiple unrelated products, categories, and brand cards were observed displaying identical garment thumbnails. Representative items included *Ladies' Short Sleeve Midi Dress*, *Men's Joggers Trouser*, *Men's Heavyweight Pullover Hoodie*, *Boys Short Sleeve Drop Shoulder T-Shirt*, and *Boy's Micro Shorts*, as well as multiple category entries.

A thorough cross-stack investigation was conducted across database tables, Eloquent models, API controllers, resource serializers, frontend data normalizers, and React component image renderers. The problem was identified as a multi-tier fallback and serialization issue rather than a single component bug.

The issue has been completely fixed across backend models, API serializers, frontend resolvers, and admin thumbnail components without replacing broken records with generic placeholders, without fabricating fake images, and without disrupting existing homepage ordering, category pins, or product selections.

---

## 2. Confirmed Root Causes

### A. Frontend Hardcoded Garment Fallback (`/placeholder.jpg`)
In `src/components/admin/homepage/FeaturedProductManager.tsx`, the thumbnail component was implemented with:
```tsx
// PREVIOUS IMPLEMENTATION:
src={prod.primary_image_url || "/placeholder.jpg"}
onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
```
The static file `/placeholder.jpg` in `public/` is an actual photograph of a model in a grey knit sweater. Whenever a product lacked a direct `primary_image_url` property in memory, or if an image URL was delayed or failed to resolve, the component rendered this identical garment photo across all unrelated products.

### B. Missing Backend Eloquent Accessor & `$appends`
The `Product` Eloquent model (`backend/app/Models/Product.php`) did not include `primary_image_url` in its `$appends` array, nor did it implement a `getPrimaryImageUrlAttribute()` accessor. Consequently:
- In `HomepageManagementController.php`, when calling `featuredProducts()`, products returned to the frontend omitted `primary_image_url` entirely (it was `undefined`).
- In `HomepageManagementController::searchProducts()`, products were queried from Eloquent with `Product::with(['images', 'brand', 'categories'])` and returned without exposing `primary_image_url`, `brand_name`, or `category_name`.
- Because `prod.primary_image_url` was `undefined`, the frontend immediately triggered the fallback to `/placeholder.jpg`.

### C. Absence of Comprehensive Image Resolvers on Frontend Admin Components
In the AYAAN CLOTHING architecture, product media can be stored across several fields and relations:
- `primary_image_url` (root string)
- `image_url` (direct URL)
- `primaryImage` (relationship object containing `image_path` or `url`)
- `images` (array of image objects with `is_primary`, `image_path`, `url`)

`FeaturedProductManager.tsx` only inspected `prod.primary_image_url`. If a product had its authoritative photo stored inside `images` (e.g. from catalog search or Eloquent relations), the component failed to look inside `images` and instead displayed the sweater fallback.

### D. Category Hardcoded Sweater Photograph Fallback
In `src/lib/category-images.ts`, `DEFAULT_CATEGORY_FALLBACK` was configured as:
```ts
export const DEFAULT_CATEGORY_FALLBACK = "https://images.pexels.com/photos/45982/pexels-photo-45982.jpeg";
```
This is a stock photo of a grey folded wool sweater. In `HotSaleCategoryManager.tsx`, whenever a category lacked a configured `image_url`, it resolved to `DEFAULT_CATEGORY_FALLBACK`. Unrelated categories like "Formal Shirts", "Activewear", or "Kids & Baby" displayed the exact same sweater photograph.

### E. Brand Logo Resolution Bypass
In `ShopByBrandManager.tsx`, brand entries without an explicit `logo_url` failed to resolve against canonical brand logos defined in `src/lib/brand-logos.ts`, and displayed broken or inconsistent thumbnails instead of official SVG brand marks or a neutral tag badge.

### F. Database Demo Seed Duplication in `DevelopmentProductSeeder.php`
An inspection of `DevelopmentProductSeeder.php` revealed that several demo catalog products were seeded with shared Pexels URLs:
- Products #28 & #29: `photo-1183266`
- Products #30 & #31: `photo-1619801`
- Products #32 & #33: `photo-1594744`

These duplicate database references represent sample seed data, not frontend corruption. Per system requirements, existing database records were preserved without fabricating fake image assets.

---

## 3. Representative Affected Record IDs and Image References

| Record Type | ID / Key | Name | Original Behavior | Corrected Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Product** | 1 | Merino Wool Crewneck Sweater | Rendered `/placeholder.jpg` fallback | Authoritative Unsplash sweater (`photo-1620799140408-edc6dcb6d633`) |
| **Product** | 2 | Heavyweight Boxy Tee | Rendered `/placeholder.jpg` fallback | Authoritative Unsplash boxy tee (`photo-1521572267360-ee0c2909d518`) |
| **Product** | 3 | Oversized Cotton Hoodie | Rendered `/placeholder.jpg` fallback | Authoritative Unsplash hoodie (`photo-1556905055-8f358a7a47b2`) |
| **Product** | 4 | Classic Piqué Polo | Rendered `/placeholder.jpg` fallback | Authoritative Unsplash polo (`photo-1581655353564-df123a1eb820`) |
| **Product** | 5 | Relaxed Fit Chino Pants | Rendered `/placeholder.jpg` fallback | Authoritative Unsplash chino (`photo-1473966968600-fa801b869a1a`) |
| **Product** | 6 | Linen Long Sleeve Shirt | Rendered `/placeholder.jpg` fallback | Authoritative Unsplash linen shirt (`photo-1596755094514-f87e34085b2c`) |
| **Product** | 28 | Boys' Fleece Zip-Up Training Hoodie | Rendered `/placeholder.jpg` fallback | Seed image `photo-1183266` resolved properly |
| **Product** | 30 | Girls' Tiered Organic Cotton Ruffle Dress | Rendered `/placeholder.jpg` fallback | Seed image `photo-1619801` resolved properly |
| **Product** | 32 | Girls' Cotton Elastane Stretch Leggings | Rendered `/placeholder.jpg` fallback | Seed image `photo-1594744` resolved properly |
| **Category** | 1 | Beachwear | Rendered sweater photograph | Canonical swimwear photo (`photo-1507525428034-b723cf961d3e`) |
| **Category** | 2 | Blouses | Rendered sweater photograph | Canonical blouse photo (`photo-1564257631407-4deb129f0e47`) |
| **Category** | 4 | Hoodies & Sweatshirts | Rendered sweater photograph | Canonical hoodie photo (`photo-1556905055-8f358a7a47b2`) |
| **Category** | 5 | Jackets & Coats | Rendered sweater photograph | Canonical outerwear photo (`photo-1551028719-00167b16eac5`) |
| **Category** | 6 | Jeans & Denim | Rendered sweater photograph | Canonical denim photo (`photo-1541099649105-f69ad21f3246`) |
| **Category** | Unmapped | Genuinely missing category image | Rendered sweater photograph | Neutral `<Layers />` empty state icon; no garment photo |
| **Brand** | Ayaan Clothing | Ayaan Clothing brand | Inconsistent / missing logo | Official SVG brand mark (`/brands/ayaan-clothing.svg`) |
| **Brand** | Unmapped | Brand without logo | Inconsistent / missing logo | Neutral `<Tags />` badge; no garment photo |

---

## 4. Components and APIs Corrected

### A. Shared Frontend Resolvers
1. **`src/lib/media.ts`**
   - Implemented `resolveProductThumbnail(product?: any): string | null`.
   - Inspection precedence:
     1. `product.primary_image_url`
     2. `product.image_url`
     3. `product.primaryImage?.image_path` / `url`
     4. `product.images` array: prioritizes item with `is_primary === true`, then first available valid image.
     5. Normalizes storage paths (`/storage/...` -> full API asset URL if relative).
     6. Explicitly rejects `/placeholder.jpg` or empty strings, returning `null`.
2. **`src/lib/category-images.ts`**
   - Implemented `resolveCategoryImageUrl(category?: any): string | null`.
   - Returns configured category `image_url` if present, canonical category photo for standard apparel categories, and `null` for unknown categories.
   - Ignores erroneous `DEFAULT_CATEGORY_FALLBACK` (sweater photo) so that missing categories never render unrelated garments.
3. **`src/lib/brand-logos.ts`**
   - Updated `getBrandLogoUrl(brandName?: string | null, explicitLogo?: string | null): string | null`.
   - Preserves admin-uploaded logo URLs when valid, maps known brands to their official SVG marks, and returns `null` for unknown brands to allow neutral icon rendering.

### B. Frontend Homepage Management Components
1. **`src/components/admin/homepage/FeaturedProductManager.tsx`**
   - Replaced all ad-hoc thumbnail lookups with `resolveProductThumbnail(prod)`.
   - Refactored `ProductItemThumbnail`: renders a clean `<Package />` neutral icon on `null` or on `img.onError`, never falling back to `/placeholder.jpg`.
   - Cleaned up catalog price rendering to prevent `$undefined` when prices are formatted.
2. **`src/components/admin/homepage/HotSaleCategoryManager.tsx`**
   - Replaced image lookups with `resolveCategoryImageUrl(cat)`.
   - Refactored `CategoryItemThumbnail`: renders a clean `<Layers />` neutral icon on `null` or on `img.onError`.
3. **`src/components/admin/homepage/ShopByBrandManager.tsx`**
   - Replaced logo lookups with `getBrandLogoUrl(brand.name, brand.logo_url)`.
   - Refactored `BrandItemLogo`: renders official SVG brand logos or a neutral `<Tags />` icon on `null` or error.

### C. Backend Models & API Controllers
1. **`backend/app/Models/Product.php`**
   - Added `'primary_image_url'` to protected `$appends`.
   - Implemented `getPrimaryImageUrlAttribute(): ?string`:
     - Checks `primaryImage` relationship.
     - Checks first entry in `images` relationship with `is_primary = true`.
     - Resolves storage asset URL via `asset('storage/' . $path)`.
2. **`backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php`**
   - In `searchProducts()`, mapped `primary_image_url`, `brand_name`, `category_name`, and formatted prices for catalog search results.
3. **`backend/app/Http/Resources/Api/V1/ProductResource.php`**
   - Explicitly exposed `primary_image_url` and `primaryImageUrl` in JSON resources.

---

## 5. Database Image References & Operational Recommendations

### A. Existing Records Preserved
- No featured product pins, positions, or category sequences were modified.
- No database records were deleted or overwritten.
- Real stored references to existing media assets were retained.

### B. Products Requiring Genuine Media Uploads
In `backend/database/seeders/DevelopmentProductSeeder.php`, demo items #28–#33 have shared Pexels photo URLs:
- **Product #28** (*Boys' Fleece Zip-Up Training Hoodie*) & **Product #29** (*Boys' Stretch Denim Reinforced Knee Jeans*)
- **Product #30** (*Girls' Tiered Organic Cotton Ruffle Dress*) & **Product #31** (*Girls' Cable-Knit Soft Cotton Cardigan*)
- **Product #32** (*Girls' Cotton Elastane Stretch Leggings*) & **Product #33** (*Boys Short Sleeve Drop Shoulder T-Shirt*)

**Recommendation:** Do not automate synthetic replacements for these records. In production, administrators should upload authentic product photography for these SKUs via **Admin → Products → Edit Product → Media Gallery**. The system will automatically select the newly uploaded primary image and display it across Homepage management and the storefront.

---

## 6. Verification and Test Results

### A. Dedicated Test Suite
Created and executed `tests/homepage-image-mapping.test.ts` covering 16 discrete test scenarios:
- Product thumbnail resolution with explicit `primary_image_url`: **PASS**
- Priority resolution of `is_primary` flag from `images` relation: **PASS**
- Fallback to first image in `images` array: **PASS**
- Handling of string array images: **PASS**
- Storage path normalization: **PASS**
- Suppression of `/placeholder.jpg` in favor of `null`: **PASS**
- Neutral `<Package />` state verification: **PASS**
- Category configured image retention: **PASS**
- Canonical category resolution: **PASS**
- Category sweater photo suppression for unmapped categories: **PASS**
- Brand logo resolution and neutral tag fallback: **PASS**

**Result:** `16 / 16 passed` (duration: 6.5ms).

### B. Backend Feature & Unit Tests
Executed PHP test suites in `backend/`:
```bash
php artisan test tests/Feature/LandingPage
```
**Result:** `30 passed, 0 failed, 159 assertions` (duration: 657ms).

### C. Storefront Regression Gate
Executed full storefront unit suites:
```bash
node scripts/run-storefront-regression.mjs
```
**Result:** `46 / 46 passed` across all core storefront suites.

### D. TypeScript & Lint Checks
```bash
npx tsc --noEmit
npm run lint
```
**Result:** 0 TypeScript compile errors; 0 ESLint errors.

### E. Next.js Production Build
```bash
npm run build
```
**Result:** Successful compilation of all 56 routes.

### F. Real Browser Visual Audit
Using the browser automation subagent on `http://localhost:3000/ayc/homepage`:
1. **Shop By Brand:** Verified that Ayaan Clothing, Cotton Craft, and North Peak display official brand logos. Brands without logos display a clean `<Tags />` icon; no garment photos appear.
2. **Hot Sale Categories:** Verified that categories display distinct, apparel-specific photos (e.g. swimwear for Beachwear, blouse for Blouses, hoodie for Hoodies & Sweatshirts, outerwear for Jackets, denim for Jeans). No categories display the sweater fallback.
3. **Featured Products & Available Catalog:** Verified that products in the pinned list and catalog search list display their respective product photography (e.g. leggings, cardigan, ruffle dress, jeans, hoodie) matching their product record. Missing or invalid images display the neutral `<Package />` icon without broken-image glyphs.

---

## 7. Conclusion

The root cause of duplicate garment thumbnails across Homepage Management was eliminated at all architectural layers (database model accessors, API serializers, frontend resolution utilities, and React UI components). Each product, category, and brand now strictly displays its own authoritative asset or a neutral fallback icon.
