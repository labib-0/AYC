# 05 — User Roles & Permissions Matrix

## 1. Architectural Role Model

The Ayaan Clothing platform enforces a strict, two-role authorization architecture:
1. **`customer`**: Verified B2B garment buyers, procurement managers, and wholesale importers.
2. **`admin`**: Internal merchandising executives, warehouse inventory directors, and system administrators.

In addition to authenticated users, the system defines explicit access boundaries for **Unauthenticated Guests**.

> **Architectural Standard Note**: The role model was formalized in PostgreSQL migration `2026_09_24_223000_consolidate_two_roles_in_users_table.php`, which collapsed earlier legacy persona tiers into the standard two-role model with database check constraints: `role IN ('admin', 'customer')`.

---

## 2. Role Profiles & Boundaries

```
                      ┌──────────────────────────────────────────────┐
                      │             APPLICATION ACTORS               │
                      └───────┬──────────────┬──────────────┬────────┘
                              │              │              │
                              ▼              ▼              ▼
                     ┌────────────────┐ ┌──────────┐ ┌───────────────┐
                     │     Guest      │ │ Customer │ │     Admin     │
                     │ (Public Buyer) │ │(Wholesale│ │(Merchandiser/ │
                     │                │ │  Client) │ │  Superuser)   │
                     └────────────────┘ └──────────┘ └───────────────┘
```

### 2.1 Unauthenticated Guest
- **Access Scope**: Read-only access to public storefront catalog, brand directory, product detail pages, and RFQ creation.
- **Restrictions**: Cannot view historical orders, access quotation negotiation threads, save default delivery addresses, or access any administrative panel.
- **Cart Mechanism**: Uses browser LocalStorage and `X-Session-Id` header for anonymous basket accumulation; automatically merged upon authentication via `POST /api/v1/cart/merge`.
- **Session**: No Sanctum token.

### 2.2 Authenticated Wholesale Customer (`role: customer`)
- **Access Scope**: Full wholesale browsing, tiered quantity checkout, RFQ negotiation, quotation acceptance, payment proof upload, order tracking, address book management, and document vault downloads.
- **Restrictions**: Strictly blocked from accessing `/admin/*` routes or any API endpoint protected by `role:admin`. If a customer token attempts an admin request, Laravel middleware immediately responds with `HTTP 403 Forbidden: Unauthorized action. Required role: admin`.
- **Session**: Sanctum Bearer Token stored in browser LocalStorage (`ayaan_auth_token`).

### 2.3 Authenticated Administrator (`role: admin`)
- **Access Scope**: Full authority over product catalog CRUD, brand and category taxonomies, landing page merchandising, inventory adjustments across all warehouses, order lifecycle transitions, payment proof verification, quotation generation, and financial profit analytics.
- **Origin**: Restricted to accessing the dedicated Admin Gateway on port `3001` (or `admin.ayaanclothing.com`).
- **Session**: Sanctum Bearer Token stored in `localStorage.getItem("ayaan_admin_token")`.

---

## 3. Comprehensive Permissions Matrix

| Platform Area | Feature / Operation | Guest | Customer | Admin | Enforcing Mechanism |
|---|---|:---:|:---:|:---:|---|
| **Catalog** | View Products, Categories, Brands | ✅ | ✅ | ✅ | Public Route |
| **Catalog** | Search & Filter Products | ✅ | ✅ | ✅ | Public Route |
| **Catalog** | Create / Edit / Delete Products | ❌ | ❌ | ✅ | `role:admin` Middleware |
| **Catalog** | Upload & Reorder Product Images | ❌ | ❌ | ✅ | `role:admin` Middleware |
| **Merchandising**| Manage Homepage Banner & Rails | ❌ | ❌ | ✅ | `role:admin` Middleware |
| **Cart** | Add Items, Update Quantities | ✅ | ✅ | ❌ | Client & `CartController` |
| **Checkout** | Place Wholesale Order | ❌ | ✅ | ❌ | `auth:sanctum`, `role:customer` |
| **Orders** | View Personal Order History | ❌ | ✅ | ❌ | `OrderController@index` (scoped by `user_id`) |
| **Orders** | Upload Bank Wire Payment Proof | ❌ | ✅ | ❌ | `OrderController@uploadPaymentProof` |
| **Orders** | View All Platform Orders | ❌ | ❌ | ✅ | `Admin\OrderController@index` |
| **Orders** | Verify / Reject Payment Proof | ❌ | ❌ | ✅ | `Admin\OrderController@reviewPaymentProof` |
| **Orders** | Trigger Aramex International Waybill | ❌ | ❌ | ✅ | `Admin\OrderController@createAramexShipment` |
| **RFQ** | Submit Initial RFQ Inquiry | ✅ | ✅ | ❌ | `RfqController@store` |
| **RFQ** | Post Message in RFQ Thread | ❌ | ✅ | ✅ | `RfqController@addMessage` (owner or admin) |
| **Quotations** | View Received Quotations | ❌ | ✅ | ❌ | `QuotationController@index` (scoped by `user_id`) |
| **Quotations** | Accept / Decline Quotation | ❌ | ✅ | ❌ | `QuotationController@respond` |
| **Quotations** | Create Formal Commercial Quote | ❌ | ❌ | ✅ | `Admin\QuotationController@store` |
| **Documents** | Download Proforma / Commercial Invoice| ❌ | ✅ | ✅ | `OrderController@document` / `QuotationController@document` |
| **Inventory** | View Stock Balances by Warehouse | ❌ | ❌ | ✅ | `Admin\InventoryController@index` |
| **Inventory** | Perform Stock Adjustment | ❌ | ❌ | ✅ | `Admin\InventoryController@adjust` |
| **Analytics** | View Sales, Profit & COGS Dashboards| ❌ | ❌ | ✅ | `AdminAnalyticsController@salesProfit` |
| **Audit** | View System Activity Logs | ❌ | ❌ | ✅ | `AdminActivityController@index` |

---

## 4. Enforcement Implementation in Code

### 4.1 Backend Middleware (`backend/app/Http/Middleware/EnsureUserHasRole.php`)
```php
public function handle(Request $request, Closure $next, string ...$roles): Response
{
    $user = $request->user();

    if (! $user) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated.',
        ], Response::HTTP_UNAUTHORIZED);
    }

    if (! empty($roles) && ! in_array($user->role, $roles, true)) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized action. Required role: ' . implode(' or ', $roles),
        ], Response::HTTP_FORBIDDEN);
    }

    return $next($request);
}
```

### 4.2 Database Check Constraint (`users` Table)
```sql
ALTER TABLE users ADD CONSTRAINT check_user_role CHECK (role IN ('admin', 'customer'));
```

### 4.3 Client-Side Next.js Route Protection
1. **Admin Pages (`src/app/admin/layout.tsx`)**:
   - Executes `verifyAdminSession()` via `AdminAuthContext`.
   - If `user.role !== 'admin'`, immediately redirects to `/admin/login`.
2. **Customer Dashboard (`src/app/dashboard/layout.tsx` & `src/app/profile/layout.tsx`)**:
   - Executes session check via `AuthContext`.
   - If unauthenticated, saves current URL in `ayaan_intended_destination` and redirects to `/login`.
