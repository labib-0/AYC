# AYC — Frontend Architecture & Design System

## 1. Next.js 16 App Router Structure & Layouts

Ayaan Clothing is built on **Next.js 16.3.2** utilizing the App Router architecture, React 19, and Tailwind CSS 4. The application serves two distinct user experiences from a single codebase through layout isolation and proxy routing:
1. **Public Customer Storefront & Buyer Portal**: Standard root layout (`src/app/layout.tsx`), header, navigation, and customer drawer.
2. **Dedicated Administrative Portal (`/ayc`)**: Isolated administrative shell (`src/app/ayc/layout.tsx`), sidebar, cashier badge, and administrative navigation.

```
src/app/
├── layout.tsx                     # Global Root Layout (Fonts, Toaster, Metadata)
├── page.tsx                       # Public Wholesale Homepage
├── proxy.ts                       # Next.js 16 Proxy Handler (Host Routing, SEO, GeoIP)
│
├── (storefront)                   # Public Storefront & Buyer Discovery
│   ├── products/                  # Wholesale Catalog Listing & Filters
│   │   └── [slug]/                # Product Detail Page (PDP), Volume Pricing Calculator
│   ├── cart/                      # Wholesale Cart & Assortment Breakdown
│   ├── checkout/                  # Wholesale Checkout & Bank Wire Selection
│   ├── search/                    # Catalog Search & Faceted Filtering
│   ├── wishlist/                  # Buyer Wishlist & Batch Add-to-Cart
│   ├── privacy-policy/            # Dynamic Legal Page
│   └── terms-and-conditions/      # Dynamic Legal Page
│
├── (buyer-portal)                 # Authenticated Customer Self-Service
│   ├── login/                     # Customer Authentication
│   ├── signup/                    # Customer Registration
│   ├── auth/callback/             # Google OAuth Callback
│   ├── rfq/                       # Request for Quotation Submission
│   ├── order-access/[reference]/  # Direct Order Access Gateway
│   ├── dashboard/                 # Buyer Operations Dashboard
│   │   ├── orders/                # Customer Order History & Tracking
│   │   ├── quotes/                # Commercial Quotations Review & Acceptance
│   │   ├── rfq/                   # Active RFQ Message Threads
│   │   ├── documents/             # Customer Commercial Document Center (PI, CI)
│   │   ├── addresses/             # Delivery & Billing Addresses
│   │   └── company/               # Buyer Business Profile
│   └── profile/                   # Customer Account Settings
│
└── ayc/                           # Dedicated Enterprise Administrative Portal
    ├── layout.tsx                 # Administrative App Shell & Protected Navigation
    ├── page.tsx                   # Admin Login & Redirect Controller
    ├── login/                     # Dedicated Admin Login
    ├── dashboard/                 # Executive Sales, Orders & Operations Metrics
    ├── products/                  # Catalog Management, Photo Pipeline & Tiers
    │   ├── new/                   # Product Creation Wizard
    │   └── [id]/edit/             # Product Editor
    ├── categories/                # Category Taxonomy & Landing Page Merchandising
    ├── brands/                    # Brand Taxonomy & Shop-by-Brand Sync
    ├── inventory/                 # Warehouse Balances, Stock Movements & Audit
    ├── orders/                    # Order Fulfillment, Status Transitions & Shipping
    │   └── [id]/                  # Order Detail, Payment Verification & AWB Dispatch
    ├── pos/                       # Cashier POS Terminal (Order Creation & Tender)
    ├── quotations/                # Commercial Quotations Engine
    ├── rfq/                       # Inbound Buyer RFQs & Messaging
    ├── documents/                 # Centralized Commercial Documents Hub
    ├── coupons/                   # Promotion & Discount Campaign Management
    ├── coupon-sales/              # Bound Coupon Sales & Attribution Reporting
    ├── customers/                 # Customer Account Management
    ├── administrators/            # System Admin Accounts & Password Resets
    ├── roles/                     # RBAC Role Definitions & Permission Matrix
    ├── permissions/               # Read-Only Atomic Permissions Catalog
    ├── homepage/                  # Homepage Banners, Ticker, & Featured Grids
    └── settings/                  # Storefront Settings, Business Profile & Wire Info
```

---

## 2. Gateway & Subdomain Routing (`src/proxy.ts`)

Routing logic is governed by `src/proxy.ts`, following the Next.js 16 file convention:
- **Admin Gateway Header Detection**: Inspects `x-admin-app` and `x-is-admin-host` headers set by Nginx and `scripts/admin-proxy.js`.
- **Legacy Namespace Protection**: Requests targeting the retired path `/admin` are intercepted and rewritten to `/_not-found` with an explicit **HTTP 404** status code.
- **Port 3001 Subdomain Rewriting**: In development or direct proxy access on Port 3001, root paths rewrite automatically to `/ayc/dashboard` or `/ayc`.
- **Sitemap & Robots Normalization**: Strips multiple leading slashes (e.g., `//sitemap.xml`) submitted by Google Search Console tools and serves canonical XML directly without issuing redirect hops.
- **Storefront Regional Access Control**: Evaluates client IP against the internal Laravel GeoIP check for storefront catalog browsing while preserving buyer account routes.

---

## 3. Design System & Tokens

AYC uses **Tailwind CSS 4** (`@tailwindcss/postcss`) with CSS variables defining design tokens in `src/app/globals.css`.

### 3.1 Color Palette
The color scheme reflects industrial apparel manufacturing and international trade:
- **Primary Navy (`--primary`)**: `#0f172a` (Slate 900) — authoritative headers, primary action buttons, executive typography.
- **Accent Amber (`--accent`)**: `#f59e0b` (Amber 500) — wholesale highlights, MOQ tags, commercial callouts, rating stars.
- **Success Emerald (`--success`)**: `#10b981` (Emerald 500) — verified payments, in-stock badges, active status indicators.
- **Surface & Backgrounds**:
  - Storefront: Crisp white (`#ffffff`) with subtle cool-slate borders (`#e2e8f0`).
  - Admin Portal: High-contrast slate shell (`#0b1120`) with dark surface cards (`#1e293b`).

### 3.2 Typography
- **Primary Body & Display**: `Inter` and `Manrope` imported via `next/font/google`.
- **Numeric & Financial**: Fixed-width tabular numeric styling (`tabular-nums`) applied across inventory grids, pricing tiers, and commercial invoice line items.

### 3.3 4:5 Fashion Photography Standard
To ensure professional presentation across both storefront and commercial documents, all product card media, gallery displays, and catalog sliders adhere to the **4:5 vertical aspect ratio standard**:
```css
/* Product media container ratio */
aspect-ratio: 4 / 5;
object-fit: cover;
```
This ratio prevents distortion of garment silhouettes and matches international apparel catalog conventions.

### 3.4 Global Numeric Input Spinner Removal
To eliminate distracting browser stepper arrows inside inventory spreadsheets, tier pricing inputs, and POS quantity controls, browser spinners are globally suppressed in `globals.css`:
```css
/* Chrome, Safari, Edge, Opera */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Firefox */
input[type="number"] {
  -moz-appearance: textfield;
}
```

---

## 4. State Management & Data Fetching

### 4.1 React Context Architecture
Client state is managed through modular React Context providers positioned at the root of the respective layout trees:
- `AuthContext`: Manages Sanctum authentication tokens (`localStorage`), current user profile, and session expiry.
- `CartContext`: Manages client-side cart items, syncs with backend `/api/v1/cart`, and revalidates wholesale tier totals.
- `WishlistContext`: Handles buyer favorite lists and provides batch additions into active carts.

### 4.2 Data Fetching & API Client (`src/services/api-client.ts`)
All frontend data fetching routes through `src/services/api-client.ts`:
- **Base URL Resolution**: Resolves `NEXT_PUBLIC_API_URL` (default: `http://127.0.0.1:8000/api/v1`).
- **Authorization Header Injection**: Automatically attaches `Authorization: Bearer <token>` when tokens exist in client storage.
- **Structured Error Handling**: Intercepts HTTP errors and transforms them into standardized `ApiError` instances:
  ```typescript
  export class ApiError extends Error {
    constructor(
      public status: number,
      public message: string,
      public errors?: Record<string, string[]>,
      public data?: any
    ) {
      super(message);
    }
  }
  ```
- **Session Expiry Interception**: Emits authentication logout events on HTTP 401 responses.

---

## 5. Major Storefront Components & UI Catalog

| Component | Path | Purpose |
|---|---|---|
| `Header` | `src/components/layout/Header.tsx` | Main navigation, category menu, search bar, cart badge, customer drawer |
| `Footer` | `src/components/layout/Footer.tsx` | Corporate address, BGMEA reg, WhatsApp link, social icons, legal links |
| `ProductCard` | `src/components/ui/ProductCard.tsx` | 4:5 product photo, brand tag, MOQ badge, lowest unit price, quick view |
| `ProductGallery` | `src/components/products/ProductGallery.tsx` | Vertical thumbnail strip, zoom lens, 4:5 image viewer |
| `TierPricingTable` | `src/components/products/TierPricingTable.tsx` | Dynamic MOQ, bulk, and full-stock price matrix display |
| `PackageBreakdown` | `src/components/products/PackageBreakdown.tsx` | Size/color carton breakdown and complete package calculator |
| `CartDrawer` | `src/components/cart/CartDrawer.tsx` | Slide-over cart preview with live volume tier recalculation |
| `CommercialDocPreview` | `src/components/documents/CommercialDocPreview.tsx` | In-browser A4 preview of Offer Sheet, PI, and CI |

---

## 6. Admin Portal UI Components (`src/components/admin/`)

| Component | Path | Purpose |
|---|---|---|
| `AdminSidebar` | `src/components/admin/AdminSidebar.tsx` | Navigation tree grouped by Operations, Merchandising, Sales, and Governance |
| `PosTerminal` | `src/app/ayc/pos/page.tsx` | High-speed cashier screen with customer lookup, warehouse selector, tender calculator |
| `ProductForm` | `src/components/admin/products/ProductForm.tsx` | Multi-section product creator: media upload, pricing tiers, warehouse stock |
| `InventoryGrid` | `src/components/admin/inventory/InventoryGrid.tsx` | Multi-warehouse balance tables with audited stock adjustment modals |
| `OrderFulfillmentModal` | `src/components/admin/orders/OrderFulfillmentModal.tsx` | Aramex AWB dispatch, courier tracking number assignment |
| `PaymentProofReviewModal`| `src/components/admin/orders/PaymentProofReviewModal.tsx`| Bank wire slip image inspector with Verify / Reject action buttons |
| `CommercialInvoiceDocument`| `src/components/admin/documents/CommercialInvoiceDocument.tsx`| Canonical CI renderer with beneficiary bank wire details |
