# AYC Admin Page Builder / CMS — Full Architecture Audit & Implementation Blueprint

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-29  
**Target Environment:** Ayaan Clothing (`https://ayaanclothing.com`)  
**Project Root:** `/Users/labibhasan/Documents/AYC`  
**Phase:** Prompt 1 of 3 (Architecture Audit & Implementation Blueprint)  

---

## Executive Summary

This document provides the complete, authoritative architecture audit and implementation blueprint for the new **Admin Page Builder / Storefront CMS** for Ayaan Clothing. 

The Page Builder will empower authorized administrators to author, organize, preview, schedule, publish, and maintain rich, standalone storefront business pages (e.g. *About Us*, *Sustainability*, *Manufacturing Facilities*, *Quality Assurance*, *Private Label Sourcing*, *Wholesale Terms*, etc.) entirely through the Admin Control Center without touching application code or requiring deployments.

### Core Architectural Invariants Established in This Blueprint
1. **Zero Layout Breakage:** The storefront layout shell (Header, Navigation, Breadcrumbs, Footer) is 100% preserved. The footer adds a dynamic **Pages** column alongside the existing **Brand** and **Category** columns without replacing or distorting either.
2. **Safe, Structured Section Model:** Replaces arbitrary HTML code entry with a typed, responsive section-block model (`HeroBanner`, `RichText`, `ImageText`, `FeatureGrid`, `FaqAccordion`, `CallToAction`, `GalleryGrid`). Content is stored as validated JSON and rendered through hardened, accessible React components.
3. **Robust Slug & Route Precedence:** Dynamic storefront pages are served at root slugs (e.g. `https://ayaanclothing.com/sustainability`) via a Next.js App Router dynamic segment (`src/app/[slug]/page.tsx`) protected by an authoritative **Reserved Slugs Registry** that prevents collisions with system routes (`/ayc`, `/cart`, `/checkout`, `/search`, etc.).
4. **Native RBAC & Media Pipeline:** Integrates 1:1 with Laravel's existing RBAC permission matrix and uses the existing high-performance WebP media pipeline (`UploadController` & `ProductImagePipelineService`) for uploaded assets.
5. **Instant Storefront Revalidation:** Leverages multi-tier caching (Next.js ISR tags, client service in-memory caches, and browser storage events) so that publishing or unpublishing a page updates the footer and page routes immediately across all open tabs and devices without redeployment.

---

## 1. Current Admin Architecture & Page Builder Entry Point

### 1.1 Existing Admin Layout & Navigation Structure
- **Admin Root Route:** `/ayc` (`src/app/ayc/page.tsx` and `src/app/ayc/AdminLayoutClient.tsx`)
- **Navigation Component:** [`src/components/admin/layout/AdminSidebar.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/layout/AdminSidebar.tsx#L49-L114)
- **Current Navigation Categories:**
  - `OVERVIEW`: Dashboard (`/ayc/dashboard`)
  - `CATALOG`: Products (`/ayc/products`), Inventory (`/ayc/inventory`), Categories (`/ayc/categories`), Brands (`/ayc/brands`)
  - `COMMERCE`: Orders (`/ayc/orders`), RFQs (`/ayc/rfq`), POS (`/ayc/pos`), Customers (`/ayc/customers`)
  - `MARKETING`: Coupons (`/ayc/coupons`), Coupon Sales (`/ayc/coupon-sales`)
  - `STOREFRONT`: Homepage (`/ayc/homepage`)
  - `DOCUMENTS`: Commercial Documents (`/ayc/documents`)
  - `ADMINISTRATION`: Administrators (`/ayc/administrators`), Roles & Permissions (`/ayc/roles`), Settings & Config (`/ayc/settings`)

### 1.2 Recommended Page Builder Entry Point
The new Page Builder belongs natively under the **`STOREFRONT`** section in `AdminSidebar.tsx`, immediately alongside `Homepage`:

```typescript
{
  title: "STOREFRONT",
  items: [
    {
      label: "Homepage",
      href: "/ayc/homepage",
      icon: PanelTop,
      permission: ADMIN_PERMISSIONS.HOMEPAGE_VIEW,
    },
    {
      label: "Pages (CMS)",
      href: "/ayc/pages",
      icon: LayoutTemplate, // or BookOpen / FileText from lucide-react
      permission: ADMIN_PERMISSIONS.PAGE_VIEW,
    },
  ],
}
```

### 1.3 Admin UI Route Structure
```text
src/app/ayc/pages/
├── page.tsx                       // Master CMS Pages List (table, search, status filters, actions)
├── new/
│   └── page.tsx                   // Create New Page
├── [id]/
│   └── page.tsx                   // Edit Page Builder (tabbed section editor, settings, SEO, preview)
```

### 1.4 Admin Component Architecture
The builder will leverage established Admin UI patterns:
- **Table & Filters:** Reuses table pagination, search filters, status badges, and action dropdowns from `src/components/admin/products/ProductTable.tsx` and `BrandTable.tsx`.
- **Reordering Controls:** Reuses [`src/components/admin/ordered-list/TableMoveControls.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/ordered-list/TableMoveControls.tsx) for section reordering (Move Up / Move Down buttons) ensuring accessibility without third-party drag-and-drop complexity.
- **Media Upload:** Reuses [`src/components/admin/brands/BrandLogoUploader.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/brands/BrandLogoUploader.tsx) / `BannerImageUploader.tsx` with WebP optimization.
- **Form Validation & Modals:** Standard Lucide icons, accessible dialogs (`BrandDeleteDialog`), and Toast feedback (`ProductToast`).

---

## 2. Storefront Footer Integration (Dynamic Third Column: Brand, Category, Pages)

### 2.1 Current Footer Inspection
- **File:** [`src/components/layout/Footer.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Footer.tsx#L117-L250)
- **Container:** `mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8`
- **Current Grid Definition:**
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-8 lg:gap-7 pb-12 border-b border-white/10">
  ```
- **Current Column Breakdown:**
  1. Column 1: **Branding / About Us** (`lg:col-span-3`)
  2. Column 2: **SHOP** (`lg:col-span-2`)
  3. Column 3: **CATEGORIES** (`lg:col-span-2`)
  4. Column 4: **BRANDS** (`lg:col-span-2`)
  5. Column 5: **WHOLESALE SOURCING & CONTACT** (`lg:col-span-3`)
  - Total Col Spans: `3 + 2 + 2 + 2 + 3 = 12`

### 2.2 Dynamic Pages Column Design
The user requirement dictates:
> "The storefront footer currently includes the existing Brand and Category sections. The new CMS must introduce an additional column alongside them for pages created and published by administrators. The required footer structure is:
> - Brand
> - Category
> - Pages"

#### Before & After Layout Structure

**Before (Current 5 Columns):**
```text
┌───────────────┬───────────┬──────────────┬──────────────┬─────────────────────────┐
│ Branding & Us │   SHOP    │  CATEGORIES  │    BRANDS    │ Wholesale & Contact     │
│ (col-span-3)  │(col-span-2│ (col-span-2) │ (col-span-2) │ (col-span-3)            │
└───────────────┴───────────┴──────────────┴──────────────┴─────────────────────────┘
```

**After (New 6 Columns with Dynamic Pages):**
```text
┌───────────────┬───────────┬──────────────┬──────────────┬──────────────┬─────────────────────────┐
│ Branding & Us │   SHOP    │  CATEGORIES  │    BRANDS    │    PAGES     │ Wholesale & Contact     │
│  (1.25fr/2.5) │ (1fr/1.75)│  (1fr/1.75)  │  (1fr/1.75)  │  (1fr/1.75)  │  (1.25fr/2.5)           │
└───────────────┴───────────┴──────────────┴──────────────┴──────────────┴─────────────────────────┘
```

#### Responsive Grid Implementation
To guarantee balance and prevent wrapping across viewport widths:
- **Mobile (`<640px`):** `grid-cols-1` (clean single-column accordion/stack with 44px touch targets).
- **Small Tablet (`sm: 640px–767px`):** `sm:grid-cols-2` (balanced 2x3 grid).
- **Tablet / Small Laptop (`md: 768px–1023px`):** `md:grid-cols-3` (balanced 3x2 grid).
- **Desktop (`lg: >=1024px`):**
  - If `footerPages.length > 0`: `lg:grid-cols-6 gap-6` (or `lg:grid-cols-12` with Spans: 2.5 / 1.75 / 1.75 / 1.75 / 1.75 / 2.5 via CSS Grid template `grid-template-columns: 2.5fr 1.75fr 1.75fr 1.75fr 1.75fr 2.5fr`).
  - If `footerPages.length === 0`: Falls back cleanly to `lg:grid-cols-5` (or current `lg:grid-cols-12` spans `3/2/2/2/3`), completely omitting the Pages column without leaving an empty blank area or gap.

#### Dynamic Pages Column JSX Specification
```tsx
{/* COLUMN 5 — DYNAMIC CMS PAGES (Rendered only when active pages exist) */}
{footerPages.length > 0 && (
  <div className="lg:col-span-2">
    <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
      PAGES
    </h3>
    <ul className="flex flex-col gap-2 text-[13px] text-white/75">
      {footerPages.map((page) => (
        <li key={page.id || page.slug}>
          <Link
            href={`/${page.slug}`}
            className="hover:text-white transition-colors truncate block max-w-full"
            title={page.footer_label || page.title}
          >
            {page.footer_label || page.title}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)}
```

### 2.3 Automatic Storefront Revalidation & Real-Time Sync
In `Footer.tsx`, taxonomy data is currently fetched on mount and updated via listeners:
```typescript
const [rawCats, landingBrands, publicPages] = await Promise.all([
  categoryService.getCategories({ is_active: true, all: true }),
  getStorefrontLandingBrands(),
  pageService.getFooterPages(),
]);
```
- **Instant Event Trigger:** When an admin creates, updates, reorders, publishes, or deletes a page in `/ayc/pages`, the admin client fires:
  ```typescript
  window.dispatchEvent(new CustomEvent("ayaan:page-updated"));
  window.dispatchEvent(new CustomEvent("ayaan:data-updated"));
  window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_cms_pages_updated" }));
  ```
- **Result:** Any active storefront tab in the browser immediately invalidates its cached footer list and re-renders the new links without requiring a page refresh or server rebuild.

---

## 3. Dynamic Page Routing & Handling of Slugs

### 3.1 Next.js App Router Structure
```text
src/app/
├── [slug]/
│   └── page.tsx        // Public CMS Dynamic Route Renderer
```

### 3.2 Route Precedence in Next.js 16 (App Router)
Next.js App Router prioritizes routes deterministically:
1. **Explicit Static Segments** (e.g. `src/app/privacy-policy/page.tsx`, `src/app/faq/page.tsx`, `src/app/cart/page.tsx`) have **highest precedence**.
2. **Dynamic Segments** (`src/app/[slug]/page.tsx`) match any route not matched by a static segment.
3. Catch-all / Not Found segments execute when no dynamic record is found.

### 3.3 Reserved Slugs Registry
To prevent an administrator from unintentionally setting a slug that collides with existing or future application routes, an authoritative list of reserved words will be enforced in both the Laravel request validation and the React form UI:

```typescript
export const RESERVED_SLUGS = [
  "admin", "ayc", "api", "auth",
  "cart", "checkout", "compliance", "dashboard",
  "faq", "login", "order-access", "privacy-policy",
  "products", "profile", "rfq", "search", "signup",
  "terms-and-conditions", "wishlist",
  "sitemap", "robots", "manifest", "favicon", "images", "assets", "static"
] as const;
```

### 3.4 Canonical Redirects & 404 Behavior
In `src/app/[slug]/page.tsx`:
```typescript
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DynamicCmsPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Fetch published page data from server-side service
  const page = await pageService.getPublishedPageBySlug(slug);

  // 2. If page does not exist or is not published -> trigger native 404
  if (!page || page.status !== "published") {
    notFound();
  }

  // 3. If accessed via an outdated slug that was changed -> 301 Permanent Redirect
  if (page.previous_slugs && page.previous_slugs.includes(slug)) {
    redirect(`/${page.slug}`);
  }

  return <CmsPageView page={page} />;
}
```

---

## 4. Breadcrumbs & Page Hierarchy

### 4.1 Integration with Existing Breadcrumb Architecture
- **Existing Component:** [`src/components/common/StorefrontBreadcrumbs.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/common/StorefrontBreadcrumbs.tsx)
- **Existing SEO Generator:** [`src/lib/seo/breadcrumbs.ts`](file:///Users/labibhasan/Documents/AYC/src/lib/seo/breadcrumbs.ts)

### 4.2 Hierarchy Design
CMS pages will support an optional `parent_id` (pointing to another `cms_pages.id`).
- **Standalone Page (Default):**
  - Trail: `Home` (`/`) → `{Page Title}`
- **Nested Page (e.g., Sustainability under About Us):**
  - Trail: `Home` (`/`) → `{Parent Page Title}` (`/{parent-slug}`) → `{Current Page Title}`
- **Breadcrumb Customization:** Admins can specify a dedicated `breadcrumb_label` (e.g., "QA Standards") if the full `title` is long (e.g., "International Quality Assurance & Inspection Standards").
- **JSON-LD Schema.org:** Emits standard `BreadcrumbList` script tags with exact canonical URLs and integer positions.

---

## 5. Content Model, Section Schema & Database Architecture

### 5.1 Why a Structured Section Architecture?
| Evaluation Criterion | WYSIWYG HTML Blob (TinyMCE/CKEditor) | Structured Section Blocks (Recommended) |
| :--- | :--- | :--- |
| **XSS / Script Injection** | High Risk (complex HTML sanitizer required) | **Zero Risk** (strictly typed JSON values) |
| **Storefront Design Integrity** | Low (admins can break fonts, colors, grids) | **100% Guaranteed** (renders design system components) |
| **Responsive Mobile Layout** | Fragile (tables and fixed widths overflow) | **Native & Fluid** (responsive by default) |
| **Maintenance & Longevity** | Painful (stale inline CSS persists in DB) | **Clean & Decoupled** (templates update cleanly) |
| **Bundle Size Overhead** | Heavy (+300KB to +1MB external JS) | **Zero Dependencies** (pure React + Tailwind) |

### 5.2 Section Types & Schema
Every page contains a `sections` JSON array. Each element has:
- `id`: Unique string (e.g. `sec_1730160000000`)
- `type`: Enum section identifier
- `is_visible`: Boolean
- `data`: Typed payload object

#### Supported Section Types:
1. **`hero_banner`**: Full-width or boxed header with title, subtitle, optional badge, background image/overlay, and primary/secondary CTA buttons.
2. **`rich_text`**: Formatted typography block supporting headings (H2, H3), paragraphs, bullet points, and callout quotes.
3. **`image_text`**: Two-column responsive split (text on left/right, optimized WebP image on right/left) with CTA button.
4. **`feature_grid`**: 2, 3, or 4-column card grid with icons (from Lucide library), card titles, and descriptions.
5. **`faq_accordion`**: Interactive FAQ accordions with question/answer pairs.
6. **`gallery_grid`**: Responsive 3–4 column image showcase with lightbox support.
7. **`call_to_action`**: High-conversion banner with bold headline, supporting message, and button links.

### 5.3 Database Migration: `cms_pages` Table
```sql
CREATE TABLE `cms_pages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `sections` JSON NOT NULL,
  `draft_sections` JSON NULL,
  `parent_id` BIGINT UNSIGNED NULL,
  `breadcrumb_label` VARCHAR(100) NULL,
  `show_in_footer` BOOLEAN NOT NULL DEFAULT 0,
  `footer_label` VARCHAR(100) NULL,
  `footer_sort_order` INT NOT NULL DEFAULT 0,
  `meta_title` VARCHAR(255) NULL,
  `meta_description` TEXT NULL,
  `canonical_url` VARCHAR(500) NULL,
  `og_image_url` VARCHAR(500) NULL,
  `is_indexable` BOOLEAN NOT NULL DEFAULT 1,
  `scheduled_publish_at` TIMESTAMP NULL,
  `scheduled_unpublish_at` TIMESTAMP NULL,
  `published_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `previous_slugs` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `idx_cms_pages_status` (`status`),
  INDEX `idx_cms_pages_footer` (`show_in_footer`, `footer_sort_order`),
  INDEX `idx_cms_pages_slug` (`slug`),
  FOREIGN KEY (`parent_id`) REFERENCES `cms_pages`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 6. API Operations (Public & Admin)

### 6.1 Public Endpoints (Storefront & Caching)
- `GET /api/v1/pages/footer`
  - Returns only pages where `status = 'published'` and `show_in_footer = 1`.
  - Ordered by `footer_sort_order ASC`, `title ASC`.
  - Returns minimal payload: `id, slug, title, footer_label`.
- `GET /api/v1/pages/{slug}`
  - Returns published page matching `slug` with full `sections`, metadata, and breadcrumbs.
  - Returns `404` if not published or archived.
- `GET /api/v1/pages/published`
  - Lightweight endpoint for `sitemap.ts` listing all published indexable slugs and `updated_at`.

### 6.2 Authenticated Admin Endpoints (`role:admin`)
- `GET /api/v1/admin/pages`: List all pages with pagination, search, status filters.
- `POST /api/v1/admin/pages`: Create page with initial metadata and sections.
- `GET /api/v1/admin/pages/{id}`: Detailed page data including draft & published sections.
- `PUT /api/v1/admin/pages/{id}`: Save edits (updates `draft_sections` or published sections).
- `PATCH /api/v1/admin/pages/{id}/publish`: Publish or unpublish.
- `PATCH /api/v1/admin/pages/{id}/footer`: Toggle footer visibility, change label or sort order.
- `PUT /api/v1/admin/pages/reorder-footer`: Bulk reorder footer order.
- `DELETE /api/v1/admin/pages/{id}`: Soft-delete page.
- `POST /api/v1/admin/pages/{id}/restore`: Restore deleted page.
- `POST /api/v1/admin/pages/{id}/preview-token`: Generate secure, signed preview token.

---

## 7. Authentication, RBAC & Content Security

### 7.1 Permissions Catalog Addition (`Permission.php` & `permissions.ts`)
```php
'page.view'          => ['name' => 'View CMS Pages',        'module' => 'Storefront', 'action' => 'view',          'description' => 'View list and details of CMS storefront pages', 'requires' => []],
'page.create'        => ['name' => 'Create CMS Page',       'module' => 'Storefront', 'action' => 'create',        'description' => 'Create new storefront CMS pages and drafts',    'requires' => ['page.view']],
'page.edit'          => ['name' => 'Edit CMS Page',         'module' => 'Storefront', 'action' => 'edit',          'description' => 'Edit page sections, styling, and metadata',     'requires' => ['page.view']],
'page.publish'       => ['name' => 'Publish CMS Page',      'module' => 'Storefront', 'action' => 'publish',       'description' => 'Publish, unpublish, or schedule CMS pages',      'requires' => ['page.view', 'page.edit']],
'page.delete'        => ['name' => 'Delete CMS Page',       'module' => 'Storefront', 'action' => 'delete',        'description' => 'Archive or soft-delete CMS pages',              'requires' => ['page.view']],
'page.footer.manage' => ['name' => 'Manage Footer Pages',   'module' => 'Storefront', 'action' => 'footer.manage', 'description' => 'Control page visibility and order in the footer','requires' => ['page.view']],
```

### 7.2 Media Upload Pipeline
Reuses [`backend/app/Http/Controllers/Api/V1/UploadController.php`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/UploadController.php#L66-L105):
- Add `'pages'` to accepted folders in `UploadController`:
  ```php
  'pages' => $this->authorization->can($user, 'page.edit') || $this->authorization->can($user, 'page.create'),
  ```
- Uploaded images are passed through `ProductImagePipelineService`: validated for real binary image MIME types, stripped of metadata/EXIF, converted to modern WebP, and stored in `public/storage/pages/`.

---

## 8. SEO Metadata, Sitemap & Structured Data Integration

### 8.1 Next.js `generateMetadata`
In `src/app/[slug]/page.tsx`:
- Generates dynamic `<title>`, `<meta name="description">`, `<link rel="canonical">`, and Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`).
- Honors `is_indexable`: if `false`, outputs `robots: { index: false, follow: false }`.

### 8.2 Sitemap Integration (`src/app/sitemap.ts`)
In [`src/app/sitemap.ts`](file:///Users/labibhasan/Documents/AYC/src/app/sitemap.ts#L84-L150), fetch all published pages and add to sitemap entries:
```typescript
const cmsPages = await pageService.getPublishedPages();
const cmsRoutes = cmsPages
  .filter((p) => p.is_indexable !== false && p.status === "published")
  .map((p) => ({
    url: canonicalUrl(`/${p.slug}`),
    lastModified: parseAuthoritativeDate(p.updated_at) || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
return [...staticRoutes, ...productRoutes, ...cmsRoutes];
```

---

## 9. Responsive Design & Accessibility (WCAG 2.1 AA)

- **Layout Grid:** Responsive Tailwind classes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Typography:** Fluid scaling (`text-2xl sm:text-3xl lg:text-4xl`), readable leading (`leading-relaxed`), compliant color contrast ratios (> 4.5:1).
- **Navigation Touch Targets:** Minimum 44x44px touch targets on mobile for all buttons, links, and pagination controls.
- **Accordion A11y:** Native `<details><summary>` or button accordions with `aria-expanded` and `aria-controls`.
- **Keyboard Navigation:** Explicit visible focus rings (`focus-visible:ring-2 focus-visible:ring-ring`).

---

## 10. Implementation Plan for Prompt 2 (Step-by-Step)

### Phase 1: Backend Foundation & API
1. Create migration `create_cms_pages_table.php`.
2. Create Eloquent model `CmsPage.php` with JSON casts, scopes, and relationships.
3. Update `RbacPermissionCatalogSeeder.php` and `Permission.php` with CMS permissions.
4. Add `'pages'` folder support to `UploadController.php`.
5. Implement `AdminCmsPageController.php` (CRUD, status toggle, reordering, draft preview).
6. Implement `PublicCmsPageController.php` (`/pages/footer`, `/pages/{slug}`).
7. Register routes in `backend/routes/api.php`.

### Phase 2: Frontend Data Services & Context
1. Create `src/types/cms.ts` with complete TypeScript interfaces for pages and sections.
2. Create `src/services/cms-page.service.ts` for Admin and Public API requests.
3. Update `src/lib/permissions.ts` with `PAGE_*` constants.

### Phase 3: Admin Page Builder UI
1. Add "Pages (CMS)" item to `AdminSidebar.tsx`.
2. Build `src/app/ayc/pages/page.tsx` (Pages list table, filters, delete dialog).
3. Build `src/app/ayc/pages/new/page.tsx` and `src/app/ayc/pages/[id]/page.tsx`.
4. Build section editors (`HeroBannerEditor`, `RichTextEditor`, `FeatureGridEditor`, etc.) with move/delete controls.
5. Build multi-device preview drawer (Desktop, Tablet, Mobile).

### Phase 4: Storefront Dynamic Route & Footer Integration
1. Build `src/app/[slug]/page.tsx` with server metadata, JSON-LD, and section renderers.
2. Update `src/components/layout/Footer.tsx` to add the dynamic **Pages** column.
3. Update `src/app/sitemap.ts` to include published CMS pages.
4. Update `src/components/common/StorefrontBreadcrumbs.tsx` to support CMS page hierarchies.

---

## 12. Prompt 2 Implementation & Verification Summary (Completed)

All architectural components specified in the Prompt 1 blueprint have been fully implemented and verified locally without touching or migrating production environments.

### 12.1 Backend Implementation
1. **Migration (`backend/database/migrations/2026_10_29_000000_create_cms_pages_table.php`):**
   - Creates `cms_pages` table with full support for drafts, published sections snapshot, hierarchy (`parent_id`), dynamic footer placement (`show_in_footer`, `footer_label`, `footer_sort_order`), SEO metadata, scheduling, previous slugs for 301 redirects, soft deletes, and composite indexes.
2. **Eloquent Model (`backend/app/Models/CmsPage.php`):**
   - Declares `RESERVED_SLUGS` constant matching Next.js app routes.
   - Casts JSON sections, boolean flags, and datetime timestamps.
   - Provides query scopes: `scopePublished()`, `scopeFooterVisible()`, `scopeIndexable()`.
   - Business helpers: `publishDraft()`, `unpublish()`, `archive()`.
3. **RBAC Catalog (`Permission.php`, `RbacPermissionCatalogSeeder.php`, `src/lib/permissions.ts`):**
   - Registered permissions: `page.view`, `page.create`, `page.edit`, `page.publish`, `page.delete`, `page.footer.manage`.
4. **Validation Requests (`StoreCmsPageRequest.php`, `UpdateCmsPageRequest.php`):**
   - Enforces unique slug, alphanumeric hyphenated format, and strict exclusion of `CmsPage::RESERVED_SLUGS`.
5. **Controllers & API Routes (`AdminCmsPageController.php`, `PublicCmsPageController.php`, `routes/api.php`):**
   - Admin CRUD, draft publishing, unpublishing, archiving, restoring, soft deletion, and footer placement reordering.
   - Public storefront endpoints: `/api/v1/pages/footer`, `/api/v1/pages/published`, `/api/v1/pages/{slug}`.
6. **Media Upload Pipeline (`UploadController.php`, `src/lib/services/storage.ts`):**
   - Added `'pages'` folder authorized by `page.edit` or `page.create`.
   - Created `uploadCmsPageImage()` client helper with offline Data URL fallback.

### 12.2 Frontend & Storefront Implementation
1. **TypeScript Definitions (`src/types/cms.ts`):**
   - Strict typing for all 7 section models (`HeroBannerData`, `RichTextData`, `ImageTextData`, `FeatureGridData`, `FaqAccordionData`, `GalleryGridData`, `CallToActionData`), full page model, footer items, and `RESERVED_SLUGS`.
2. **Data & Caching Service (`src/services/cms-page.service.ts`):**
   - Multi-tier caching with in-flight request deduplication for footer items.
   - Cross-tab synchronization via `StorageEvent` and custom event dispatchers (`ayaan:page-updated`, `ayaan:page-footer-updated`, `ayaan:data-updated`).
   - In-memory mock fallback store for offline tests and development.
3. **Storefront Section Components (`src/components/cms/sections/`):**
   - `HeroBannerSection.tsx`, `RichTextSection.tsx`, `ImageTextSection.tsx`, `FeatureGridSection.tsx`, `FaqAccordionSection.tsx`, `GalleryGridSection.tsx`, `CtaSection.tsx`.
   - Dispatcher: `CmsSectionRenderer.tsx` and full page renderer: `CmsPageView.tsx`.
4. **Dynamic Root Route (`src/app/[slug]/page.tsx`):**
   - Priority handling for static Next.js segments.
   - Reserved slug collision rejection with `notFound()`.
   - Automatic 301 redirects for previous slugs.
   - Dynamic server-side SEO metadata and OpenGraph tags generation.
   - Schema.org structured data (`WebPage` & `BreadcrumbList`).
5. **Dynamic Footer PAGES Column (`src/components/layout/Footer.tsx`):**
   - Third dynamic column `PAGES` placed between `BRANDS` and `WHOLESALE SOURCING`.
   - Responsive transition: automatically expands to 6 desktop columns (`lg:grid-cols-6`) when pages exist, cleanly omitting when empty.
   - Instant revalidation upon publishing or reordering without page refresh.
6. **Sitemap Integration (`src/app/sitemap.ts`):**
   - Automatically queries published, indexable CMS pages and attaches authoritative timestamps.

### 12.3 Admin Management & Page Builder UI
1. **Admin Sidebar (`src/components/admin/layout/AdminSidebar.tsx`):**
   - Added `Pages (CMS)` item under `STOREFRONT` with `LayoutTemplate` icon and `ADMIN_PERMISSIONS.PAGE_VIEW`.
2. **Pages Index Table (`src/app/ayc/pages/page.tsx`):**
   - Search by title or slug, status filter tabs (All, Published, Draft, Archived), and "In Footer Only" filter.
   - Table columns: Title & Slug, Status badge, Sections count, Footer Placement toggle, Updated Date, Actions.
   - Actions: Edit, Publish / Unpublish, Archive, View on Storefront, Preview, Delete.
3. **New Page Form (`src/app/ayc/pages/new/page.tsx`):**
   - Title, auto-slug generator, starter templates (Blank, Corporate Story, Wholesale Info, FAQ Guide), footer placement, and SEO basics.
4. **Full Page Editor (`src/app/ayc/pages/[id]/page.tsx`):**
   - 4-tab workflow: Page Sections, General Settings, Footer & Breadcrumbs, SEO & Social.
   - Working draft snapshotting: draft edits are saved separately without modifying live published pages until explicitly published.
   - Publication scheduling (`scheduled_publish_at`, `scheduled_unpublish_at`).
5. **Section Form Editors & Section List (`src/components/admin/pages/`):**
   - Section editors for all 7 section types with `CmsImageUploader`.
   - Section reordering via `TableMoveControls` (Move Up / Move Down), duplicate section, delete section, and add section dropdown.
6. **Multi-Device Preview Modal (`PagePreviewModal.tsx`):**
   - Interactive preview supporting Desktop (1200px), Tablet (768px), and Mobile (375px) viewports.

### 12.4 Verification Results
- **Architecture Test Suite (`tests/cms-page-builder-architecture.test.ts`):** 13/13 tests PASSED.
- **TypeScript Compiler (`npx tsc --noEmit`):** 0 errors.
- **Production Build (`npm run build`):** PASSED in 2.7s with all 61 static and dynamic pages generated.
- **Footer Regression Test (`tests/footer-navigation-and-contact-links.test.ts`):** 44/44 tests PASSED.
- **Admin Sidebar Test (`tests/admin-sidebar-collapse-expand.test.ts`):** 11/11 tests PASSED.
- **Strict Scope Boundaries Observed:** Zero commits, pushes, or deployments executed during Prompt 2. No changes made to production database or settings.


