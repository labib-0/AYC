# Chapter 34: Coupon-Bound Admin Sales Reporting Architecture

This document specifies the end-to-end architecture, authorization boundary, data-scoping invariants, and operational workflows for the Coupon-Bound Admin Sales Reporting system implemented across Prompts 1, 2, and 3.

---

## 1. System Overview & Objective

The Coupon Sales Reporting system allows administrators assigned to the **Coupon Sales Manager** role (or bound to one or more promotional coupons) to log in via the standard AYC Admin login (`/ayc/login`) and view **only** the sales, orders, and financial metrics attributed to their assigned coupons.

### Non-Negotiable Invariants:
1. **Single Unified Coupon System**: Reuses the core `coupons` table and existing customer storefront checkout logic. No secondary coupon ledger is created.
2. **Single Unified Order System**: Reuses the core `orders` and `order_items` tables. All qualifying sales read directly from authoritative historical order data.
3. **Single Unified RBAC Architecture**: Reuses the project's native role-permission infrastructure (`roles`, `permissions`, `admin_roles`, `role_permissions`). The `coupon_sales` role is fully editable by Super Admins.
4. **Strict Server-Side Scoping**: An admin bound to Coupon A and Coupon B can **never** access, view, search, or export orders attributed to Coupon C or unassigned orders. Frontend parameters are never trusted for authorization.

---

## 2. Core Architecture & Data Models

### 2.1 Database Schema Extensions
- **`coupon_admin_bindings` Table**:
  - `id`: Bigint primary key.
  - `coupon_id`: Bigint foreign key $\to$ `coupons.id` (`cascadeOnDelete`).
  - `admin_user_id`: Bigint foreign key $\to$ `users.id` (`cascadeOnDelete`).
  - `created_by`: Bigint foreign key $\to$ `users.id` (`nullOnDelete`).
  - Unique composite index: `['coupon_id', 'admin_user_id']` (guarantees one binding per coupon-admin pair).
  - Timestamps: `created_at`, `updated_at`.
- **`orders` Table Extensions**:
  - `coupon_id`: Bigint nullable foreign key $\to$ `coupons.id` (`nullOnDelete`).
  - `coupon_code`: Varchar(50) nullable indexed string.
  - Composite performance index: `['coupon_id', 'status']`.

### 2.2 Eloquent Relationships
- `Coupon::orders()`: `HasMany(Order::class)`
- `Coupon::adminBindings()`: `HasMany(CouponAdminBinding::class)`
- `Coupon::boundAdmins()`: `BelongsToMany(User::class, 'coupon_admin_bindings', 'coupon_id', 'admin_user_id')`
- `User::boundCoupons()`: `BelongsToMany(Coupon::class, 'coupon_admin_bindings', 'admin_user_id', 'coupon_id')`
- `Order::coupon()`: `BelongsTo(Coupon::class)`

---

## 3. Role & Permissions

### 3.1 Prebuilt Role: `coupon_sales`
- **Slug**: `coupon_sales`
- **Name**: `Coupon Sales Manager`
- **Description**: *"View sales, orders, and performance metrics attributed to bound discount coupons."*
- **`is_system`**: `false` (Normal, editable role manageable by Super Admin under `/ayc/roles`).
- **Initial Permissions**:
  - `coupon.view`: View promotional coupons.
  - `order.view`: View assigned order headers.
  - `order.view_customer`: View customer billing/shipping details.
  - `order.view_items`: View order line items.
  - `analytics.sales.view`: View sales revenue metrics on dashboard.
  - `analytics.orders.view`: View order volume metrics.

---

## 4. Authoritative Sales Business Rules

### 4.1 Definition of "Qualifying Sale"
To eliminate accounting discrepancies, the Coupon Sales system strictly aligns with the canonical `SalesProfitAnalyticsService`:
- **Included (Qualifying Sale)**:
  - `orders.status IN ('confirmed', 'processing', 'shipped', 'delivered')`
  - OR `orders.payment_status = 'paid'` (irrespective of fulfillment state)
- **Excluded**:
  - `orders.status = 'cancelled'`
  - `orders.payment_status = 'refunded'`
  - `orders.deleted_at IS NOT NULL` (soft-deleted orders)
  - Unconfirmed, unpaid draft/pending quotations or RFQ items.

### 4.2 Authoritative Financial Aggregation
- **Total Sales**: $\sum \text{orders.total\_amount}$ for qualifying orders. Historical order amounts are read as-is and never recalculated from current product pricing or catalog state.
- **Total Discounts**: $\sum (\text{orders.coupon\_discount} \mathbin{??} \text{orders.discount\_amount})$ for qualifying orders. Uses recorded historical discounts.
- **Deduplication**: Aggregations use `COUNT(DISTINCT orders.id)` to prevent duplication across joins or multiple items.

---

## 5. Security & Authorization Boundary

```
[ Incoming Request ]
        │
        ▼
[ Sanctum Authentication (Token / Session) ]
        │
        ▼
[ RBAC Permission Check (analytics.sales.view / order.view) ]
        │
        ▼
[ Resolve Bound Coupon IDs via CouponAdminBindingService ]
   ├─ If Super Admin OR has 'coupons.view_all_sales':
   │     Unrestricted coupon scope.
   ├─ If Scoped Admin with N bound coupons:
   │     Restricted strictly to bound coupon IDs.
   └─ If Admin with 0 bound coupons:
         has_bindings = false, returns 0 orders / $0.00 metrics.
        │
        ▼
[ Database Query: Order::scopeForCouponSalesAdmin($user) ]
   ├─ Enforces orders.coupon_id IN (authorized coupon IDs)
   ├─ Validates optional user-supplied coupon_id against authorized subset
   └─ Disregards any frontend-supplied admin_id or unauthorized scope
```

### 5.1 URL Tampering Defense
- **Direct Show Endpoint**: `/api/v1/admin/coupon-sales/orders/{id}` verifies `in_array((int) $order->coupon_id, $boundIds, true)`. Out-of-scope requests abort with `403 Forbidden`.
- **Core Admin Show Endpoint**: `/api/v1/admin/orders/{id}` in `AdminOrderController` checks if the user has restricted `coupon_sales` role and aborts with `403 Forbidden` if the requested order's `coupon_id` is outside the admin's bound scope.

---

## 6. Endpoints Catalog

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/coupon-bindings` | `coupon.view` | List coupon-admin bindings with search and filters |
| `POST` | `/api/v1/admin/coupon-bindings` | `coupon.edit` | Bind an existing coupon to an active admin user |
| `DELETE` | `/api/v1/admin/coupon-bindings/{id}` | `coupon.edit` | Safely remove a coupon binding |
| `GET` | `/api/v1/admin/coupon-sales/summary` | `analytics.sales.view` | Summary metrics: total orders, sales, discounts, active coupons |
| `GET` | `/api/v1/admin/coupon-sales/orders` | `order.view` | Scoped, paginated qualifying orders with sorting & filters |
| `GET` | `/api/v1/admin/coupon-sales/orders/{id}` | `order.view` | Scoped single order detail (aborts 403 if out of scope) |
| `GET` | `/api/v1/admin/coupon-sales/export` | `order.view` | Memory-efficient chunked CSV export of filtered dataset |

---

## 7. CSV Export Architecture

- **Streaming Implementation**: Uses `Symfony\Component\HttpFoundation\StreamedResponse` processing records in chunks of 250 via `Order::chunk(250)`.
- **Excel UTF-8 Compatibility**: Writes UTF-8 Byte Order Mark (`\xEF\xBB\xBF`) at stream initiation.
- **Export Columns**: `Order Number`, `Order Date`, `Customer`, `Coupon`, `Discount`, `Order Total`, `Status`.
- **Privacy Hardening**: Strictly excludes passwords, authentication tokens, supplier data, procurement costs, and internal admin notes.
- **Audit Trail**: Every export triggers an audit record in the `activities` table with user ID, timestamp, filter parameters, and total records exported.

---

## 8. Frontend Implementation

- **Page Component**: [`src/app/ayc/coupon-sales/page.tsx`](file:///Users/luhasan/Documents/ayaan/src/app/ayc/coupon-sales/page.tsx) wrapped in `<Suspense>` for search param hydration.
- **Filter Toolbar**: [`src/components/admin/coupon-sales/CouponSalesFilterToolbar.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/coupon-sales/CouponSalesFilterToolbar.tsx) with coupon dropdown, date range presets, custom range, search input, sort selector, reset button, and export CSV button.
- **Summary Cards**: [`src/components/admin/coupon-sales/CouponSalesSummaryCards.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/coupon-sales/CouponSalesSummaryCards.tsx) with restrained B2B design and dynamic currency symbol (`$` or `৳`).
- **Attributed Orders Table**: [`src/components/admin/coupon-sales/CouponSalesOrdersTable.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/coupon-sales/CouponSalesOrdersTable.tsx) with loading skeletons, database-level pagination, and responsive status badges.
- **Order Details Drawer**: [`src/components/admin/coupon-sales/CouponSalesOrderDetailDrawer.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/coupon-sales/CouponSalesOrderDetailDrawer.tsx) providing quick-access item breakdown and direct link to full order view.
- **Core Order Detail Attribution**: [`src/components/admin/orders/OrderFinancialSummary.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/orders/OrderFinancialSummary.tsx) displays coupon attribution badge and recorded discount savings on all order details pages.
