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

