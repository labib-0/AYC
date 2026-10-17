# API Reference — AYAAN CLOTHING (AYC)

## 1. Overview & Conventions

The AYAAN CLOTHING Core REST API is exposed under `/api/v1/`. All requests and responses use JSON formatting unless explicitly requesting binary downloads (such as PDF generation or receipt images).

* **Base URL**: `https://ayaanclothing.com/api/v1` (Production) or `http://localhost:8000/api/v1` (Local)
* **Headers**:
  * `Accept: application/json`
  * `Content-Type: application/json`
  * `Authorization: Bearer <sanctum_token>` (for authenticated routes)
* **Standard Response Envelope**:
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": { ... }
  }
  ```
* **Error Response Format (e.g. 422 Unprocessable Entity)**:
  ```json
  {
    "success": false,
    "message": "The given data was invalid.",
    "errors": {
      "field_name": ["Specific validation error message"]
    }
  }
  ```

---

## 2. Public Endpoints (Unauthenticated)

### System & Health
* **`GET /health`**
  * **Description**: Infrastructure health probe returning database, Redis, and application status.
  * **Response `200 OK`**:
    ```json
    {
      "success": true,
      "message": "API is healthy",
      "data": {
        "status": "ok",
        "app_name": "AYAAN CLOTHING",
        "environment": "production",
        "services": { "database": "ok", "cache": "ok" },
        "timestamp": "2026-10-17T15:56:12+00:00"
      }
    }
    ```
* **`GET /settings/public`**: Returns official corporate identity, WhatsApp sales contact (`+880 1620-853502`), physical address in Uttara, and supported currencies.
* **`GET /legal/{type}`**: Returns published legal policies (`privacy-policy`, `terms-and-conditions`).

### Public Catalog & Discovery
* **`GET /homepage`**: Returns active promotional banners, marquee ticker items, featured export brands, and hot sale categories.
* **`GET /search/suggestions?q={query}`**: Returns fast typeahead product and category suggestions.
* **`GET /products`**: Paginated wholesale catalog.
  * **Query Parameters**:
    * `category_id` (integer): Filter by category.
    * `brand_id` (integer): Filter by brand.
    * `min_price`, `max_price` (numeric): Price range filter.
    * `sort_by` (string): `price_asc`, `price_desc`, `latest`, `sort_order`.
    * `page` (integer), `per_page` (integer): Pagination controls.
* **`GET /products/{slugOrId}`**: Detailed product information, including variant curves, image galleries, 3-tier wholesale pricing tables, MOQ, carton package allocations, and garment specifications.
* **`GET /products/{slugOrId}/shipping-specs`**: Logistics metadata (carton dimensions, gross weight, volumetric weight) for freight estimation.
* **`GET /categories`**: Complete active category tree.
* **`GET /brands`**: Verified export apparel brands.

---

## 3. Customer Account & Order Endpoints

Protected by `auth:sanctum`. Tokens must belong to an authenticated customer.

### Authentication
* **`POST /auth/register`**: Customer registration (name, email, password, company name, country code).
* **`POST /auth/login`**: Customer login returning Sanctum personal access token.
* **`POST /auth/logout`**: Revokes current access token.
* **`GET /auth/me`**: Returns authenticated user profile, company details, and verified status.

### Customer Order Lifecycle
* **`POST /orders`**: Places a canonical wholesale order.
  * **Request Body**:
    ```json
    {
      "customer_name": "John Doe",
      "company_name": "Acme Apparel Imports Ltd",
      "shipping_phone": "+14155552671",
      "shipping_address1": "100 Industrial Parkway",
      "shipping_city": "Los Angeles",
      "shipping_country_code": "US",
      "payment_method": "wire_transfer",
      "currency": "USD",
      "items": [
        { "product_id": 42, "sku": "AYC-HOOD-BLK-M", "quantity": 120 }
      ],
      "coupon_code": "SAVE10"
    }
    ```
  * **Behavior**: Validates MOQ, computes wholesale pricing tiers, verifies uncommitted inventory, executes stock deduction, and returns `ORD-YYYY-XXXX`.
* **`GET /orders`**: Paginated order history for the authenticated buyer.
* **`GET /orders/{id}`**: Detailed order breakdown, including line items, status progression timeline, applied discounts, and carrier tracking.
* **`POST /orders/{id}/payment-proof`**: Uploads wire transfer receipt / deposit slip.
  * **Content-Type**: `multipart/form-data`
  * **Form Fields**: `payment_proof` (File: JPG, PNG, WebP; max 10 MB).
  * **Behavior**: Transcodes image to WebP, sanitizes metadata, updates order status to `pending_verification`.

### Commercial Document Generation
* **`GET /orders/{id}/documents/{docType}`**: Returns structured JSON for export documents (`OFFER_SHEET`, `PROFORMA_INVOICE`, `COMMERCIAL_INVOICE`).
* **`GET /orders/{id}/documents/{docType}/pdf`**: Generates and streams official PDF binary with correct HTTP headers (`Content-Type: application/pdf`).

### Custom OEM & RFQ
* **`POST /rfq`**: Submits a Request for Quotation for custom garment manufacturing.
* **`GET /rfq`**: Lists historical RFQ inquiries submitted by the buyer.

---

## 4. Administrative Endpoints (`/ayc/api/`)

Protected by `auth:sanctum`, `role:admin`, and granular `permission:<slug>`.

### Product & Inventory Management
* **`POST /products`** (`permission:catalog.manage`): Creates a new product, validating uniqueness of SKU and slug, and generating visible `PRD-xxxx` identifier.
* **`PUT /products/{id}`** (`permission:catalog.manage`): Updates product specifications, images, and tiered pricing.
* **`POST /products/{id}/pin`** (`permission:catalog.manage`): Pins product to the top of featured catalog lists.
* **`PATCH /products/{id}/toggle-storefront-visibility`** (`permission:catalog.manage`): Hides or reveals product on the public storefront.
* **`GET /products/{id}/stock-history`** (`permission:inventory.adjust`): Audit log of warehouse stock adjustments.

### Order Processing & Payment Verification
* **`GET /orders`** (`permission:orders.manage`): Global admin orders table with faceted filtering by status, payment state, and date range.
* **`POST /orders/{id}/payment/verify`** (`permission:orders.verify_payment`):
  * Approves the buyer's wire transfer receipt.
  * Transitions order status from `pending_verification` to `paid`.
  * Logs immutable verification event in `order_status_events`.
* **`POST /orders/{id}/payment/reject`** (`permission:orders.verify_payment`):
  * Rejects uploaded receipt.
  * Transitions status to `payment_rejected`.
  * Stores rejection reason and notifies the buyer to upload a replacement proof.
* **`PATCH /orders/{id}/fulfillment`** (`permission:orders.manage`): Assigns carrier name (`Aramex`, `DHL`, `Ocean Freight`) and tracking AWB number.

### Point-of-Sale (POS) API
* **`GET /pos/customers/walkin`** (`permission:pos.access`): Returns default walk-in customer object.
* **`POST /pos/customers`** (`permission:pos.access`): Quick-creates a customer requiring only name and phone number.
* **`POST /pos/calculate`** (`permission:pos.access`): Dry-runs tax, bulk discounts, and coupon deductions without placing an order.
* **`POST /pos/orders`** (`permission:pos.access`): Finalizes POS transaction, creates order record with `order_source: pos`, and deducts stock immediately.

### Role-Based Access Control (RBAC)
* **`GET /rbac/roles`** (`permission:rbac.manage`): Lists all custom roles and their assigned permissions.
* **`POST /rbac/roles`** (`permission:rbac.manage`): Creates a custom administrative role.
* **`PUT /rbac/roles/{id}/permissions`** (`permission:rbac.manage`): Syncs permission matrix for a role.
* **`POST /rbac/admins/{adminId}/roles`** (`permission:rbac.manage`): Assigns role to an admin user.

---

## 5. Internal Server-to-Server Endpoints

* **`GET /internal/storefront/access-check`**
  * **Headers**: `X-Internal-Secret: <INTERNAL_API_SECRET>`, `X-Internal-Client-IP: <client_ip>`
  * **Description**: Evaluates client IP against MaxMind GeoIP database or fallback provider. Returns whether the visitor is located in Bangladesh to enforce export pricing security.
