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

| Platform Area | Feature / Operation | Guest | Customer | Admin RBAC Permission | Enforcing Mechanism |
|---|---|:---:|:---:|---|---|
| **Catalog** | View Products, Categories, Brands | ✅ | ✅ | `product.view`, `category.view`, `brand.view` | Public storefront or Admin API with `permission:*` |
| **Catalog** | Create Product Draft | ❌ | ❌ | `product.create`, `product.save_draft` | `permission:product.create`, `AdminAuthorizationService` |
| **Catalog** | Edit Product Content & Specs | ❌ | ❌ | `product.edit` | `permission:product.edit` |
| **Catalog** | Edit Pricing & Bulk Tier Pricing | ❌ | ❌ | `product.pricing.manage` | `AdminAuthorizationService` in `ProductController` |
| **Catalog** | Publish / Unpublish Product | ❌ | ❌ | `product.publish` | `permission:product.publish`, `AdminAuthorizationService` |
| **Catalog** | Archive Product | ❌ | ❌ | `product.archive` | `permission:product.archive` |
| **Catalog** | Delete Product | ❌ | ❌ | `product.delete` | `permission:product.delete` |
| **Catalog** | Upload Media to Products/Brands | ❌ | ❌ | `product.image.upload`, `brand.edit` | `UploadController` folder permission gate |
| **Merchandising**| Manage Landing Page Banner & Rails | ❌ | ❌ | `homepage.banner.edit`, `homepage.brand.manage` | `permission:homepage.banner.edit` |
| **Cart** | Add Items, Update Quantities | ✅ | ✅ | ❌ (Client/Customer only) | Client & `CartController` |
| **Checkout** | Place Wholesale Order | ❌ | ✅ | ❌ (Customer only) | `auth:sanctum`, `role:customer` |
| **Orders** | View Personal Order History | ❌ | ✅ | ❌ (Scoped to user) | `OrderController@index` (scoped by `user_id`) |
| **Orders** | View All Platform Orders | ❌ | ❌ | `order.view` | `permission:order.view` |
| **Orders** | View Customer PII / Items / Label | ❌ | ❌ | `order.view_customer`, `order.view_items`, `shipment.label.view` | `OrderResource` selective masking |
| **Orders** | Confirm / Cancel Order | ❌ | ❌ | `order.confirm`, `order.cancel` | `AdminAuthorizationService` in `updateStatus()` |
| **Orders** | Verify / Reject Payment Proof | ❌ | ❌ | `payment.receipt.verify`, `payment.receipt.reject` | `permission:payment.receipt.verify`, `OrderController` |
| **Orders** | Trigger Aramex International Waybill | ❌ | ❌ | `shipment.create` | `permission:shipment.create` |
| **RFQ** | Submit Initial RFQ Inquiry | ✅ | ✅ | ❌ (Customer only) | `RfqController@store` |
| **RFQ** | Manage & Reply to RFQ Thread | ❌ | ✅ | `rfq.message.send` | `RfqController@addMessage` & `permission:rfq.message.send` |
| **Quotations** | View Received Quotations | ❌ | ✅ | ❌ (Customer only) | `QuotationController@index` (scoped by `user_id`) |
| **Quotations** | Create Formal Commercial Quote | ❌ | ❌ | `quotation.create` | `permission:quotation.create` |
| **Documents** | Download Proforma / Commercial Invoice| ❌ | ✅ | `document.download` | `permission:document.download` |
| **Inventory** | View Stock Balances by Warehouse | ❌ | ❌ | `inventory.view`, `inventory.view_warehouse` | `permission:inventory.view` |
| **Inventory** | Perform Stock Adjustment | ❌ | ❌ | `inventory.adjust` | `permission:inventory.adjust` |
| **Analytics** | View Operational Dashboard Metrics | ❌ | ❌ | `analytics.dashboard.view` | `permission:analytics.dashboard.view` (zero-leakage) |
| **Analytics** | View Sales Revenue Analytics | ❌ | ❌ | `analytics.sales.view` | `permission:analytics.sales.view` |
| **Analytics** | View Gross Profit & COGS Analytics | ❌ | ❌ | `analytics.profit.view`, `analytics.cogs.view` | `AnalyticsController` selective profit/COGS masking |
| **Audit** | View System Activity Logs & IP Trail | ❌ | ❌ | `audit.view`, `audit.view_sensitive` | `permission:audit.view`, `ActivityResource` masking |

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

---

## 5. Granular RBAC Architecture Under `admin`

While top-level `users.role` strictly maintains only `customer` and `admin`, the administrative tier is governed by a normalized, granular **Role-Based Access Control (RBAC)** engine:

```text
User
 └── users.role = admin
      │
      ├── Super Admin authority (users.is_super_admin = true)
      │    └── Unconditional authority over all administrative operations
      │
      └── RBAC Roles (roles table via admin_roles pivot)
            │
            └── Granular Permissions (permissions table via role_permissions pivot)
                  │
                  └── Dependency Graph (permission_dependencies table)
                        └── Automatic recursive expansion (e.g. publish → draft → view)
```

### 5.1 Super Admin Authority & Protected Operations
- **Authoritative Anchor**: Super Admin status is determined strictly by the database boolean column `users.is_super_admin = true`. The system does not check email addresses or names in frontend or backend code.
- **Unrestricted Access**: When `user->isSuperAdmin()` evaluates to true, all permissions are granted intrinsically without requiring explicit role assignments.
- **Root Security Invariants**:
  1. Ordinary admins cannot modify, deactivate, or delete Super Admin accounts.
  2. Ordinary admins cannot reset the Super Admin's password.
  3. No administrator can deactivate or delete their own account (prevents self-lockout).
  4. The last remaining active Super Admin cannot be deactivated or deleted.
  5. Ordinary admins cannot promote any account to Super Admin via API. Promotion is reserved for the backend artisan command: `php artisan rbac:promote-super-admin {email}`.
  6. Ordinary admins cannot assign themselves additional roles or escalate privileges.

### 5.2 RBAC Schema & Relational Integrity
- **`roles`**: Reusable permission bundles (`id, name, slug, description, is_system, is_active, created_by, updated_by, timestamps`).
  - `is_system = true`: Foundational system roles seeded by the platform. Cannot be deleted.
  - Custom roles: Created by Super Admin. Cannot be deleted while active administrators are assigned.
- **`permissions`**: 139 atomic authorization units (`id, name, slug, description, module, action, is_system, timestamps`). Slugs are immutable after deployment.
- **`permission_dependencies`**: Directed dependency graph (`permission_id, requires_permission_id`).
  - E.g. `product.publish` requires `product.save_draft` and `product.view`.
- **`role_permissions`**: Many-to-many pivot (`role_id, permission_id`).
- **`admin_roles`**: Many-to-many pivot (`user_id, role_id, assigned_by, assigned_at`). Strictly restricted to `users.role = 'admin'`.

### 5.3 Effective Permission Resolution & Provenance Breakdown
1. **Direct Role Permissions**: Permissions directly attached to an administrator's assigned roles via `role_permissions`.
2. **Inherited Dependencies**: Permissions automatically included because a directly granted permission declares them as a prerequisite in `permission_dependencies`.
3. **Provenance Attribution**:
   - The API (`GET /api/v1/admin/administrators/{id}/permissions`) and inspection UI explicitly distinguish:
     - `is_direct = true`: Granted directly via role(s) (e.g., `Product Publisher`).
     - `is_inherited = true`: Granted as a prerequisite of another held permission (e.g., required by `product.publish`).
4. **Redis Caching**: Effective permissions are cached per-admin in Redis (`rbac:user_perms:{id}`) with a 30-minute TTL. Caches are invalidated instantly when roles, role permissions, or user statuses are mutated.

### 5.4 Super Admin Control Center UI
The Admin Panel provides a dedicated **ADMINISTRATION** section in the sidebar:
1. **Administrators (`/admin/administrators`)**:
   - Real-time directory with search, status filtering, and role filtering.
   - Profile overview: name, email, phone, active status, assigned roles, and effective permission count.
   - Comprehensive actions: Create Admin, Edit Admin, Assign Roles, Inspect Effective Permissions with Provenance, Activate/Deactivate, Reset Password, Safe Deletion.
2. **RBAC Roles (`/admin/roles`)**:
   - Role directory displaying assigned admin count, permission count, and system vs custom indicator.
   - Create custom roles with auto-slug generation.
   - **Granular Permission Manager**: Domain-grouped permission checklist with real-time dependency resolution. Selecting a high-level action automatically checks prerequisites. Attempting to uncheck a required dependency alerts the user with the blocking dependents.
   - Role detail inspector showing direct vs inherited permissions and current member admins.
   - Deletion safety checks preventing accidental removal of system roles or assigned roles.
3. **Permissions Matrix (`/admin/permissions`)**:
   - Complete 139-permission register organized across 13 domain modules.
   - Displays description, action verb, required prerequisites, reverse dependent permissions, and active role assignments.

### 5.5 Audited Administrative Events
All mutations are recorded through `ActivityLogger` with sensitive credentials (passwords, tokens) redacted:
- `admin.created`: Creation of administrator account with initial roles.
- `admin.updated`: Profile and contact updates.
- `admin.activated` / `admin.deactivated`: Account status toggles.
- `admin.deleted`: Soft deletion of administrator and role detachment.
- `admin.password_reset`: Super Admin password resets with session revocation.
- `admin.roles_synced`: Role assignment updates on administrator.
- `role.created`: Creation of custom RBAC role.
- `role.updated`: Role metadata edits.
- `role.deleted`: Safe removal of custom role.
- `role.permissions_synced`: Modification of permissions on a role.

---

## 6. End-to-End Granular RBAC Enforcement (Master Prompt 3)

The broad assumption that `role:admin` grants universal administrative authority has been replaced by granular, atomic authorization enforced across all backend routes, domain controller mutations, API response resources, and frontend Next.js pages/components.

### 6.1 Backend Route Protection (`backend/routes/api.php`)
Every administrative route in `api.php` under `prefix('admin')` and all admin catalog mutations are wrapped with the granular `permission:<slug>` middleware:
- **Products Catalog**:
  - `GET /products` -> `permission:product.view`
  - `POST /products` -> `permission:product.create`
  - `PUT/PATCH /products/{id}` -> `permission:product.edit`
  - `DELETE /products/{id}` -> `permission:product.delete`
  - `POST /products/{id}/publish` & `unpublish` -> `permission:product.publish`
  - `POST /products/{id}/duplicate` -> `permission:product.create`
- **Orders & Payments**:
  - `GET /admin/orders` & `/admin/orders/{id}` -> `permission:order.view`
  - `PATCH /admin/orders/{id}/status` -> `permission:order.update_status`
  - `POST /admin/orders/{id}/payment/verify` & `review-payment-proof` (`approve`) -> `permission:payment.receipt.verify`
  - `POST /admin/orders/{id}/payment/reject` & `review-payment-proof` (`reject`) -> `permission:payment.receipt.reject`
  - `POST /admin/orders/{id}/aramex/shipment` -> `permission:shipment.create`
  - `POST /admin/orders/{id}/aramex/track` -> `permission:tracking.refresh`
- **Inventory & Warehouses**:
  - `GET /admin/inventory` & `/admin/inventory/summary` -> `permission:inventory.view`
  - `POST /admin/inventory/adjust` -> `permission:inventory.adjust`
  - `GET /admin/inventory/{id}/history` -> `permission:inventory.audit`
- **Analytics & Financials**:
  - `GET /admin/dashboard/metrics` -> `permission:analytics.dashboard.view`
  - `GET /admin/analytics/sales-profit` & `/overview` -> `permission:analytics.sales.view`
- **Commercial Documents**:
  - `GET /admin/orders/{id}/document/{type}` & `/quotations/{id}/document/{type}` -> `permission:document.download`
- **Media Uploads (`/upload`)**:
  - Folder `products/` requires `product.image.upload`
  - Folder `brands/` requires `brand.edit` or `brand.create`
  - Folder `categories/` requires `category.edit` or `category.create`
  - Folder `banners/` requires `homepage.banner.edit`

### 6.2 Domain Controller Mutation Integrity
1. **Product Mutation Verification**:
   - Saving a draft requires `product.save_draft` (or `product.create`).
   - Changing status to `published` requires `product.publish` (cannot publish with only draft/edit permissions).
   - Changing pricing (`wholesale_price`, `cost_price`, `bulk_price`, `full_stock_price`) requires `product.pricing.manage`.
   - Modifying packages or variants requires `product.package.manage` or `product.variant.manage`.
2. **Order Lifecycle State Transition Verification**:
   - Transition to `CONFIRMED` verifies `order.confirm`.
   - Transition to `CANCELLED` verifies `order.cancel`.
   - Transition to `PROCESSING` verifies `order.mark_processing`.
   - Transition to `SHIPPED` verifies `order.mark_shipped`.
   - Transition to `DELIVERED` verifies `order.mark_delivered`.
3. **Payment Proof Review**:
   - Approving/verifying bank-wire payment proof strictly requires `payment.receipt.verify`.
   - Rejecting payment proof strictly requires `payment.receipt.reject`.

### 6.3 Zero Data Leakage & Resource Masking
1. **Executive Dashboard Aggregations (`DashboardController`)**:
   - `total_products` & `active_products` masked to `0` if lacking `product.view`.
   - `total_orders` & `pending_orders` masked to `0`, and `recent_orders` to empty array if lacking `order.view`.
   - `total_customers` masked to `0` if lacking `customer.view`.
   - `low_stock_items` masked to `0` if lacking `inventory.view`.
   - `recent_rfqs` masked to empty array if lacking `rfq.view`.
2. **Financial Profit & COGS Masking (`AnalyticsController`)**:
   - `cogs`, `gross_profit`, and `profit_margin` are completely redacted across `summary`, `timeline`, and `series` if the administrator lacks `analytics.profit.view` or `analytics.cogs.view`.
3. **Order Resource Masking (`OrderResource`)**:
   - Customer name, email, phone, and addresses are masked to `[REDACTED]` if missing `order.view_customer`.
   - Line items are masked to `[]` if missing `order.view_items`.
   - Payment receipt URL and metadata are masked to `null` if missing `payment.receipt.view`.
   - Carrier shipping label URL is masked to `null` if missing `shipment.label.view`.
4. **Customer Resource Masking (`CustomerController`)**:
   - `total_spent` masked to `0` if missing `customer.view_spending`.
   - `orders` and `purchased_products` masked to `[]` if missing `customer.view_orders`.
5. **Activity Log Masking (`ActivityResource`)**:
   - User IP address and user-agent string masked to `[REDACTED]` if missing `audit.view_sensitive`.

### 6.4 Frontend Layer Enforcement
1. **Dynamic Navigation (`AdminSidebar.tsx`)**:
   - Navigation links (Products, Orders, Inventory, RFQs, Quotations, Customers, Coupons, Documents, Settings, Administrators, Roles, Permissions) dynamically check `can(permission)`. Navigation sections are completely hidden if the admin has no permissions in that module.
2. **Page-Level Direct URL Protection (`AdminPageGate.tsx`)**:
   - All admin pages (`/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`, `/admin/categories`, `/admin/brands`, `/admin/inventory`, `/admin/orders`, `/admin/orders/[id]`, `/admin/customers`, `/admin/coupons`, `/admin/homepage`, `/admin/documents`, `/admin/rfq-quotes`, `/admin/administrators`, `/admin/roles`, `/admin/permissions`, `/admin/settings`) are guarded by `AdminPageGate`. Manually typing restricted URLs renders a clean `403 Forbidden: Insufficient Administrative Permissions` screen without executing data fetches.
3. **Action-Level UI Gating (`PermissionGate.tsx`)**:
   - Action buttons (Add Product, Publish, Duplicate, Delete, Adjust Stock, Verify/Reject Payment Proof, Confirm Order, Cancel Order, Create Shipment) are gated or disabled with tooltips indicating missing permissions.
4. **Context Hook API (`useAdminAuth()`)**:
   - Centralized authorization helpers: `can(slug)`, `canAny([slugs])`, `canAll([slugs])`, `isSuperAdmin`, and `rbacProfile`. All frontend components use this single source of truth.

---

## 7. Master 4 Security Hardening & Production Invariants

### 7.1 Super Admin Protection
1. **Centralized Authority**: Super Admin authority is strictly determined by database-level attributes (`User::isSuperAdmin()` checking `role === 'admin' && (bool) is_super_admin`). Zero email, username, or frontend checks exist.
2. **Takeover Protection**: Ordinary admins cannot modify, deactivate, delete, or reset the password of a Super Admin account (`AdminUserController` rejects with 403 Forbidden).
3. **Last Super Admin Invariant**: The system unconditionally blocks deactivating or deleting the last active Super Admin account (422 Unprocessable Entity).
4. **Non-API Elevation**: New administrator accounts created via API always receive `is_super_admin = false`. Elevation to Super Admin is strictly reserved for the secure CLI command (`php artisan rbac:promote-super-admin`).

### 7.2 Delegation & Privilege Escalation Barriers
1. **Self-Role Elevation Prevention**: Administrators are strictly blocked from altering their own assigned roles via `PUT /api/v1/admin/administrators/{id}` (403 Forbidden).
2. **Delegation Boundary**: An administrator cannot grant another administrator a role that contains permissions exceeding the assignor's own effective permissions. Any attempted privilege escalation is rejected with 403 Forbidden.
3. **Access Level Protection**: Ordinary administrators cannot set `access_level: 'super_admin'`.

### 7.3 Permission Dependency & Graph Integrity
1. **Deterministic Dependency Resolution**: Recursive expansion (`AdminAuthorizationService::expandDependencies`) resolves all prerequisites (e.g. `product.publish` -> `product.save_draft` + `product.view`).
2. **Circular Dependency Detection**: `AdminAuthorizationService::wouldCreateCycle()` performs BFS cycle detection before attaching dependencies. Attempting to create a circular graph (e.g. A -> B -> C -> A) throws `InvalidArgumentException` and is blocked.
3. **Cache Invalidation**: Modifying roles, permissions, or dependencies calls `invalidateRole()` or `invalidateAll()`, clearing cached effective permissions across Redis/cache storage immediately.

### 7.4 Session Lifecycle & Token Revocation
1. **Deactivation Session Termination**: Deactivating an administrator immediately purges all active Sanctum tokens (`$admin->tokens()->delete()`), invalidates the permission cache, and prevents subsequent requests.
2. **Deactivation Auth Barrier**: Deactivated accounts cannot obtain new tokens via `/api/v1/auth/login` (validation error: account deactivated).
3. **Password Reset Revocation**: Resetting a password immediately revokes all prior active tokens.

### 7.5 IDOR & Data Leakage Protections
1. **Guest Order Authorization**: Unauthenticated and customer users cannot access guest orders without providing the matching order email (`OrderController@show`).
2. **Commercial Document Downloads**: Synchronous and asynchronous document generation strictly verifies customer order ownership or admin permissions (`document.view` / `document.download`).
3. **Product Cost Price Masking**: `ProductResource` redacts `costPrice` to `null` unless the administrator possesses `product.pricing.manage` or `analytics.cogs.view`.


