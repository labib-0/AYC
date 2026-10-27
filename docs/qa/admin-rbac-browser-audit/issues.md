# Identified Issues & Business Policy Decisions — AYC RBAC Audit

## Active Issues & Decisions Matrix

| Issue ID | Severity | Category | Title | Affected Role | Route / Component | Status |
|---|---|---|---|---|---|---|
| **RBAC-ISSUE-001** | **P2 (Medium)** | Functional / Policy | Draft Editor Lacks Supplier Directory Visibility | `product_draft_editor` | `/ayc/products/new`<br>`SupplierSelect.tsx` | **NEEDS_REVIEW** |
| **RBAC-ISSUE-002** | **P3 (Low)** | Hygiene / Audit | Soft-Deleted Historical Administrator Account (#6) | None | Database `users` table | **DOCUMENTED** |
| **RBAC-ISSUE-003** | **P3 (Low)** | Governance | Zero Administrative Staff Role Assignments | All Roles | Database `admin_roles` table | **DOCUMENTED** |

---

### Detailed Issue Reports

#### 1. RBAC-ISSUE-001: Draft Editor Lacks Supplier Directory Visibility
- **Severity**: P2 (Medium)
- **Affected Role**: `product_draft_editor` (Role ID 1)
- **Component**: [src/components/admin/products/form/SupplierSelect.tsx](file:///Users/labibhasan/Documents/AYC/src/components/admin/products/form/SupplierSelect.tsx)
- **API Endpoint**: `GET /api/v1/admin/suppliers`
- **Current Behavior**:
  - `GET /api/v1/admin/suppliers` requires `permission:supplier.view` (established in commit `a4107a2`).
  - `product_publisher` and `inventory_manager` have `supplier.view`.
  - `product_draft_editor` does **not** have `supplier.view`.
  - When an administrator assigned solely to `product_draft_editor` attempts to create or edit a draft garment, the supplier selection dropdown attempts to fetch `/api/v1/admin/suppliers` and receives `HTTP 403 Forbidden`.
- **Expected / Intended Policy**:
  - Either `supplier.view` should be assigned to `product_draft_editor` in [backend/database/seeders/RbacPermissionCatalogSeeder.php](file:///Users/labibhasan/Documents/AYC/backend/database/seeders/RbacPermissionCatalogSeeder.php), OR the frontend should disable the supplier dropdown cleanly for users without `supplier.view`.
- **Action**: Flagged as `NEEDS_REVIEW` for business owner approval before granting extra access.

#### 2. RBAC-ISSUE-002: Soft-Deleted Historical Administrator Account
- **Severity**: P3 (Low)
- **Affected Account**: User ID 6 (`rim@rimakter.com`)
- **Current Behavior**:
  - Account has `deleted_at = 2026-10-02 10:56:34`.
  - Cannot authenticate, holds 0 tokens, holds 0 role assignments in `admin_roles`.
- **Recommendation**: Retain in soft-deleted state for historical audit integrity, or execute a permanent purge if required by data retention policy.

#### 3. RBAC-ISSUE-003: Zero Administrative Staff Role Assignments
- **Severity**: P3 (Low)
- **Current Behavior**:
  - `admin_roles` contains 0 rows in production.
  - Platform operates under single Super Admin User ID 3 (`ayaanclproject26@gmail.com`).
  - All 13 system/custom roles are pre-seeded and configured.
- **Status**: Verified intentional for the current single-admin deployment. Ready for staff role delegation upon team expansion.
