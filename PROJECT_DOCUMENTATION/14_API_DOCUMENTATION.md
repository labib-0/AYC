# 14 — Comprehensive REST API Documentation (v1)

Base URL: `http://127.0.0.1:8000/api/v1` (Production: `https://api.ayaanclothing.com/api/v1`)  
Header Standards: All requests must provide `Accept: application/json` and `Content-Type: application/json` (except multipart file uploads which use `multipart/form-data`).  
Session Header: Guest and customer requests provide `X-Session-Id: {session_uuid}` for cart accumulation.  
Authorization Header: Authenticated endpoints require `Authorization: Bearer {sanctum_personal_access_token}`.

---

## 1. System Health & Media Upload

### `GET /health` & `GET /api/v1/health`
- **Purpose**: Liveness and readiness probe for load balancers and deployment verification.
- **Auth**: Public.
- **Controller**: `App\Http\Controllers\Api\V1\HealthController@check`
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-26T02:15:00Z",
    "database": "connected",
    "cache": "operational"
  }
  ```

### `POST /api/v1/upload`
- **Purpose**: General-purpose administrative image/document asset uploader.
- **Auth**: `auth:sanctum`, `role:admin`.
- **Controller**: `App\Http\Controllers\Api\V1\UploadController@upload`
- **Request Body**: `multipart/form-data` with `file: Binary` (JPG, PNG, WEBP, PDF up to 10MB).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "url": "http://127.0.0.1:8000/storage/uploads/products/garment-101.webp",
    "path": "uploads/products/garment-101.webp",
    "filename": "garment-101.webp"
  }
  ```

---

## 2. Authentication & Session Endpoints

### `POST /api/v1/auth/register`
- **Purpose**: Creates a wholesale buyer account.
- **Auth**: Public (Rate limit: `throttle:auth-register` — 10 req/min).
- **Controller**: `App\Http\Controllers\Api\V1\AuthController@register`
- **Request Body**:
  ```json
  {
    "name": "Jane Buyer",
    "email": "buyer@euroapparel.de",
    "password": "SecurePassword123!",
    "company_name": "EuroApparel GmbH",
    "phone": "+49 30 1234567"
  }
  ```
- **Validation**: `name` required, `email` required|email|unique:users, `password` required|min:8, `role` forced to `'customer'`.
- **Response `201 Created`**: Returns issued Sanctum token string and user object.

### `POST /api/v1/auth/login`
- **Purpose**: Authenticates credentials and issues a Personal Access Token.
- **Auth**: Public (Rate limit: `throttle:auth-login` — 5 req/min per IP/email).
- **Controller**: `App\Http\Controllers\Api\V1\AuthController@login`
- **Request Body**: `{ "email": "buyer@euroapparel.de", "password": "SecurePassword123!" }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "token": "42|AbCdEf123456789...",
    "user": {
      "id": 15,
      "name": "Jane Buyer",
      "email": "buyer@euroapparel.de",
      "role": "customer",
      "company_name": "EuroApparel GmbH"
    }
  }
  ```

### `GET /api/v1/auth/me`
- **Purpose**: Session rehydration and token validation.
- **Auth**: `auth:sanctum`.
- **Controller**: `App\Http\Controllers\Api\V1\AuthController@me`
- **Response `200 OK`**: Current user profile object.

### `POST /api/v1/auth/logout`
- **Purpose**: Revokes current active Sanctum token.
- **Auth**: `auth:sanctum`.
- **Controller**: `App\Http\Controllers\Api\V1\AuthController@logout`
- **Response `200 OK`**: `{ "success": true, "message": "Logged out successfully" }`.

### `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/password/forgot`
- **Purpose**: Dispatches password reset notification email with reset token.
- **Auth**: Public (`throttle:password-reset`).
- **Body**: `{ "email": "user@example.com" }`

### `POST /api/v1/auth/reset-password` & `POST /api/v1/auth/password/reset`
- **Purpose**: Resets password using emailed token.
- **Auth**: Public (`throttle:password-reset`).
- **Body**: `{ "email": "...", "token": "...", "password": "...", "password_confirmation": "..." }`

---

## 3. User Profile & Saved Addresses

### `GET /api/v1/users/me` & `PUT /api/v1/users/me`
- **Purpose**: Retrieves or updates customer company contact, VAT number, and settings.
- **Auth**: `auth:sanctum`.
- **Controller**: `App\Http\Controllers\Api\V1\UserController`

### `GET /api/v1/addresses` & `POST /api/v1/addresses`
- **Purpose**: Address book management for international delivery ports and destinations.
- **Auth**: `auth:sanctum`.
- **Controller**: `App\Http\Controllers\Api\V1\AddressController`
- **Body (`POST`)**:
  ```json
  {
    "type": "shipping",
    "name": "Hamburg Warehouse Berth 4",
    "phone": "+49 40 987654",
    "address_line_1": "Kirchenpauerkai 1",
    "city": "Hamburg",
    "postal_code": "20457",
    "country_code": "DE",
    "is_default": true
  }
  ```

### `PUT /api/v1/addresses/{id}` & `DELETE /api/v1/addresses/{id}`
- **Purpose**: Modifies or removes an address record. Scoped strictly to the owning user.

---

## 4. Public Catalog & Homepage Merchandising

### `GET /api/v1/homepage` & `GET /homepage`
- **Purpose**: Authoritative single-payload endpoint feeding storefront landing page.
- **Auth**: Public.
- **Controller**: `App\Http\Controllers\Api\V1\HomepageController@index`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "banner": {
        "headline": "YOUR WHOLESALE APPAREL SOURCING PARTNER",
        "subtitle": "Quality apparel for retailers, boutiques and bulk buyers...",
        "image_url": "/images/homepage-banner.jpg",
        "cta_text": "EXPLORE CATALOG →",
        "destination_type": "anchor",
        "destination_value": "#featured"
      },
      "featured_brands": [
        { "id": 1, "name": "Nike", "slug": "nike", "logo_url": "...", "sort_order": 1 }
      ],
      "hot_sale_categories": [
        { "id": 2, "name": "Sweaters", "slug": "sweaters", "image_url": "...", "sort_order": 0 }
      ],
      "featured_products": [
        { "id": 10, "name": "Heavyweight Cotton Tee", "slug": "heavyweight-cotton-tee", "wholesale_price": 4.50 }
      ]
    }
  }
  ```

### `GET /api/v1/brands/landing`
- **Purpose**: Returns active brands where `is_featured_on_landing = true`, sorted by `landing_sort_order ASC`.
- **Auth**: Public.

### `GET /api/v1/categories/landing`
- **Purpose**: Returns active categories where `is_featured_on_landing = true`, sorted by `landing_sort_order ASC`.
- **Auth**: Public.

### `GET /api/v1/search/suggestions`
- **Purpose**: Instant typeahead search returning matching products, categories, and brands.
- **Query Params**: `q` (minimum 2 characters).

---

## 5. Products Domain (Public & Admin)

### `GET /api/v1/products`
- **Purpose**: Paginated catalog search with faceted filters.
- **Auth**: Public.
- **Controller**: `App\Http\Controllers\Api\V1\ProductController@index`
- **Query Parameters**:
  - `search` / `q`: Keyword matching name, SKU, style_code, fabric_composition.
  - `category`: Category slug or ID.
  - `brand`: Brand slug or ID.
  - `audience`: `MEN`, `WOMEN`, `BOYS`, `GIRLS`, `UNISEX`.
  - `design_type`: `ORIGINAL`, `MASTER COPY`.
  - `min_price`, `max_price`: Numeric filters.
  - `is_featured`: Boolean.
  - `page`: Page index (default: 1).
  - `per_page`: Page size (default: 24).
- **Response `200 OK`**: Paginated array of `ProductResource` objects with pagination metadata.

### `GET /api/v1/products/slug/{slug}` & `GET /api/v1/products/{slugOrId}`
- **Purpose**: Full manufacturing specifications, volume tier pricing, carton profiles, and variants.
- **Auth**: Public.
- **Includes**: `brand`, `categories`, `images`, `pricingTiers`, `packageAllocations`, `variants`, `shippingPackageProfiles`.

### `GET /api/v1/products/{slugOrId}/shipping-specs`
- **Purpose**: Specific carton dimensions, gross/net weight, and CBM profile for freight estimation.

### Administrative Product CRUD (`role: admin`)
- **`POST /api/v1/products`**: Creates new product garment style with initial warehouse stock and MOQ availability.
  - **Auth**: Protected (`role: admin`, permission: `product.create`).
  - **Key Request Body Fields**:
    - `name` (string, required): Product title.
    - `slug` (string, required, unique): SEO URL slug.
    - `sku` (string, required, unique): Product style code / SKU.
    - `wholesale_price` (numeric, required, min: 0): Base wholesale price per piece.
    - `moq` (integer, nullable, min: 1): Minimum order quantity (must be strictly > 0).
    - `initial_stock` (integer, nullable, min: 0): Initial physical stock units (must be >= 0).
    - `warehouse_id` (integer, nullable, exists:warehouses,id): Target active warehouse for initial stock booking.
    - `variants` (array, optional): Variant combinations (color, size, price, stock). If omitted, a standard default variant is generated automatically.
  - **Response (201 Created)**:
    - Returns serialized `ProductResource` including:
      - `stock` / `available_stock`: Net available units (`on_hand - reserved`).
      - `on_hand_stock`: Physical units in warehouse.
      - `reserved_stock`: Committed units.
      - `available_moqs`: Number of complete MOQs available ($\lfloor \text{available\_stock} / \text{moq} \rfloor$).
      - `warehouse_breakdown`: Detailed breakdown by warehouse location.
- **`PUT /api/v1/products/{id}`**: Updates garment specs, prices, MOQ, and status (`draft`, `published`, `archived`). (Physical inventory quantities are protected and adjusted via `/admin/inventory/adjust`).
- **`DELETE /api/v1/products/{id}`**: Soft-deletes product (retains historical order integrity).
- **`POST /api/v1/products/{id}/images`**: Uploads and attaches gallery image.
- **`DELETE /api/v1/products/{id}/images/{imageId}`**: Removes gallery image.
- **`PUT /api/v1/products/{id}/images/reorder`**: Reorders image array (`image_ids: [4, 1, 9]`).

---

## 6. Cart & Wholesale Checkout

### `GET /api/v1/cart`
- **Purpose**: Retrieves active cart items, calculated tier unit prices, and subtotal.
- **Auth**: Public (identifies via Bearer Token or `X-Session-Id` header).
- **Controller**: `App\Http\Controllers\Api\V1\CartController@index`

### `POST /api/v1/cart` & `POST /api/v1/cart/items`
- **Purpose**: Adds or increments item in cart.
- **Body**:
  ```json
  {
    "product_id": 10,
    "product_variant_id": 25,
    "size": "L",
    "quantity": 50,
    "package_breakdown": { "S": 10, "M": 20, "L": 20 }
  }
  ```

### `PUT /api/v1/cart/items` & `PUT /api/v1/cart/{id}`
- **Purpose**: Updates item quantity or package breakdown.

### `DELETE /api/v1/cart/items` & `DELETE /api/v1/cart/{id}`
- **Purpose**: Removes item from cart.

### `DELETE /api/v1/cart`
- **Purpose**: Completely clears all cart line items.

### `POST /api/v1/cart/revalidate` & `POST /api/v1/cart/validate`
- **Purpose**: Atomic server-side validation verifying inventory availability, MOQ compliance, and price freshness before proceeding to checkout.

### `POST /api/v1/cart/merge`
- **Purpose**: Merges anonymous session cart items into authenticated user cart upon login.

---

## 7. Orders & Banking Wire Verification

### `POST /api/v1/checkout/validate`
- **Purpose**: Pre-checkout dry run checking stock limits, shipping availability, and credit terms.

### `POST /api/v1/coupons/validate` & `POST /api/v1/promotions/validate`
- **Purpose**: Validates coupon promo code against minimum order value and expiry date.

### `POST /api/v1/orders`
- **Purpose**: Finalizes wholesale order booking.
- **Auth**: `auth:sanctum`.
- **Controller**: `App\Http\Controllers\Api\V1\OrderController@store`
- **Body**:
  ```json
  {
    "shipping_name": "Jane Buyer",
    "shipping_address1": "Kirchenpauerkai 1",
    "shipping_city": "Hamburg",
    "shipping_postal_code": "20457",
    "shipping_country_code": "DE",
    "shipping_phone": "+49 40 987654",
    "email": "buyer@euroapparel.de",
    "payment_method": "wire_transfer",
    "notes": "Ship CIF Hamburg port under Pubali Bank SWIFT wire terms."
  }
  ```
- **Response `201 Created`**: Returns created order with `order_number: "ORD-2026-XXXX"`, line items, and wire instructions.

### `GET /api/v1/orders` & `GET /api/v1/orders/{id}`
- **Purpose**: Customer orders history and detail view (scoped to authenticated user).

### `POST /api/v1/orders/{id}/payment-proof`
- **Purpose**: Customer uploads scanned bank remittance / SWIFT MT103 wire receipt.
- **Auth**: `auth:sanctum` (must own order).
- **Body**: `multipart/form-data` with `receipt_file: Binary`, `payer_name: String`, `bank_name: String`, `account_number: String`, `payment_date: Date`.
- **Response `200 OK`**: Shifts status to `payment_verification_pending`.

### `GET /api/v1/orders/{id}/tracking`
- **Purpose**: Real-time Aramex air waybill tracking events.

### `GET /api/v1/orders/{id}/documents/{docType}`
- **Purpose**: Downloads commercial invoice (`commercial_invoice`), packing list (`packing_list`), or delivery note (`delivery_note`).

### `POST /api/v1/orders/{id}/cancel`
- **Purpose**: Buyer cancels unconfirmed pending order.

---

## 8. Shipping & Freight Quotes

### `GET /api/v1/shipping/settings`
- **Purpose**: Public shipping configuration (origin port DAC/CGP, supported carrier modes: Air/Sea).

### `POST /api/v1/shipping/quote`
- **Purpose**: Calculates volumetric freight quotes based on total CBM and destination country.
- **Body**: `{ "country_code": "DE", "postal_code": "20457", "total_cbm": 1.45, "gross_weight_kg": 280 }`

---

## 9. Payments Webhook

### `POST /api/v1/payments/webhook`
- **Purpose**: Receiver for automated payment gateway asynchronous notifications (e.g., Stripe, bKash merchant gateway).
- **Rate Limit**: `throttle:120,1`.

---

## 10. Wishlist

- **`GET /api/v1/wishlist`**: Returns buyer's saved styles.
- **`POST /api/v1/wishlist` & `POST /api/v1/wishlist/items`**: Adds product to wishlist (`product_id: 10`).
- **`DELETE /api/v1/wishlist/{productId}`**: Removes product from wishlist.

---

## 11. B2B RFQs & Commercial Quotations

### `POST /api/v1/rfq`
- **Purpose**: Submits a wholesale OEM manufacturing inquiry.
- **Auth**: Public or Customer.
- **Controller**: `App\Http\Controllers\Api\V1\RfqController@store`
- **Body**:
  ```json
  {
    "buyer_name": "Jane Buyer",
    "buyer_email": "buyer@euroapparel.de",
    "company_name": "EuroApparel GmbH",
    "destination_country": "Germany",
    "target_delivery_date": "2026-11-30",
    "general_notes": "Looking for 5,000 units of 100% Combed Cotton 180 GSM Crewneck Tee.",
    "items": [
      {
        "product_id": 10,
        "product_name": "Heavyweight Crewneck Tee",
        "quantity": 5000,
        "target_price": 4.10,
        "selected_color": "Navy",
        "selected_size": "Assorted"
      }
    ]
  }
  ```
- **Response `201 Created`**: Returns generated `rfq_number: "RFQ-AYN-2026-XXXXXX"`.

### `GET /api/v1/rfq` & `GET /api/v1/rfq/{id}`
- **Purpose**: Lists buyer's submitted inquiries or fetches inquiry detail.

### `PATCH /api/v1/rfq/{id}/status`
- **Purpose**: Updates RFQ status (`SUBMITTED`, `UNDER_REVIEW`, `NEED_INFORMATION`, `NEGOTIATION`, `ACCEPTED`, `REJECTED`, `CANCELLED`).

### `GET /api/v1/rfq/{id}/messages` & `POST /api/v1/rfq/{id}/messages`
- **Purpose**: Fetches or posts in the threaded RFQ negotiation dialogue.

### `GET /api/v1/quotations` & `GET /api/v1/quotations/{id}`
- **Purpose**: Customer accesses formal proforma quotations created by the factory.

### `POST /api/v1/quotations/{id}/respond`
- **Purpose**: Customer accepts or declines formal commercial quotation.
- **Body**: `{ "action": "accept" }` or `{ "action": "decline", "reason": "Target delivery date too late." }`

### `GET /api/v1/quotations/{id}/documents/{docType}`
- **Purpose**: Downloads generated Proforma Invoice PDF (`proforma`).

---

## 12. Administrative Suite (`/api/v1/admin/*`)
*Requires `auth:sanctum` and `role:admin`.*

### Dashboard & Analytics
- **`GET /api/v1/admin/dashboard`**: Returns summary KPI counters (Active Orders, Revenue, Pending RFQs, Low Stock Count).
- **`GET /api/v1/admin/analytics/sales-profit`**: Returns financial performance metrics: Total Revenue, Total COGS, Gross Profit, and Margin % calculated from immutable `order_items.buying_price_at_sale`.

### Merchandising & Homepage Control
- **`GET /api/v1/admin/homepage`**: Returns current merchandising configuration across all sections.
- **`POST /api/v1/admin/homepage/banner`**: Saves top hero banner headline, image, subtitle, CTA text, and destination.
- **`POST /api/v1/admin/homepage/featured-brands`**: Saves curated brand IDs and order for Shop By Brand rail.
- **`POST /api/v1/admin/homepage/hot-sale-categories`**: Saves curated category IDs for Hot Sale carousel.
- **`POST /api/v1/admin/homepage/featured-products`**: Saves curated product IDs for Featured Products grid.
- **`GET /api/v1/admin/homepage/search-products`**: Product search helper for admin curation modals.

### RFQ & Quotation Administration
- **`GET /api/v1/admin/rfqs`**: Lists all platform RFQs with status, date range, and country filtering.
- **`GET /api/v1/admin/rfqs/{id}`**: Detailed view of RFQ items, buyer info, and conversation thread.
- **`PATCH /api/v1/admin/rfqs/{id}/status`**: Updates status.
- **`GET /api/v1/admin/rfqs/{id}/messages` & `POST /api/v1/admin/rfqs/{id}/messages`**: Admin posts in RFQ thread.
- **`GET /api/v1/admin/quotations`**: Lists formal proforma quotations.
- **`POST /api/v1/admin/quotations`**: Generates a binding Commercial Quotation from an RFQ.
- **`GET /api/v1/admin/quotations/{id}`**: Proforma quote review.
- **`POST /api/v1/admin/quotations/{id}/generate-document-async`**: Dispatches background job to compile and store proforma PDF.

### Inventory & Warehousing
- **`GET /api/v1/admin/inventory`**: Stock balances across all products and physical warehouses.
- **`POST /api/v1/admin/inventory/adjust`**: Performs audited stock adjustment with reason logging.
- **`GET /api/v1/admin/warehouses` & `POST /api/v1/admin/warehouses`**: Factory warehouse facility directory.

### Order Management & Logistics
- **`GET /api/v1/admin/orders`**: Global order table with filtering by status, payment status, and date.
- **`GET /api/v1/admin/orders/{id}`**: Full order detail including snapshot carton specs and payment slips.
- **`PATCH /api/v1/admin/orders/{id}/status`**: Moves status (`pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`).
- **`PATCH /api/v1/admin/orders/{id}/fulfillment`**: Updates fulfillment status (`unfulfilled`, `processing`, `shipped`, `delivered`).
- **`POST /api/v1/admin/orders/{id}/payment-proof/review`**: Approves or rejects wire transfer deposit slip.
- **`POST /api/v1/admin/orders/{id}/shipment/aramex`**: Generates real Aramex international air waybill.
- **`POST /api/v1/admin/orders/{id}/tracking/refresh`**: Pulls updated carrier tracking checkpoints.

### Customer Management & Audit
- **`GET /api/v1/admin/customers`**: Buyer CRM table with spend metrics and B2B approval status.
- **`GET /api/v1/admin/customers/{id}` & `PUT /api/v1/admin/customers/{id}`**: Updates buyer credit limit, payment terms, or status.
- **`DELETE /api/v1/admin/customers/{id}`**: Soft-deletes customer.
- **`GET /api/v1/admin/activities`**: System-wide immutable audit trail of administrative actions.

### Promotions & Coupons
- **`GET / POST / PUT / DELETE /api/v1/admin/promotions`**: Full CRUD for storefront marketing banners.
- **`GET / POST / PUT / DELETE /api/v1/admin/coupons`**: Full CRUD for discount coupon codes.

### Settings
- **`GET /api/v1/admin/settings/shipping` & `PATCH /api/v1/admin/settings/shipping`**: Manages ocean freight port defaults, air express rates, and international shipping options.
