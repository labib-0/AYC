# AYAAN CLOTHING (AYC) — REST API Reference

**Document Purpose**: Comprehensive technical reference for the public and administrative REST API endpoints, request schemas, headers, authorization gates, and status responses.  
**Audience**: Frontend Developers, Integration Partners, API Engineers, QA Automation.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_052638_a8d2fef` on Hostinger VPS `srv2010990`.

---

## 1. Global API Conventions

* **Base URLs**:
  - Customer API: `https://ayaanclothing.com/api/v1`
  - Admin API: `https://ayaanclothing.com/ayc/api/v1` (or `/api/v1/admin/*`)
* **Headers**:
  - `Accept: application/json` (or `application/pdf` for binary document streams)
  - `Content-Type: application/json` (or `multipart/form-data` for uploads)
  - `Authorization: Bearer <sanctum_personal_access_token>`
* **Standard Status Codes**:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource successfully persisted.
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `403 Forbidden`: Insufficient role or `EMAIL_VERIFICATION_REQUIRED`.
  - `422 Unprocessable Entity`: Form validation failed.
  - `429 Too Many Requests`: Rate limit threshold exceeded.

---

## 2. Authentication & Verification Endpoints

### `POST /api/v1/auth/register`
* **Purpose**: Register a new customer account and initiate an email verification challenge.
* **Auth**: Public.
* **Request Body**:
  ```json
  {
    "name": "Jane Buyer",
    "email": "jane@retailchain.com",
    "password": "SecurePassword123!",
    "password_confirmation": "SecurePassword123!"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Account registered successfully. Please verify your email.",
    "token": "137|Ww48AE...",
    "user": {
      "id": 55,
      "name": "Jane Buyer",
      "email": "jane@retailchain.com",
      "role": "customer",
      "email_verified_at": null
    }
  }
  ```

### `POST /api/v1/auth/login`
* **Purpose**: Authenticate credentials and receive a Sanctum token.
* **Auth**: Public. Throttled (`throttle:auth`).
* **Request Body**:
  ```json
  {
    "email": "jane@retailchain.com",
    "password": "SecurePassword123!"
  }
  ```

### `GET /api/v1/auth/verify-email`
* **Purpose**: Verify a cryptographic email challenge link.
* **Auth**: Public (Validates query parameters).
* **Query Parameters**:
  - `email`: Customer email address.
  - `token`: 256-bit hexadecimal challenge secret.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Your email address has been successfully verified.",
    "verified": true
  }
  ```

### `POST /api/v1/auth/email/verification-notification`
* **Purpose**: Resend a fresh verification challenge email.
* **Auth**: `auth:sanctum`. Throttled (`throttle:email-verification`).

### `GET /api/v1/auth/google/redirect`
* **Purpose**: Initiate Google OAuth 2.0 consent flow.
* **Auth**: Public (Customer role only). Returns 302 Redirect to Google.

### `GET /api/v1/auth/google/callback`
* **Purpose**: Handle incoming Google OAuth token callback.
* **Auth**: Public. Exchanges authorization code, creates or links customer user, and redirects to frontend `/auth/callback`.

---

## 3. Product Catalog & Offer Sheets

### `GET /api/v1/products`
* **Purpose**: Browse and filter published products.
* **Auth**: Public. Throttled (`throttle:products-browse`).
* **Query Parameters**: `category`, `brand`, `search`, `min_price`, `max_price`, `page`, `per_page`.

### `GET /api/v1/products/slug/{slug}`
* **Purpose**: Retrieve full product specifications, package assortments, volume tiers, and gallery.
* **Auth**: Public.

### `GET /api/v1/products/{id}/offer-sheet/pdf`
* **Purpose**: Direct binary download of the pre-generated, compressed product Offer Sheet PDF.
* **Auth**: Public.
* **Response**: Binary `application/pdf` with `Content-Disposition: attachment; filename="AYC_Offer_Sheet_{SKU}.pdf"`.

### `POST /api/v1/products/bulk-offer-sheet`
* **Purpose**: Retrieve a single combined PDF merging multiple product Offer Sheets.
* **Auth**: Public.
* **Request Body**:
  ```json
  {
    "product_ids": [177, 152, 23]
  }
  ```

---

## 4. Orders & Checkout Endpoints

### `POST /api/v1/orders/calculate-checkout`
* **Purpose**: Preview checkout calculations (subtotal, volume discounts, freight estimate, total).
* **Auth**: `auth:sanctum`, `role:customer`.
* **Guard**: Enforces `$user->hasVerifiedEmail()`. Returns 403 `EMAIL_VERIFICATION_REQUIRED` if unverified.

### `POST /api/v1/orders`
* **Purpose**: Place an official export order under idempotency protection.
* **Auth**: `auth:sanctum`, `role:customer`, `verified`.
* **Headers**: `X-Idempotency-Key: <unique_uuid>`
* **Request Body**:
  ```json
  {
    "items": [
      { "product_id": 177, "quantity": 1000, "pricing_mode": "tier" },
      { "product_id": 152, "quantity": 500, "pricing_mode": "tier" }
    ],
    "shipping_name": "John Smith",
    "shipping_company": "Global Retail Ltd",
    "shipping_address1": "Hafenstrasse 12",
    "shipping_city": "Hamburg",
    "shipping_country_code": "DE",
    "destination_port": "DEHAM",
    "shipping_method": "sea_freight",
    "payment_method": "wire_transfer"
  }
  ```
* **Success Response (201 Created)**: Returns confirmed order record with `order_number` and `customer_status: "ORDER_PLACED"`.

### `GET /api/v1/orders/{id}`
* **Purpose**: Fetch detailed order snapshot and tracking status.
* **Auth**: `auth:sanctum` (Customer owner or Admin).

### `POST /api/v1/orders/{id}/payment-proof`
* **Purpose**: Upload scanned wire transfer receipt / SWIFT slip.
* **Auth**: `auth:sanctum` (Customer owner or Admin).
* **Request**: Multipart form-data with `file` (up to 20 MB).

---

## 5. Commercial Documents Endpoints

### `GET /api/v1/orders/{id}/documents/{docType}/pdf`
* **Purpose**: Direct binary download of an official order commercial trade document.
* **Auth**: `auth:sanctum` (Customer owner or Admin).
* **Supported `docType` Values**:
  - `OFFER_SHEET`: Merged product Offer Sheets in order item sequence.
  - `PROFORMA_INVOICE`: Order billing document with export banking coordinates.
  - `COMMERCIAL_INVOICE`: Gated export customs invoice (requires `payment_status = 'paid'`).
  - `PACKING_LIST`: Gated cargo packing list (requires `payment_status = 'paid'`).
* **Headers Returned**:
  ```http
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="AYC_Offer_Sheet_AYN-20261020-WYUWFB.pdf"
  X-PDF-Cache: HIT
  X-PDF-Hash: c8fa85f7b9611d6e175eda8860ac048147e124ef0c00e925fc924c19b402a3f1
  ```

---

## 6. Point-of-Sale (POS) Endpoints

### `POST /api/v1/pos/checkout`
* **Purpose**: Complete an in-person factory showroom wholesale sale.
* **Auth**: `auth:sanctum`, `role:admin`, `permission:pos.operate`.
* **Request Body**:
  ```json
  {
    "items": [{ "variant_id": 412, "quantity": 100, "unit_price": 3.85 }],
    "payment_method": "cash",
    "customer_name": "Walk-In Buyer",
    "customer_phone": "+8801700000000"
  }
  ```

---

## 7. Related Technical Documentation

* **[AUTHENTICATION_AND_VERIFICATION.md](AUTHENTICATION_AND_VERIFICATION.md)**: Token parameters and verification rules.
* **[ORDERS_AND_CHECKOUT.md](ORDERS_AND_CHECKOUT.md)**: Checkout pipeline parameters.
* **[COMMERCIAL_DOCUMENTS.md](COMMERCIAL_DOCUMENTS.md)**: Document parameters and response headers.
