# AYC — REST API Reference (v1)

## 1. API Architecture & General Conventions

Ayaan Clothing exposes a unified REST API versioned under `/api/v1/`. The API serves the customer storefront, authenticated buyer portal, and the administrative operations suite.

- **Base URL (Local)**: `http://127.0.0.1:8000/api/v1`
- **Base URL (Production)**: `https://ayaanclothing.com/api/v1`
- **Admin Gateway Rewrite**: `https://ayaanclothing.com/ayc/api/v1/*` rewrites transparently to `/api/v1/*`.
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token via HTTP header `Authorization: Bearer <sanctum_token>`.

### Common Error Responses
| HTTP Status | Description | Standard Body Envelope |
|---|---|---|
| **400 Bad Request** | Request format or business state error | `{"success": false, "message": "Reason"}` |
| **401 Unauthorized** | Missing or expired Sanctum bearer token | `{"message": "Unauthenticated."}` |
| **403 Forbidden** | User role mismatch or missing RBAC permission | `{"success": false, "message": "Forbidden. Requires permission: [...]"}` |
| **404 Not Found** | Resource or endpoint does not exist | `{"success": false, "message": "Resource not found."}` |
| **422 Unprocessable Content** | Validation failed against FormRequest rules | `{"success": false, "message": "Validation failed", "errors": {...}}` |
| **429 Too Many Requests** | Rate limit exceeded | `{"message": "Too Many Attempts."}` |
| **500 Server Error** | Unhandled exception | `{"success": false, "message": "Server error."}` |

---

## 2. Authentication & Account APIs

### 2.1 Customer Registration
- **Method & Route**: `POST /auth/register`
- **Access**: Public (Throttled: `auth-register`)
- **Body**:
  ```json
  {
    "name": "Kazi Fashion Ltd",
    "email": "buyer@kazifashion.com",
    "password": "SecurePassword123!",
    "password_confirmation": "SecurePassword123!",
    "phone": "+8801711223344",
    "company_name": "Kazi Fashion Ltd",
    "tax_id": "VAT-992819"
  }
  ```
- **Validation**: `name` (required, string, max:255), `email` (required, email, unique:users), `password` (required, min:8, confirmed), `phone` (nullable, string).
- **Response (201 Created)**: Returns `{ "success": true, "token": "<sanctum_token>", "user": { ... } }`.

### 2.2 Customer Login
- **Method & Route**: `POST /auth/login` (Alias: `POST /auth/customer/login`)
- **Access**: Public (Throttled: `auth-login`)
- **Body**: `{"email": "buyer@kazifashion.com", "password": "SecurePassword123!"}`
- **Behavior**: Validates credentials. Enforces that `user.role === 'customer'`. If an administrator attempts to log in via customer login, they are directed to the admin login gateway.
- **Response (200 OK)**: Returns `{ "success": true, "token": "<token>", "user": { ... } }`.

### 2.3 Dedicated Administrator Login
- **Method & Route**: `POST /auth/admin/login` (Aliases: `POST /admin/login`, `POST /admin/auth/login`)
- **Access**: Public (Throttled: `auth-login`)
- **Body**: `{"email": "admin@ayaanclothing.com", "password": "AdminPassword123!"}`
- **Behavior**: Strictly enforces `user.role === 'admin'`. Rejects customer credentials with HTTP 403.
- **Response (200 OK)**: Returns `{ "success": true, "token": "<token>", "user": { ..., "permissions": [...] } }`.

### 2.4 User Profile & Current Session
- **Method & Route**: `GET /auth/me`
- **Access**: Authenticated (`auth:sanctum`)
- **Response (200 OK)**: Returns authenticated user profile, assigned roles, and atomic permissions.

### 2.5 User Logout
- **Method & Route**: `POST /auth/logout`
- **Access**: Authenticated (`auth:sanctum`)
- **Behavior**: Revokes current Sanctum access token.

---

## 3. Public Storefront, Catalog & Merchandising APIs

### 3.1 Public Storefront Settings
- **Method & Route**: `GET /settings/public`
- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "site_title": "AYAAN CLOTHING",
      "company_name": "AYAAN CLOTHING",
      "public_email": "export@ayaanclothing.com",
      "public_phone": "+880 1620-853502",
      "site_logo": "/storage/branding/logo.png",
      "whatsapp": {
        "display": "+880 1620-853502",
        "number": "8801620853502",
        "url": "https://wa.me/8801620853502"
      },
      "social_links": [
        { "provider": "facebook", "url": "https://facebook.com/..." },
        { "provider": "linkedin", "url": "https://linkedin.com/..." }
      ]
    }
  }
  ```

### 3.2 Homepage Merchandising Payload
- **Method & Route**: `GET /homepage`
- **Access**: Public
- **Response (200 OK)**: Aggregates active banners, announcement ticker items, shop-by-brand cards, hot-sale categories, and featured product cards in a single network round-trip.

### 3.3 Product Listing & Filtering
- **Method & Route**: `GET /products`
- **Access**: Public
- **Query Parameters**:
  - `page` (int, default: 1)
  - `per_page` (int, default: 12)
  - `category` (string, category slug)
  - `brand` (string, brand slug)
  - `design_type` (string, e.g. 'Slim Fit')
  - `min_price`, `max_price` (numeric)
  - `search` (string, title/sku keyword query)
  - `sort` (string: `'price_asc'`, `'price_desc'`, `'newest'`, `'moq_asc'`)
- **Response (200 OK)**: Standard paginated collection of products including 4:5 image URLs, active brands, MOQ thresholds, and lowest customer unit price preview.

### 3.4 Product Detail (PDP)
- **Method & Route**: `GET /products/{slugOrId}` (Explicit slug route: `GET /products/slug/{slug}`)
- **Access**: Public
- **Response (200 OK)**: Detailed product model including variant matrix (colors $\times$ sizes), package allocation breakdown, 3-tier pricing schedules, specifications, carton dimensions, and shipping profiles.

---

## 4. Wholesale Cart & Checkout APIs

### 4.1 Retrieve Cart
- **Method & Route**: `GET /cart`
- **Access**: Session-based or Authenticated
- **Response (200 OK)**: Returns cart items with live server-recalculated unit prices and volume tier status.

### 4.2 Add Item to Cart
- **Method & Route**: `POST /cart` (Alias: `POST /cart/items`)
- **Access**: Public / Authenticated
- **Body**:
  ```json
  {
    "product_id": 14,
    "product_variant_id": 42,
    "quantity": 100,
    "pricing_mode": "STANDARD"
  }
  ```
- **Validation**: `quantity` must be $\ge$ product MOQ.
- **Response (200 OK)**: Returns updated cart payload.

### 4.3 Validate Checkout & Cart Revalidation
- **Method & Route**: `POST /checkout/validate`
- **Access**: Authenticated (`role:customer`)
- **Response (200 OK)**: Validates warehouse inventory availability, confirms live pricing, computes carton counts and estimated shipping weight.

### 4.4 Submit Wholesale Order
- **Method & Route**: `POST /orders`
- **Access**: Authenticated (`role:customer`, Throttled: `checkout-order`)
- **Body**:
  ```json
  {
    "shipping_address": {
      "name": "John Doe",
      "company": "European Apparel Imports",
      "address_line1": "45 Industrial Way",
      "city": "Hamburg",
      "postal_code": "20457",
      "country": "Germany",
      "phone": "+4940123456"
    },
    "billing_address": { ... },
    "payment_method": "WIRE_TRANSFER",
    "coupon_code": "AUTUMN2026",
    "customer_notes": "Deliver via Hamburg Seaport DAP"
  }
  ```
- **Response (201 Created)**: Returns `{ "success": true, "order": { "order_number": "ORD-2026-001248", "total_amount": 4850.00, ... }, "bank_wire_instructions": { ... } }`.

### 4.5 Upload Bank Wire Slip (Payment Proof)
- **Method & Route**: `POST /orders/{id}/payment-proof`
- **Access**: Authenticated (`role:customer`)
- **Body (Multipart Form)**: `payment_proof` (image/pdf, max: 10MB), `transaction_reference` (string), `notes` (string).
- **Response (200 OK)**: Updates payment status to `PAYMENT_SUBMITTED`.

---

## 5. Commercial Document APIs

### 5.1 Document Metadata & Data Payload
- **Method & Route**: `GET /orders/{id}/documents/{docType}`
- **Access**: Authenticated (`auth:sanctum`, owner or admin)
- **Path Parameters**: `docType`: `'offer_sheet'`, `'proforma_invoice'`, `'commercial_invoice'`.
- **Response (200 OK)**: Returns complete structured document payload including exporter profile, buyer info, line items, banking coordinates, and declaration notes.

### 5.2 Download Canonical PDF Stream
- **Method & Route**: `GET /orders/{id}/documents/{docType}/pdf`
- **Access**: Authenticated (`auth:sanctum`, owner or admin)
- **Response (200 OK)**: Binary stream (`application/pdf`) with `Content-Disposition: attachment; filename="AYC-PI-ORD-2026-001248.pdf"`.

---

## 6. Point of Sale (POS) Administrative APIs

### 6.1 Look up Counter Customers
- **Method & Route**: `GET /admin/pos/customers`
- **Access**: Admin (`permission:pos.view`)
- **Query**: `query` (phone number, name, or company keyword).
- **Response (200 OK)**: List of matching customer records.

### 6.2 Quick Register Counter Customer
- **Method & Route**: `POST /admin/pos/customers`
- **Access**: Admin (`permission:pos.create`)
- **Body**: `{"name": "Rahim Khan", "phone": "+8801700112233", "email": null, "company_name": "Rahim Traders"}`
- **Behavior**: Finds existing profile by phone or registers a new profile. Does not require email.

### 6.3 Calculate POS Sale
- **Method & Route**: `POST /admin/pos/calculate`
- **Access**: Admin (`permission:pos.view`)
- **Body**: `{"items": [{"product_id": 14, "quantity": 50}], "warehouse_id": 1, "coupon_code": null}`
- **Response (200 OK)**: Returns live subtotal, applicable volume discount, tax, and order total.

### 6.4 Submit POS Order & Tender
- **Method & Route**: `POST /admin/pos/orders`
- **Access**: Admin (`permission:pos.create`)
- **Body**:
  ```json
  {
    "customer_id": 89,
    "warehouse_id": 1,
    "items": [{"product_id": 14, "quantity": 50}],
    "payment_method": "CASH",
    "cash_tendered": 5000.00,
    "discount_amount": 0
  }
  ```
- **Behavior**: Creates standard order with `order_source = 'POS'`, status `CONFIRMED`, decrements physical warehouse stock immediately, and returns `change_due`.

---

## 7. Administrative Management Suite (`/api/v1/admin/*`)

### 7.1 Inventory & Warehouses
- `GET /admin/inventory`: Paginated warehouse inventory grid with search and low-stock filters (`permission:inventory.view`).
- `POST /admin/inventory/adjust`: Audited stock adjustment (`permission:inventory.adjust`).
  - Body: `{"inventory_id": 12, "quantity_change": -5, "reason": "Damaged goods written off"}`.

### 7.2 Order Fulfillment & Payment Verification
- `POST /admin/orders/{id}/payment/verify`: Verifies bank wire slip and permanently decrements warehouse inventory (`permission:payment.receipt.verify`).
- `POST /admin/orders/{id}/payment/reject`: Rejects wire slip with mandatory reason (`permission:payment.receipt.reject`).
- `PATCH /admin/orders/{id}/fulfillment`: Updates fulfillment status, tracking number, and freight carrier (`permission:order.update_fulfillment`).
- `POST /admin/orders/{id}/shipment/aramex`: Generates official Aramex air waybill (AWB) consignment (`permission:shipment.create`).

### 7.3 Coupon-Bound Sales Reporting
- `GET /admin/coupon-sales/summary`: High-level gross sales, orders, and commission metrics scoped to bound coupons (`permission:analytics.sales.view`).
- `GET /admin/coupon-sales/orders`: Paginated order list filtered strictly to coupons bound to the requesting administrator (`permission:order.view`).

### 7.4 Role-Based Access Control (RBAC)
- `GET /admin/rbac/roles`: Lists all administrative roles (`permission:role.view`).
- `POST /admin/rbac/roles`: Creates new custom role (`permission:role.create`).
- `PUT /admin/rbac/roles/{id}/permissions`: Syncs atomic permissions to role (`permission:permission.manage`).
- `POST /admin/rbac/admins/{adminId}/roles`: Assigns role to administrator account (`permission:role.assign`).
