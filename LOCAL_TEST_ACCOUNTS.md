# Ayaan Clothing — Local Test Accounts & Credentials

> **STATUS: CLEAN LOCAL STATE**
> The local development database has been reset to a completely blank, pristine state.
> All previous demo accounts and sample catalog records have been purged.
> **No accounts exist until you manually create them.**

---

## 👑 Bound Super Administrator Credentials

All administrative logins occur at: **[http://localhost:3001/admin/login](http://localhost:3001/admin/login)**

* **Email:** `ayaanclproject26@gmail.com`
* **Password:** `Admin@12345`
* **Role:** `admin` (`is_super_admin: true`)
* **Status:** `active`
* **Authority:** Unrestricted (139 / 139 effective permissions)

> **Changing Your Password Later:**
> You can update this password at any time either:
> 1. Directly in the Admin Portal via **Settings → Administrators**
> 2. Via CLI: `php artisan tinker --execute="App\Models\User::where('email', 'ayaanclproject26@gmail.com')->first()->update(['password' => Hash::make('YOUR_NEW_PASSWORD')]);"`

---

## 🚀 Creating Additional Administrators (Optional)

To provision additional administrator accounts, run:

```bash
php artisan app:create-admin
```

Or invite and configure them via the Admin Portal UI under **Users & Roles**.

To create customer accounts, simply visit the storefront registration page at **[http://localhost:3000/signup](http://localhost:3000/signup)**.

---

## 🌐 Local Application URLs

| Application | Port | URL | Description |
| :--- | :--- | :--- | :--- |
| **Customer Storefront** | `3000` | [http://localhost:3000](http://localhost:3000) | Public B2B/B2C storefront, catalog, cart, checkout, customer dashboard |
| **Admin Portal** | `3001` | [http://localhost:3001](http://localhost:3001) | Dedicated administrative portal (auto-proxies with admin origin header) |
| **Laravel REST API** | `8000` | [http://127.0.0.1:8000](http://127.0.0.1:8000) | Core backend API, Sanctum authentication, PostgreSQL, Redis |

---

## 🔑 Reference RBAC Archetypes & Test Scenarios

When creating subsequent administrators, you can assign any of the 12 template roles:
* **Email:** `admin@ayaan-demo.local`
* **Password:** `Admin@12345`
* **Database Role:** `admin` (`is_super_admin: true`)
* **Effective Permissions:** 139 / 139 (Unrestricted Authority)
* **Scope / Intended Testing:**
  * Has full access to everything: Catalog, Orders, Payments, Inventory, RFQs, Quotes, Customers, Analytics, Audit Logs, Settings.
  * Only account that can manage Admin Users and assign/revoke RBAC roles.
  * Unmasked financial metrics: Gross Profit and Profit Margins are visible.

---

### 2. Product Draft Admin
* **Email:** `product-admin@ayaan-demo.local`
* **Password:** `Admin@12345`
* **Database Role:** `admin` | **Assigned RBAC Role:** `product_draft_editor`
* **Effective Permissions (16):**
  * `product.view`, `product.create`, `product.save_draft`, `product.edit`
  * `product.variant.view`, `product.variant.edit`
  * `product.pricing.view`, `product.pricing.edit`
  * `product.package.view`, `product.package.edit`
  * `product.image.view`, `product.image.upload`
  * `brand.view`, `category.view`
* **Allowed Actions:**
  * Create new products as **Drafts** (`status = draft`).
  * Edit product descriptions, packaging assortments, variants, images, and pricing.
* **Forbidden Actions (Boundary Verification):**
  * ❌ **Cannot Publish:** `product.publish` is absent. Attempting to set status to `published` will trigger 403 Forbidden.
  * ❌ **Cannot Delete:** `product.delete` is absent.
  * ❌ **Cannot Manage Users or Settings.**

---

### 3. Payment Reviewer
* **Email:** `payment-reviewer@ayaan-demo.local`
* **Password:** `Admin@12345`
* **Database Role:** `admin` | **Assigned RBAC Role:** `payment_reviewer`
* **Effective Permissions (6):**
  * `payment.view`, `payment.receipt.view`, `payment.receipt.download`, `payment.receipt.verify`, `payment.receipt.reject`
  * `order.view`
* **Allowed Actions:**
  * View customer orders with pending offline wire payments.
  * Inspect, download, and review uploaded wire transfer bank receipts.
  * Approve / verify payment receipts or reject with reason.
* **Forbidden Actions (Boundary Verification):**
  * ❌ **Cannot Confirm Orders:** `order.confirm` / `order.update_status` is absent.
  * ❌ **Cannot Edit Products or Pricing.**
  * ❌ **Cannot Create Shipments or Adjust Stock.**

---

### 4. Inventory Viewer
* **Email:** `inventory-viewer@ayaan-demo.local`
* **Password:** `Admin@12345`
* **Database Role:** `admin` | **Assigned RBAC Role:** `inventory_viewer`
* **Effective Permissions (3):**
  * `inventory.view`, `inventory.view_warehouse`, `product.view`
* **Allowed Actions:**
  * View current stock levels, carton breakdown, and warehouse locations.
* **Forbidden Actions (Boundary Verification):**
  * ❌ **Cannot Adjust Inventory:** `inventory.adjust` is absent. The "Adjust Stock" button is disabled/hidden and direct API mutation returns 403 Forbidden.
  * ❌ **Cannot View Financials or Modify Orders.**

---

### 5. Order Viewer
* **Email:** `order-viewer@ayaan-demo.local`
* **Password:** `Admin@12345`
* **Database Role:** `admin` | **Assigned RBAC Role:** `order_viewer`
* **Effective Permissions (4):**
  * `order.view`, `order.view_customer`, `order.view_items`, `customer.view`
* **Allowed Actions:**
  * View list of wholesale orders, customer company information, and ordered line items.
* **Forbidden Actions (Boundary Verification):**
  * ❌ **Cannot Confirm or Transition Order Status:** `order.update_status` is absent. Status transition buttons are hidden/forbidden.
  * ❌ **Cannot Verify Payments.**
  * ❌ **Cannot Edit Catalog or Inventory.**

---

### 6. Analytics & Sales Viewer
* **Email:** `analytics-viewer@ayaan-demo.local`
* **Password:** `Admin@12345`
* **Database Role:** `admin` | **Assigned RBAC Role:** `sales_viewer`
* **Effective Permissions (3):**
  * `analytics.dashboard.view`, `analytics.sales.view`, `analytics.orders.view`
* **Allowed Actions:**
  * View sales trends, order volume, and gross sales revenue.
* **Forbidden Actions (Boundary Verification):**
  * ❌ **Cannot View Profit / COGS:** `analytics.profit.view` is absent. Gross Profit and Profit Margin cards display as masked (`null` / hidden).
  * ❌ **Cannot View Customer Personal Data or Manage Orders.**

---

## 🛍️ Customer Test Accounts

All customer accounts sign in at: **[http://localhost:3000/auth/login](http://localhost:3000/auth/login)**

### 1. Verified B2B Wholesale Customer (Net-30 Terms)
* **Email:** `customer@ayaan-demo.local`
* **Password:** `Customer@12345`
* **Name:** Elena Rostova
* **Company:** Rostova Retail Boutique LLC
* **Role:** `customer`
* **B2B Status:** `approved`
* **Payment Terms:** `net_30` (Eligible for wholesale tier pricing, commercial credit checkout, and RFQ submissions)

### 2. Standard B2B Wholesale Customer (Pending/Proforma)
* **Email:** `b2b-customer@ayaan-demo.local`
* **Password:** `Customer@12345`
* **Name:** Marcus Vance
* **Company:** Vance Global Logistics FZE
* **Role:** `customer`
* **B2B Status:** `approved`
* **Payment Terms:** `proforma_invoice` (Eligible for proforma invoice wire transfer checkout)

---

## 🧪 Key RBAC Boundaries to Manually Verify

| Boundary Test | User to Test | Expected Behavior |
| :--- | :--- | :--- |
| **Draft != Publish** | `product-admin@ayaan-demo.local` | Can create and edit product drafts; clicking "Publish" or toggling active status is rejected with 403. |
| **Order View != Confirm** | `order-viewer@ayaan-demo.local` | Can open and view order details; "Confirm Order" / status dropdown triggers 403 or is disabled. |
| **Payment View != Verify** | `order-viewer@ayaan-demo.local` vs `payment-reviewer@ayaan-demo.local` | Order viewer cannot verify bank slips; Payment Reviewer can review and verify receipts. |
| **Inventory View != Adjust** | `inventory-viewer@ayaan-demo.local` | Can inspect warehouse stock; "Adjust Stock" button is disabled and direct API POST triggers 403. |
| **Sales View != Profit View** | `analytics-viewer@ayaan-demo.local` vs `admin@ayaan-demo.local` | Analytics viewer sees Sales volume, but Gross Profit is masked (`null`); Super Admin sees actual Profit & Margins. |
| **Admin Management != Ordinary Admin** | `product-admin@ayaan-demo.local` vs `admin@ayaan-demo.local` | Ordinary admins cannot access `/admin/settings/users` or `/admin/rbac/roles` (403 Forbidden). Super Admin has full management access. |
