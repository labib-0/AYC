# 04 — Product & Feature Inventory

This document provides a comprehensive inventory of all user-facing, administrative, and background features implemented across the Ayaan Clothing platform.

---

## 1. Feature Catalog Summary

| # | Feature Name | Primary User | Interface / Entry Point | Implementation Status |
|---|---|---|---|---|
| **F-01** | Dynamic Wholesale Catalog & Search | Public Buyer | `/`, `/search`, Header Search | **IMPLEMENTED** |
| **F-02** | Faceted Catalog Filtering | Public Buyer | `/search`, `/categories/[slug]` | **IMPLEMENTED** |
| **F-03** | Product Detail & Media Showcase | Public Buyer | `/products/[slug]` | **IMPLEMENTED** |
| **F-04** | 3-Tier Volume Pricing Engine | Wholesale Buyer | Product Detail, Cart, Checkout | **IMPLEMENTED** |
| **F-05** | Full-Stock Bulk Clearance Buyout | Wholesale Buyer | Product Detail, Cart | **IMPLEMENTED** |
| **F-06** | Package Assortment & Carton Ratio | Wholesale Buyer | Product Detail, Admin Edit | **IMPLEMENTED** |
| **F-07** | Slide-Over MiniCart & Cart Sync | Buyer | Floating Cart Button, `/cart` | **IMPLEMENTED** |
| **F-08** | B2B Wholesale Checkout | Authenticated Buyer | Checkout Modal / Step | **IMPLEMENTED** |
| **F-09** | Bank Wire Payment Proof Review | Buyer & Admin | `/orders/[id]`, `/admin/orders` | **IMPLEMENTED** |
| **F-10** | Request for Quotation (RFQ) Engine | Buyer & Guest | `/rfq`, `/products/[slug]` | **IMPLEMENTED** |
| **F-11** | RFQ Negotiation Thread & Messaging | Buyer & Admin | `/dashboard/rfq`, `/admin/rfq` | **IMPLEMENTED** |
| **F-12** | Commercial Quotations & PDF Exports| Admin & Buyer | `/admin/quotations`, `/dashboard/quotes`| **IMPLEMENTED** |
| **F-13** | Multi-Warehouse Stock Adjustments | Admin | `/admin/inventory` | **IMPLEMENTED** |
| **F-14** | Dynamic Homepage Merchandising | Admin | `/admin/homepage` | **IMPLEMENTED** |
| **F-15** | Sales, Profit & COGS Analytics | Admin | `/admin`, `/admin/analytics` | **IMPLEMENTED** |
| **F-16** | Customer Portal & Document Vault | Customer | `/dashboard/*` | **IMPLEMENTED** |
| **F-17** | System Activity & Audit Trail | Admin | `/admin/activities` | **IMPLEMENTED** |

---

## 2. Exhaustive Feature Specifications

### FEATURE F-01: Dynamic Wholesale Catalog & Search
- **Business Purpose**: Allows wholesale apparel buyers to locate garment styles, fabrics, brands, and categories sourced from real-time database inventory.
- **User**: Unauthenticated visitors and authenticated wholesale buyers.
- **Frontend Implementation**:
  - `src/components/home/ShopByBrand.tsx`: Dynamic brand showcase.
  - `src/components/home/HotSales.tsx`: Curated promotional category carousel.
  - `src/components/home/FeaturedProducts.tsx`: Curated featured product grid.
  - `src/components/layout/Header.tsx`: Debounced instant search bar with autocomplete suggestions.
  - `src/services/product.service.ts`: `getProducts()`, `searchProducts()`.
- **Backend Implementation**:
  - `ProductController::index`: Supports full-text search across `name`, `description`, `sku`, `style_code`.
  - `SearchController::suggestions`: Returns fast prefix matches.
- **API Endpoints**:
  - `GET /api/v1/products?search={term}&category={id}&brand={id}`
  - `GET /api/v1/search/suggestions?q={term}`
  - `GET /api/v1/homepage`
- **Database Tables**: `products`, `brands`, `categories`, `product_images`.
- **Validation**: Query strings sanitized, pagination capped at 50 items per page.
- **Permissions**: Public access.
- **Empty State**: When no products match, renders search-specific empty state with suggestions to clear active filters.
- **Source Files**: `src/app/search/page.tsx`, `backend/app/Http/Controllers/Api/V1/ProductController.php`.

---

### FEATURE F-02: Faceted Catalog Filtering
- **Business Purpose**: Enables wholesale buyers to narrow down large inventories by international apparel industry dimensions.
- **Supported Facets**:
  - **Audience**: Fixed RMG taxonomy (`MEN`, `WOMEN`, `BOYS`, `GIRLS`, `UNISEX`).
  - **Design Type**: Factory manufacturing tier (`ORIGINAL`, `MASTER COPY`).
  - **Brands**: Dynamically pulled from active backend brands (`brands` table).
  - **Categories**: Dynamically pulled from active backend categories (`categories` table).
  - **Price Range**: Min/max wholesale pricing bounds.
  - **Availability**: In stock only (`stock_status = 'in_stock'`).
- **Frontend Implementation**: `src/lib/filters.ts`, `src/app/search/page.tsx`.
- **Backend Implementation**: `ProductController::index` query scopes (`whereAudience`, `whereDesignType`, `whereBrand`, `whereCategory`).
- **Zero Mock Rule**: Brand and Category filter options are constructed solely from live backend entities.

---

### FEATURE F-03: Product Detail & Media Showcase
- **Business Purpose**: Displays complete technical manufacturing specifications, fabric composition, size matrices, and wholesale pricing.
- **Key Capabilities**:
  - **4:5 Aspect Ratio Gallery**: Strict portrait aspect ratio standard for garments modeling photography (`src/components/product/ProductGallery.tsx`).
  - **YouTube Video Embed**: Supports factory inspection and runway video embeds (`youtube-nocookie.com/embed/{id}`).
  - **Variant Selection**: Interactive color swatches and size pickers updating available SKU stock in real time.
- **Source Files**: `src/app/products/[slug]/page.tsx`, `src/components/product/ProductGallery.tsx`.

---

### FEATURE F-04: 3-Tier Volume Pricing Engine
- **Business Purpose**: Incentivizes bulk wholesale orders by automatically lowering the per-unit price as order quantities scale.
- **Rules**:
  - **Tier 1 (Base / Small Lot)**: Quantity 1–29 pcs -> Standard wholesale unit price.
  - **Tier 2 (Medium Bulk)**: Quantity 30–99 pcs -> Discounted rate (e.g., 8–12% off base).
  - **Tier 3 (Container / Large Lot)**: Quantity 100+ pcs -> Maximum wholesale volume discount (e.g., 15–25% off base).
- **Frontend**: `src/components/product/PricingTierOption.tsx`, `src/lib/CartContext.tsx`.
- **Backend Enforcement**: `backend/app/Services/Order/OrderCalculationService.php`.
- **Database Tables**: `product_pricing_tiers`, `products`.

---

### FEATURE F-05: Full-Stock Bulk Clearance Buyout
- **Business Purpose**: Allows liquidation or clearance buyers to purchase the entire remaining warehouse inventory of a product in complete pre-packed packages.
- **Rules**:
  - **Always Visible**: The Full Stock option is **ALWAYS VISIBLE** on the product page, regardless of stock level or eligibility flag.
  - **Quantity**: Locks quantity to available complete package stock ($Q = \text{maxCompletePackages} \times \text{MOQ}$), never exceeding live available inventory ($\text{OnHand} - \text{Reserved}$).
  - **Pricing**:
    - If $\text{AvailableInventory} > \text{MinimumBulkOrderQuantity}$: applies `full_stock_price`.
    - If $\text{AvailableInventory} \le \text{MinimumBulkOrderQuantity}$: falls back to the **normal MOQ / standard applicable price** ($P_{\text{moq}}$).
  - **Dynamic Server-Side Recalculation**: Backend independently re-evaluates live inventory and pricing modes at cart addition, cart update, and checkout (`OrderCalculationService`).
- **Source Files**: `src/components/product/PricingTierOption.tsx`, `src/app/products/[slug]/ProductDetailView.tsx`, `src/services/product.service.ts`, `src/lib/CartContext.tsx`, `backend/app/Models/Product.php`, `backend/app/Services/Order/OrderCalculationService.php`.

---

### FEATURE F-06: Package Assortment & Master Carton Ratio
- **Business Purpose**: In garment export, apparel is shipped in master cartons packed in strict size ratios (e.g., 1x XS, 2x S, 3x M, 3x L, 2x XL, 1x XXL = 12 pcs per inner pack).
- **Capabilities**:
  - Displays size breakdown per carton.
  - Computes carton count, gross weight (kg), and volumetric cubic meters (CBM).
  - Admin can configure carton allocations in product editor.
- **Database Tables**: `product_package_allocations`, `product_shipping_package_profiles`.

---

### FEATURE F-07: Slide-Over MiniCart & Cart Sync
- **Business Purpose**: Provides persistent order accumulation across browsing sessions without forcing full-page reloads.
- **Features**:
  - LocalStorage persistence synchronized with backend cart table (`carts`, `cart_items`) upon login.
  - Automatic tier recalculation as quantities cross tier boundaries.
  - Step increment enforcement based on package assortment lot size.
- **Source Files**: `src/components/cart/MiniCart.tsx`, `src/lib/CartContext.tsx`.

---

### FEATURE F-08: B2B Wholesale Checkout & Order Placement
- **Business Purpose**: Completes formal commercial order booking.
- **Payment Methods Supported**:
  1. **Bank Wire Transfer / TT**: Direct transfer to Pubali Bank Limited, Dhaka.
  2. **Letter of Credit (LC)**: Irrevocable documentary credit for bulk maritime export.
  3. **Direct Commercial Invoice**: Payment on Net 30/60 terms for approved corporate buyers.
- **State Machine**: Starts at `pending_payment` or `under_review`.
- **Source Files**: `src/app/checkout/page.tsx` (or modal checkout), `backend/app/Http/Controllers/Api/V1/OrderController.php`.

---

### FEATURE F-09: Bank Wire Payment Proof Review Workflow
- **Business Purpose**: Provides commercial security for international bank wire transactions.
- **Workflow**:
  1. Customer uploads scanned bank deposit slip or SWIFT MT103 confirmation document.
  2. Order status shifts to `payment_verification_pending`.
  3. Admin views high-resolution slip in dedicated modal (`/admin/orders/[id]`).
  4. Admin clicks **Verify Payment** (moves order to `confirmed` and triggers inventory deduction) or **Reject** with custom feedback.
- **Database Tables**: `orders`, `payments`, `order_status_events`.

---

### FEATURE F-10 & F-11: B2B RFQ & Interactive Negotiation Engine
- **Business Purpose**: High-value custom apparel manufacturing contracts require bespoke quotations rather than fixed catalogue checkout.
- **Capabilities**:
  - Buyer inputs target quantity (e.g., 5,000 pcs), target price, custom fabric requirements, target delivery date, and technical pack attachments.
  - Direct messaging thread between buyer and merchandiser (`rfq_messages`).
  - Real-time status transitions: `submitted` → `under_review` → `quoted` → `accepted` / `declined`.
- **Source Files**: `src/app/rfq/page.tsx`, `src/app/dashboard/rfq/page.tsx`, `backend/app/Http/Controllers/Api/V1/RfqController.php`.

---

### FEATURE F-12: Commercial Quotations & Multi-Format PDF Generation
- **Business Purpose**: Compiles legally binding export proforma documents for customs clearance and bank letters of credit.
- **Formats Generated**:
  1. **Commercial Invoice (CI)**: Post-manufacturing export invoice.
  2. **Proforma Invoice (PI)**: Pre-production contract document containing Pubali Bank SWIFT credentials.
  3. **Delivery Challan (DC)**: Warehouse packing and dispatch document.
  4. **Offer Sheet (OS)**: Product line presentation sheet with high-res garment photos.
- **Engine**: Generated dynamically in client (`jspdf`, `jspdf-autotable`) and backed by backend document services (`CommercialInvoiceService.php`).

---

### FEATURE F-13: Multi-Warehouse Inventory & Product Creation Allocation
- **Business Purpose**: Tracks physical stock across multiple factory floors and bonded warehouses in Dhaka, Gazipur, and Chattogram, and seamlessly integrates product creation with authoritative inventory records.
- **Capabilities**:
  - **Product Creation Allocation**: When creating a product in the admin portal, the administrator explicitly specifies product MOQ, initial stock units, and the target active warehouse.
  - **Single Source of Truth**: Connects initial stock directly into the real `inventories` table (linked to `product_variants` and `warehouses`). Automatically creates default variant if no variant matrix is provided.
  - **Audited Stock Initialization**: Every initial stock allocation records an entry in `admin_inventory_adjustments` with `reason: 'Initial stock on product creation'` and the creator's `admin_user_id`.
  - **Complete MOQs Availability Calculation**: Dynamically computes and displays complete orderable MOQs ($\lfloor \text{Available Stock} / \text{MOQ} \rfloor$) on Admin Product Creation, Admin Product List, and Public Storefront Product Cards.
  - **Edit Safeguard**: In product edit mode, physical warehouse stock quantities are read-only to preserve audit integrity; adjustments must occur via the audited inventory adjustment view.
  - **Multi-Warehouse Stock Adjustments**: Supports stock replenishment, physical count corrections, and damage write-offs with reason codes.
  - **Reserve Stock Locking**: Locks inventory during checkout validation and releases upon cancellation.
- **Source Files**: `src/components/admin/products/form/ProductInventorySection.tsx`, `src/components/admin/products/form/ProductForm.tsx`, `src/app/admin/inventory/page.tsx`, `backend/app/Http/Controllers/Api/V1/ProductController.php`, `backend/app/Http/Controllers/Api/V1/Admin/InventoryController.php`.

---

### FEATURE F-14: Dynamic Merchandising & Homepage Control
- **Business Purpose**: Gives merchandising executives complete authority over homepage layout, hero banners, brand visibility, and hot sale items without developer intervention.
- **Capabilities**:
  - Hero banner manager (headline, subhead, CTA URL, background image).
  - Shop By Brand manager (drag-to-reorder, landing page visibility toggle).
  - Hot Sale category manager (select categories for homepage spotlight).
  - Featured products curator (select top garment lines for homepage grid).
- **Source Files**: `src/app/admin/homepage/page.tsx`, `backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php`.

---

### FEATURE F-15: Financial Analytics & COGS Intelligence
- **Business Purpose**: Provides executive visibility into actual manufacturing profitability.
- **Mathematical Basis**:
  - `Gross Profit = Sales Subtotal - COGS`
  - `COGS = Sum(Order Items Quantity * buying_price_at_sale)`
- **Visuals**: Recharts interactive line charts and bar charts for daily/monthly profit trends.
- **Source Files**: `src/app/admin/page.tsx`, `backend/app/Services/Analytics/SalesProfitAnalyticsService.php`.
