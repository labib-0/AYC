# 11 — Frontend Component Catalog

This document details the primary reusable React components across the Customer Storefront and Admin Management Portal, detailing props contracts, dependencies, and architectural responsibilities.

---

## 1. Storefront & Catalog Components

### `ProductCard`
- **File**: `src/components/product/ProductCard.tsx`
- **Purpose**: Primary garment catalog grid presentation component enforcing the 4:5 aspect ratio standard.
- **Props**:
  - `product: Product`: Complete product domain entity.
  - `priority?: boolean`: LCP image optimization flag.
- **Key Features**:
  - 4:5 image container with Next.js `<Image fill sizes="..." />`.
  - Tier 1 wholesale price display with optional promotional strike-through.
  - Interactive "Quick Add" trigger emitting modal event.
  - Audience & Design Type micro-badges (`MEN`, `ORIGINAL`).
- **Where Used**: Homepage featured grid, `/search` results, category landing pages.

### `ProductGallery`
- **File**: `src/components/product/ProductGallery.tsx`
- **Purpose**: High-definition multi-angle garment media inspector with video capability.
- **Props**:
  - `images: ProductImage[]`: Sorted list of image assets.
  - `videoUrl?: string`: Optional YouTube factory/runway embed URL.
  - `title: string`: Accessible alt text root.
- **Internal State**: `activeIndex: number`, `showVideo: boolean`.
- **Where Used**: `/products/[slug]`.

### `PackageAssortmentMatrix`
- **File**: `src/components/product/PackageAssortmentMatrix.tsx`
- **Purpose**: Visualizes pre-assorted carton breakdown (ratio of sizes and colors per carton pack) and calculates maximum packable cartons based on warehouse bottlenecks.
- **Props**:
  - `allocations: ProductPackageAllocation[]`: Array of variant allocations per pack.
  - `maxPackages: number`: Result from `Product::getMaxCompletePackages`.
  - `moq: number`: Minimum carton threshold.
- **Where Used**: Product detail page (`src/app/products/[slug]/ProductDetailView.tsx`).

### `PricingTierOption`
- **File**: `src/components/product/PricingTierOption.tsx`
- **Purpose**: Interactive card selector visualizing wholesale volume breaks and calculating per-unit savings.
- **Props**:
  - `tier: PricingTier`: Tier bounds (`min_quantity`, `max_quantity`, `unit_price`, `savings_percentage`).
  - `selected: boolean`: Current active selection.
  - `onSelect: () => void`: Event callback.
- **Where Used**: `/products/[slug]`, `ProductQuickAddModal`.

### `QuantityStepper`
- **File**: `src/components/product/QuantityStepper.tsx`
- **Purpose**: Wholesale quantity input enforcing Minimum Order Quantity (MOQ) and packaging lot step increments.
- **Props**:
  - `value: number`: Current quantity.
  - `onChange: (val: number) => void`: Change callback.
  - `moq: number`: Minimum threshold.
  - `step?: number`: Lot multiple (e.g., 12 pcs per pack).
  - `max?: number`: Available inventory limit.
- **Where Used**: Product detail page, Quick Add modal, Cart drawer.

### `MiniCart` & `CheckoutModal`
- **Files**: `src/components/cart/MiniCart.tsx`, `src/components/cart/CheckoutModal.tsx`
- **Purpose**: Slide-over wholesale cart drawer and full checkout wizard handling bank wire selection, delivery address entry, and order placement.
- **State**: Consumes `CartContext.tsx` and `AuthContext.tsx`.

### `StorefrontShell`
- **File**: `src/components/layout/StorefrontShell.tsx`
- **Purpose**: Master client layout gatekeeper preventing admin pages from rendering customer headers/footers.
- **Logic**: Inspects port `3001`, subdomain `admin.*`, or pathname `/admin/*`. If admin, renders `<main>` without `<Header>`, `<Footer>`, or `<MiniCart>`.

### `ShopByBrand`
- **File**: `src/components/home/ShopByBrand.tsx`
- **Purpose**: 100% dynamic landing page brand showcase rail driven by PostgreSQL.
- **Data Dependency**: Calls `brandService.getLandingBrands()` (`GET /api/v1/brands/landing`).
- **Event Listeners**: Listens to `ayaan:homepage-updated`, `ayaan:data-updated`, and `storage` events for instant re-rendering.
- **Zero Mock Fallback**: Completely purged of static brand arrays. Renders clean empty state when database brand count is zero.

### `HotSales`
- **File**: `src/components/home/HotSales.tsx`
- **Purpose**: Dynamic category showcase carousel spotlighting admin-selected promotional categories.
- **Data Dependency**: Queries `homepageService.getPublicConfig()` (`GET /api/v1/homepage`).
- **Event Listeners**: Listens to `ayaan:homepage-updated` and `ayaan:data-updated`.

---

## 2. Administrative Merchandising & Control Plane Components

### `ShopByBrandManager`
- **File**: `src/components/admin/homepage/ShopByBrandManager.tsx`
- **Purpose**: Administrative control panel for adding, toggling, and reordering brands on the customer landing page.
- **Features**:
  - Active brand picker modal querying all database brands.
  - Move Up / Move Down buttons for fine-grained order adjustment (`landing_sort_order`).
  - Visibility toggle switch (`is_featured_on_landing`).
  - Dispatches `POST /api/v1/admin/homepage/featured-brands`.
- **Where Used**: `/admin/homepage` (Section 2: SHOP BY BRAND).

### `HotSaleCategoryManager`
- **File**: `src/components/admin/homepage/HotSaleCategoryManager.tsx`
- **Purpose**: Administrative panel for selecting and sequencing product categories displayed in the storefront Hot Sale section.
- **Data API**: `POST /api/v1/admin/homepage/hot-sale-categories`.
- **Where Used**: `/admin/homepage` (Section 3: HOT SALE CATEGORIES).

### `FeaturedProductManager`
- **File**: `src/components/admin/homepage/FeaturedProductManager.tsx`
- **Purpose**: Curates and reorders top garment lines showcased on the landing page featured product grid.
- **Data API**: `POST /api/v1/admin/homepage/featured-products`.
- **Where Used**: `/admin/homepage` (Section 4: FEATURED PRODUCTS).

### `PaymentReviewModal` & `PaymentProofReview`
- **Files**: `src/components/admin/orders/PaymentReviewModal.tsx`, `PaymentProofReview.tsx`
- **Purpose**: Admin inspector for customer-uploaded bank wire deposit slips and SWIFT MT103 remittance proofs.
- **Actions**: "Verify Payment" (moves order to `confirmed` and locks inventory) or "Reject / Request Revision" with feedback note.
- **Data API**: `POST /api/v1/admin/orders/{id}/payment-proof/review`.

### `AramexShipmentDialog`
- **File**: `src/components/admin/orders/AramexShipmentDialog.tsx`
- **Purpose**: Express logistics dispatch dialog submitting weight, CBM, and consignee info to Aramex API.
- **Result**: Stores returned tracking number (`AWB`) and shipping label URL in `orders`.
- **Data API**: `POST /api/v1/admin/orders/{id}/shipment/aramex`.

### `StockAdjustmentModal`
- **File**: `src/components/admin/inventory/StockAdjustmentModal.tsx`
- **Purpose**: Modifies warehouse inventory counts with mandatory audit reason logging (`damage`, `cycle_count`, `production_inflow`).
- **Data API**: `POST /api/v1/admin/inventory/adjust`.

### `RfqMessageComposer` & `RfqMessageThread`
- **Files**: `src/components/admin/rfq/RfqMessageComposer.tsx`, `RfqMessageThread.tsx`
- **Purpose**: Bidirectional threaded chat interface for buyer-factory negotiation on order specs and pricing.

### `RfqQuotationBuilder`
- **File**: `src/components/admin/rfq/RfqQuotationBuilder.tsx`
- **Purpose**: Converts buyer RFQ specs into a legally binding formal commercial proforma quotation.
- **Inputs**: Line item target prices, payment terms (e.g. 30% advance, 70% against B/L), Incoterm (FOB Chittagong, CIF Hamburg), and validity date.
- **Data API**: `POST /api/v1/admin/quotations`.

### `AdminSidebar` & `AdminHeader`
- **Files**: `src/components/admin/layout/AdminSidebar.tsx`, `AdminHeader.tsx`
- **Purpose**: Primary navigation shell for the dedicated admin application on port 3001.
- **Links**: Dashboard, Products, Categories, Brands, Orders, Inventory, RFQ, Quotes, Customers, Promotions, Settings.
- **User Actions**: Displays admin profile, active environment badge, quick links to customer storefront, and secure sign-out.
