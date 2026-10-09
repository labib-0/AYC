# AYC Admin POS Terminal — Phase 1: Complete Audit & Gap Analysis

**Date**: October 9, 2026
**Auditor**: Senior Full-Stack Engineer & Product Designer
**Scope**: Ayaan Clothing (AYC) Admin Point of Sale (POS) Module (`/ayc/pos`)
**Status**: AUDIT COMPLETE — PHASE 1 DELIVERABLE (NO CODE MODIFIED)

---

## Executive Summary

The Ayaan Clothing (AYC) Admin POS Terminal is an operational counter-sale interface engineered to enable physical showroom, warehouse counter, and direct B2B cash/card transactions.

Our audit verified that the POS backend possesses strong foundational integrity:
- **Server-Authoritative Pricing**: Calculation logic is strictly centralized in `OrderCalculationService`. Client-side tampering of unit prices or line totals is impossible.
- **Atomic Concurrency & Inventory**: Stock deductions utilize database transactions (`DB::transaction`) with pessimistic row locking (`lockForUpdate`), preventing negative inventory and concurrent overselling. Full audit trails are recorded in `AdminInventoryAdjustment`.
- **Granular RBAC**: Access is strictly guarded across three dedicated permissions: `pos.view`, `pos.create`, and `pos.discount`.
- **Backend Test Coverage**: 60 feature tests (219 assertions) pass with 100% success across `AdminPosSaleWorkflowTest`, `AdminPosPhase2WorkflowTest`, and `AdminPosPhase3DocumentWorkflowTest`.

However, the POS terminal suffers from **severe workflow and cashier-usability deficiencies** that hinder high-speed counter operations:
1. **No Walk-in / Guest Customer Support**: Every transaction strictly requires selecting an existing pre-registered customer account (`role = 'customer'`). Walk-in cash customers cannot purchase without an admin first leaving the POS screen to manually register an account.
2. **Broken Cash-Tendered Logic**: Entering a paid amount greater than the grand total (e.g., tendering a $50 bill for a $42.50 sale) triggers an unhandled `422 Unprocessable Entity` validation error instead of calculating and displaying change return.
3. **Ergonomic Layout Disconnect**: The screen places product catalog and cart line items on the left column (forcing deep vertical scrolling between search and cart table), while financial summaries and payments sit on the right column.
4. **No Barcode Scanner Auto-Add**: Product search lacks an `Enter` key listener and 1-scan-to-cart mechanism. Every item lookup requires typing into a text field, manually clicking a search result card, and clicking an "Add to POS Sale" button.
5. **No 80mm/58mm Thermal Receipt**: Sale completion links only to a full A4 commercial export sales invoice designed for international freight, with no compact thermal receipt printer layout or automatic `window.print()` trigger.

---

## 1. Current Implementation & Key File Locations

| Layer | File / Location | Responsibility |
|:---|:---|:---|
| **Frontend Route** | `src/app/ayc/pos/page.tsx` | Full POS terminal UI (1,863 lines): customer search, product grid, cart state, coupon, manual discount, payment method, settlement, and success modal. |
| **Frontend Service** | `src/services/admin/pos.service.ts` | Typed API client wrapping endpoints: `searchCustomers`, `searchProducts`, `getWarehouses`, `calculatePreview`, `completeSale`. |
| **Navigation Entry** | `src/components/admin/layout/AdminSidebar.tsx` | Sidebar entry under `COMMERCE` (`label: "POS"`, `href: "/ayc/pos"`, `permission: ADMIN_PERMISSIONS.POS_VIEW`). |
| **Frontend RBAC Tokens** | `src/lib/permissions.ts` | Defines `POS_VIEW: "pos.view"`, `POS_CREATE: "pos.create"`, `POS_DISCOUNT: "pos.discount"`. |
| **Backend API Controller** | `backend/app/Http/Controllers/Api/V1/Admin/PosController.php` | Handles HTTP routing, request validation, customer role checking, and response formatting. |
| **Backend Primary Service** | `backend/app/Services/Order/AdminPosSaleService.php` | Core POS business service (750 lines): customer search, product catalog query, preview calculation, idempotency cache, pessimistic stock deduction, order & payment creation, audit logging. |
| **Calculation Engine** | `backend/app/Services/Order/OrderCalculationService.php` | Authoritative pricing, wholesale quantity tier resolution, coupon rules, manual discount stacking, tax rates, and shipping snapshots. |
| **Database Migrations** | `2026_10_05_140000_add_order_source_and_operator_to_orders_table.php`<br>`2026_10_05_150000_add_pos_phase2_fields_to_orders_table.php` | Adds `order_source`, `created_by_admin_id`, `manual_discount_amount`, `manual_discount_type`, `manual_discount_value`, `manual_discount_reason`, `paid_amount`, `balance_due` to `orders`. Seeds POS permissions. |
| **Database Models** | `backend/app/Models/Order.php`<br>`backend/app/Models/OrderItem.php`<br>`backend/app/Models/Payment.php`<br>`backend/app/Models/AdminInventoryAdjustment.php`<br>`backend/app/Models/OrderStatusEvent.php` | Authoritative data persistence, relationships, and state flags. |
| **Document Services** | `backend/app/Services/Documents/InvoiceService.php`<br>`src/app/ayc/documents/[type]/[id]/page.tsx` | Sales Invoice generation and PDF streaming. |
| **Backend Automated Tests** | `backend/tests/Feature/Admin/AdminPosSaleWorkflowTest.php`<br>`backend/tests/Feature/Admin/AdminPosPhase2WorkflowTest.php`<br>`backend/tests/Feature/Admin/AdminPosPhase3DocumentWorkflowTest.php` | 60 PHPUnit tests verifying permissions, stock deductions, concurrency, rollbacks, coupons, manual discounts, and documents. |

---

## 2. Existing POS Features & Their Verified Status

| Feature / Capability | Verified Status | Technical Implementation & Notes |
|:---|:---:|:---|
| **POS Route & Page Gate** | **WORKING** | Protected by `<AdminPageGate permission="pos.view">` on frontend and `middleware('permission:pos.view')` on API. Redirects or returns 403 when unauthorized. |
| **Operator Attribution** | **WORKING** | Displays active operator name in top bar; records `created_by_admin_id` on the `Order` and `confirmed_by` on the `Payment`. |
| **Warehouse Fulfillment Selection** | **WORKING** | Populates active warehouses via `GET /api/v1/admin/pos/warehouses`. Deductions decrement inventory for the selected warehouse record. |
| **Product Search (Text)** | **WORKING** | Debounced search by Name, SKU, Brand, or ID via `GET /api/v1/admin/pos/products`. Correctly shows active stock and wholesale unit prices. |
| **Product Variant Selection** | **WORKING** | Displays discrete size/color pills for products with standalone variants. Disables out-of-stock variants. |
| **Wholesale Tier Pricing** | **WORKING** | Evaluates volume pricing tiers (e.g. 50+ pcs, 100+ pcs) dynamically based on cart quantity. |
| **Server-Side Price Integrity** | **WORKING** | Client cannot manipulate unit prices. Client sends only `{ product_id, variant_id, quantity }`; server resolves prices. |
| **Inventory Validation & Decrement** | **WORKING** | Atomic `lockForUpdate` prevents overselling. Deducts variant stock, warehouse ledger, and aggregate stock. Creates `AdminInventoryAdjustment`. |
| **Idempotency Protection** | **WORKING** | Generates `pos_${timestamp}_${random}` key; cached in Redis for 15 minutes. Double-submits return existing order without double-charging or deducting stock twice. |
| **Transaction Rollback** | **WORKING** | Wrapped in `DB::transaction`. If one item fails stock check or database errors occur, zero records are saved. |
| **Coupon Validation** | **WORKING** | Server validates expiry, active state, min spend, and max discount cap. Atomically locks and increments `usage_count`. |
| **Manual Admin Discount** | **WORKING** | Supports percentage or fixed discount with mandatory reason. Strictly gated by `pos.discount` permission. Logs audit in `ActivityLogger`. |
| **Payment Status Assignment** | **WORKING** | Correctly marks order as `paid`, `partially_paid`, or `pending` based on paid amount vs grand total. Creates `Payment` record if paid > 0. |
| **Order Document (A4 Invoice)** | **WORKING** | Success modal links to `/ayc/documents/INVOICE/order_${id}` which renders full commercial sales invoice with PDF streaming. |
| **Walk-in / Guest Customer** | **BROKEN / MISSING** | **Critical Gap**: Backend requires `customer_id` matching an existing `User` (`role = 'customer'`). Frontend has no "Walk-in" button or fast guest creation modal. |
| **Cash Tendered & Change Return** | **BROKEN** | **Critical Gap**: Entering paid amount > total amount throws `422 Unprocessable Entity`. No change calculator. |
| **Split / Multi-Tender Payments** | **NOT IMPLEMENTED** | System accepts exactly one payment method string (`pos_cash`, `card`, `bank_transfer`, `mobile_banking`). Cannot split between Cash and Card. |
| **Barcode Scanner Fast Add** | **NOT IMPLEMENTED** | No `Enter` listener on search input. No automatic 1-scan add-to-cart mechanism. |
| **Category & Brand Browse Tabs** | **NOT IMPLEMENTED** | No category filters or quick-pick tiles. Only text search is available. |
| **Thermal Receipt (58mm/80mm)** | **NOT IMPLEMENTED** | No thermal receipt print format. Requires opening full A4 invoice in a new tab. |
| **Cart Persistence / Hold Sale** | **NOT IMPLEMENTED** | Cart is held in React component state only. Page refresh or tab switch wipes the cart immediately. |
| **End-of-Day Register Balancing** | **NOT IMPLEMENTED** | No register opening/closing, cash drawer tracking, or daily Z-report summaries. |

---

## 3. End-to-End Frontend / Backend Workflow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION                                                                      │
│    • Frontend: Mounts /ayc/pos ──> checks pos.view permission                         │
│    • API Calls: GET /admin/pos/warehouses, GET /admin/pos/products (limit 12)          │
│    • Operator: adminUser from AdminAuthContext (displays "Operator: Super Admin")      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. CUSTOMER LOOKUP (MANDATORY GATE)                                                    │
│    • Input: Cashier searches name, phone, or email (debounced 250ms)                   │
│    • API Call: GET /admin/pos/customers?search=...                                     │
│    • State: Cashier selects customer ──> selectedCustomer stored in React state       │
│    • [DEFECT]: If customer is walk-in / unregistered, workflow is blocked here.        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. PRODUCT DISCOVERY & CART ADDITION                                                   │
│    • Input: Cashier searches by SKU or title (debounced 250ms)                         │
│    • API Call: GET /admin/pos/products?search=...&warehouse_id=...                     │
│    • Interaction: Cashier clicks product card ──> opens configuration sub-panel        │
│    • Configuration: Selects variant pill, adjusts quantity (respects MOQ step)        │
│    • Action: Clicks "Add to POS Sale" ──> item appended to cart array                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. LIVE AUTHORITATIVE RECALCULATION                                                    │
│    • Trigger: Triggers on cart change, customer change, coupon, or manual discount     │
│    • API Call: POST /admin/pos/calculate                                               │
│    • Payload: { customer_id, items: [{ product_id, variant_id, quantity }], ... }      │
│    • Engine: OrderCalculationService validates stock, MOQ, tiers, coupons, discounts   │
│    • Response: { subtotal, discount_amount, tax_amount: 0, total_amount, balance_due } │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. PAYMENT & SETTLEMENT CONFIGURATION                                                  │
│    • Payment Method: Selects pos_cash, card, bank_transfer, or mobile_banking          │
│    • Paid Amount: Defaults to total_amount; shortcuts: "Pay Full", "Split 50%", "$0"  │
│    • Reference: Optional Trx ID / card slip reference                                  │
│    • [DEFECT]: Typing tendered cash > total throws 422 error; cannot calculate change. │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 6. TRANSACTION SUBMISSION & ATOMIC EXECUTION                                           │
│    • Action: Cashier clicks "Complete Sale"                                            │
│    • API Call: POST /admin/pos/orders (Header: X-Idempotency-Key)                      │
│    • Server Transaction (DB::transaction):                                             │
│      1. Acquires operator cache lock (10s TTL)                                         │
│      2. Re-verifies items with OrderCalculationService                                  │
│      3. Pessimistic lock (lockForUpdate) on ProductVariant and Inventory               │
│      4. Generates order number: AYN-POS-YYYYMMDD-XXXXXX                                │
│      5. Creates Order record (order_source = 'pos', status = 'processing')             │
│      6. Creates OrderItem records                                                      │
│      7. Atomically decrements stock & creates AdminInventoryAdjustment record          │
│      8. Creates Payment record if paid_amount > 0 (confirmed_by = admin->id)           │
│      9. Records OrderStatusEvent & ActivityLogger entries                              │
│      10. Caches order ID under idempotency key for 15 minutes                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 7. SALE COMPLETION & DOCUMENTATION                                                     │
│    • Frontend: Receives HTTP 201 Created with OrderResource; clears active cart        │
│    • UI: Displays Success Modal with Order #, Paid amount, Balance due                 │
│    • Actions:                                                                          │
│      • "Print Invoice": Opens /ayc/documents/INVOICE/order_{id} in new tab             │
│      • "View Order": Navigates to /ayc/orders/{id}                                     │
│      • "New Sale": Resets terminal state for next customer                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. UI/UX Problems Ranked by Severity

### Severity 1: Critical (Directly Blocks or Corrupts Sales)
1. **Mandatory Customer Account Blocker**:
   - The cashier cannot calculate totals or complete a sale without selecting a pre-registered customer.
   - For in-person walk-ins, counter retail, or showroom visitors, the cashier is forced to open a new tab, navigate to `/ayc/customers`, register the user, and switch back.
2. **Crash on Cash Tender Greater than Total**:
   - In cash sales, customers regularly hand larger bills (e.g., $100 for an $85 order).
   - Entering $100 into the paid amount input triggers an alarming red error banner: `"Paid amount ($100.00) cannot exceed the grand total ($85.00)"`.
   - The cashier has to mentally calculate the change ($15.00), discard it, and type exactly $85.00.
3. **Ergonomic Split Between Cart Lines and Cart Totals**:
   - The left column stacks: (1) Customer card, (2) Product search & catalog grid, (3) Cart line items table.
   - The right column contains: Financial breakdown and payment methods.
   - On standard laptop/POS screens (768px – 1366px), adding products pushes the cart table completely off the bottom of the screen. The cashier must scroll up and down repeatedly to verify line quantities while adjusting payment on the right.

### Severity 2: High (Major Cashier Friction & Inefficiency)
4. **No Barcode Scanner Fast-Add**:
   - Barcode scanners enter the scanned SKU and send an `Enter` keystroke.
   - The search input does not handle `Enter` and does not automatically add matching items to the cart.
   - The cashier must scan, take their hand off the scanner, grab the mouse, click the card, select variant, and click "Add to POS Sale".
5. **No Category or Quick-Pick Navigation**:
   - Only 12 products are rendered on initial load within a cramped `max-h-80` (320px) scrollable box.
   - There are no category tabs (e.g. T-Shirts, Polos, Denim, Hoodies) or brand filters.
   - Finding any product outside the first 12 requires manual text typing.
6. **No Cart Persistence (Volatile State)**:
   - Cart items live only in React memory.
   - An accidental browser reload (`Cmd+R` / `F5`) or network reconnection wipes the entire cart.

### Severity 3: Medium (Operational & Document Inconveniences)
7. **Lack of 80mm / 58mm Thermal Receipt**:
   - "Print Invoice" redirects to an A4 landscape/portrait export commercial document.
   - Counter printers (Epson, Star Micronics, Munbyn) require a narrow thermal receipt layout with store header, itemized lines, tax breakdown, and change return.
8. **Lack of Keyboard Shortcuts**:
   - No hotkeys for primary cashier actions (`F1` for product search, `F2` for customer, `F4` for cash payment, `F9` for complete sale, `Esc` to cancel).
9. **Order Fulfillment Left as "Unfulfilled"**:
   - POS orders are created with `fulfillment_status = 'unfulfilled'` and `status = 'processing'`.
   - In the admin orders list, POS orders appear identical to online orders awaiting warehouse packing and Aramex dispatch, rather than showing "In-Store Handover Completed".

---

## 5. Functional, Financial, Inventory, and Security Defects

### 5.1 Functional Defects
1. **Unregistered Counter Customer Handling**: `PosController::calculate` and `PosController::store` require `customer_id` exists in `users` with `role = 'customer'`. There is no anonymous guest support or fallback walk-in customer profile.
2. **Multi-Tender (Split Payment) Unsupported**: The database and API support recording only one payment method string per transaction. If a buyer pays $200 in cash and $300 on corporate credit card, the cashier must force the entire record into one method.
3. **Cart Suspension (Park / Hold Sale) Missing**: If a counter customer needs to retrieve their wallet, the cashier cannot park the cart to serve the next customer in line.

### 5.2 Financial Defects
1. **Over-Tender Rejection**: `AdminPosSaleService.php` lines 265–269 strictly throws:
   ```php
   if ($paidAmount > $totalAmount) {
       throw ValidationException::withMessages([
           'paid_amount' => "Paid amount (\${$paidAmount}) cannot exceed the grand total (\${$totalAmount})."
       ]);
   }
   ```
   This prevents capturing tender amounts and calculating change.
2. **Hardcoded USD Currency**: The entire POS frontend and backend hardcodes `'currency' => 'USD'`. The local physical showroom in Uttara, Dhaka cannot process cash sales in Bangladeshi Taka (BDT) or toggle currencies.
3. **Hardcoded 0% Tax**: `OrderCalculationService.php` lines 304–307 hardcodes `taxRate = 0.0` for POS. There is no configuration for local retail VAT (e.g., 5% or 7.5% Mushak).

### 5.3 Inventory Defects
1. **Rigid Wholesale MOQ Enforcement**:
   - B2B products with `moq = 50` or `moq = 100` reject quantities below MOQ:
     ```php
     if ($quantity < $product->moq) {
         throw new InvalidArgumentException("Minimum order quantity (MOQ) for '{$product->name}' is {$product->moq} pcs.");
     }
     ```
   - Counter customers purchasing single sample units or showroom floor samples cannot be processed through POS unless an admin edits the product catalog MOQ first.
2. **Wholesale Package Assortment Block**:
   - Products with `packageAllocations` reject individual size/variant ordering:
     ```php
     if ($hasAllocations && ($variantId || (!empty($size) && !in_array($size, ['Assorted', ...])))) {
         throw new InvalidArgumentException("Individual size/variant ordering is not allowed...");
     }
     ```
   - Cashiers cannot sell a single standalone Size L or Size M off the showroom rack for package-allocated products.

### 5.4 Security & Authorization
- **Strengths Verified**:
  - Permissions are strictly enforced server-side via Laravel middleware and `AdminAuthorizationService`. Customers or non-admin roles receive 403 Forbidden.
  - Manual discounts require `pos.discount` permission and mandatory audit reason.
  - Sensitive internal operator notes and manual discount audit reasons are masked when customers view their own order invoices (`InvoiceService::generateForOrder`).
  - Unit prices are calculated server-side; client price tampering is impossible.
- **Vulnerabilities / Risks**:
  - **Shared Terminal Attribution**: If multiple staff use the same physical counter PC, sales remain attributed to whichever admin logged in first. There is no quick PIN-pad cashier switch.

---

## 6. Missing Capabilities & Their Dependencies

| Missing Capability | Description | Architectural Dependencies |
|:---|:---|:---|
| **Walk-in Customer Flow** | Default "Walk-in Counter Customer" fallback profile or 10-second inline customer creation modal (Name, Phone, Email). | `User` model, `PosController::customers`, POS frontend state. |
| **Cash Tendered & Change Due** | Fields for `tendered_amount` and `change_due` display. Server accepts `tendered_amount >= total_amount` and records `paid_amount = total_amount`. | `AdminPosSaleService`, `Payment` model, POS frontend summary card. |
| **Split (Multi-Tender) Payment** | Ability to allocate payments across multiple methods (e.g. $100 Cash + $150 Card). | `Payment` model (already has 1-to-many relationship with Order), `PosSalePayload`, `AdminPosSaleService`. |
| **Barcode Scanner Fast Add** | Detect `Enter` key on SKU search. If exact match found, automatically increment or add to cart with audio beep feedback. | POS frontend search handler, product SKU lookup. |
| **Thermal Receipt (58/80mm)** | Dedicated printable receipt slip with store header, order #, date, items, subtotal, tax, paid, change, and barcode. | CSS print media query (`@media print`), browser `window.print()`. |
| **Park / Hold Cart Queue** | Local storage / session storage queue allowing cashiers to suspend up to 5 carts and resume them later. | Browser `localStorage` / React state management. |
| **Category Quick-Browse Pills** | Horizontal scrollable category filters (All, T-Shirts, Polos, Denim, Jackets, Accessories) above catalog grid. | `Category` model, `GET /api/v1/admin/categories`, POS frontend. |
| **Immediate In-Store Handover Status** | Option to complete order with `fulfillment_status = 'delivered'` and `status = 'completed'` immediately at counter checkout. | `Order` model, `AdminPosSaleService`. |
| **Register Shift / Z-Report** | Shift opening float, cash drawer reconciliation, and end-of-day summary of POS sales by payment method. | New `PosRegisterShift` model or daily sales aggregation service. |

---

## 7. Recommended Improvements Prioritized

### Priority: CRITICAL (Must Fix First)
1. **Implement Walk-in Customer Support**:
   - Provide a 1-click **"Walk-in / Cash Customer"** button that assigns a canonical system guest customer record (`walkin@ayaanclothing.com` / `Walk-in Customer`).
   - Add a quick inline customer registration modal (Name, Phone, Email) directly inside the customer search card without leaving the POS page.
2. **Fix Cash Tendered & Change Calculation**:
   - Allow entering tender amounts greater than grand total.
   - Dynamically compute and display **`Change Return: $XX.XX`** in high-contrast green text.
   - Record `paid_amount = total_amount` in backend and log `tendered_amount` and `change_given` in payment notes.
3. **Ergonomic Cashier Layout Redesign**:
   - Convert POS to a modern, high-velocity 2-column layout:
     - **Left Column (60% width)**: Category filter bar, search input, and responsive product catalog grid.
     - **Right Column (40% width)**: Sticky, unified Cart & Checkout panel (Customer selector at top, active cart line items in middle, totals and payment settlement at bottom). All controls visible without scrolling.

### Priority: HIGH
4. **Barcode Scanner 1-Scan Auto-Add**:
   - Implement `onKeyDown` listener on product search input for `Enter`.
   - If search query matches an exact product SKU or variant barcode, immediately add 1 unit (or 1 MOQ unit) to cart and reset the search input.
5. **Printable 80mm/58mm Thermal Receipt**:
   - Add a dedicated `<ThermalReceipt>` component triggered via browser `window.print()`.
   - Format with Ayaan Clothing store header, tax receipt number, line item breakdown, tendered amount, change given, and return policy.
6. **Cart Persistence (LocalStorage)**:
   - Synchronize active cart and customer selection to browser `localStorage`. Prevent accidental loss on page refresh.

### Priority: MEDIUM
7. **Split Multi-Tender Payments**:
   - Support adding multiple payment rows (e.g. Line 1: $100 Cash, Line 2: $150 Card) totaling the grand total.
8. **Park / Hold Cart Queue**:
   - Add "Park Cart" button to save current transaction to a local queue and "Resume Cart" to recall it.
9. **In-Store Handover Fulfillment Flag**:
   - Provide a checkbox: `[x] Goods handed over to customer immediately`. When checked, sets `fulfillment_status = 'delivered'` and `status = 'completed'` upon creation.
10. **POS Filter in Admin Orders**:
    - Add `order_source` filter tab (`All Sources`, `Storefront`, `POS Counter`, `RFQ Quotations`) in `/ayc/orders`.

### Priority: LOW
11. **Currency Toggle (USD / BDT)**:
    - Add exchange rate converter for local showroom cash handling in Bangladeshi Taka.
12. **Quick Cashier PIN Lock**:
    - Add quick screen lock requiring operator 4-digit PIN for multi-user counter shifts.

---

## 8. Recommended Implementation Plan for Phases 2 & 3

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Cashier Velocity, Ergonomics & Commercial Usability                          │
│                                                                                        │
│ 1. Ergonomic Layout Restructuring:                                                     │
│    • Unify Cart Lines and Financial Settlement into dedicated right column (40%).      │
│    • Dedicate left column (60%) to category filters and responsive product grid.       │
│                                                                                        │
│ 2. Walk-in Customer & Fast Customer Creation:                                          │
│    • Seed/provision default "Walk-in Counter Customer" record.                         │
│    • Add 1-click "Walk-in Customer" button + quick inline registration modal.          │
│                                                                                        │
│ 3. Cash Tendered & Change Return Engine:                                               │
│    • Update frontend & backend to accept tendered_amount >= total_amount.              │
│    • Add real-time "Change Return" calculator display.                                 │
│                                                                                        │
│ 4. Barcode Scanner Support:                                                            │
│    • Add Enter key listener and exact-match auto-add to cart.                          │
│                                                                                        │
│ 5. Thermal Receipt Printing:                                                           │
│    • Add 80mm/58mm thermal receipt layout with 1-click browser printing.               │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Advanced Retail Controls, Split Payments & Multi-Channel Sync                 │
│                                                                                        │
│ 1. Multi-Tender Split Payments:                                                        │
│    • Support multi-row payments (Cash + Card) in frontend and backend.                 │
│                                                                                        │
│ 2. Cart Parking / Suspended Sales:                                                     │
│    • Add Hold/Resume cart drawer in POS header.                                        │
│                                                                                        │
│ 3. Counter Handover State:                                                             │
│    • Allow marking POS orders as delivered/completed directly at sale.                 │
│                                                                                        │
│ 4. Admin Orders Integration:                                                           │
│    • Add POS source filter tab in /ayc/orders toolbar.                                 │
│                                                                                        │
│ 5. Cash Drawer & Shift Balancing:                                                      │
│    • Introduce shift opening float and end-of-day Z-Report reconciliation.             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Tests Already Present and Tests Needed

### 9.1 Tests Already Present (60 PHPUnit Backend Tests — All Passing)
1. `AdminPosSaleWorkflowTest.php` (20 tests):
   - Permissions: Super admin access, unauthorized admin 403, customer access 403.
   - Lookups: Customer search, product search, warehouse catalog.
   - Line items: Variantless, discrete variants, multi-product order.
   - Validation: MOQ enforcement, stock shortfall rejection, concurrent stock reduction rollback.
   - Execution: Real order creation, inventory decrements, inventory adjustment ledger, operator attribution, idempotency caching, failed transaction rollback.
2. `AdminPosPhase2WorkflowTest.php` (22 tests):
   - Coupons: Percentage discount, flat discount, min spend gate, expiry gate, usage limit gate.
   - Manual Discounts: Percentage override, flat override, mandatory reason, permission gate (`pos.discount`), subtotal cap.
   - Payments: Cash, card, bank, mobile banking, partial payment balance due, over-tender rejection.
3. `AdminPosPhase3DocumentWorkflowTest.php` (18 tests):
   - Document generation: Sales invoice, proforma invoice, commercial invoice.
   - PDF streaming: Direct binary `/pdf` streaming.
   - Privacy: Internal discount reason and operator notes masking for customer view.

### 9.2 Tests Needed for Phase 2 & 3
1. **Frontend Automated POS Component Tests (`tests/ayc-admin-pos-terminal.test.ts`)**:
   - Test walk-in customer selection defaults.
   - Test product search and variant pill selection.
   - Test cart line item addition, quantity stepper, and line total math.
   - Test tender amount input and change return calculation.
   - Test barcode scan `Enter` key auto-add behavior.
   - Test thermal receipt component rendering and print trigger.
2. **Backend Feature Tests (`tests/Feature/Admin/AdminPosWalkinAndTenderTest.php`)**:
   - Test walk-in customer checkout without pre-existing customer record.
   - Test over-tendered cash payment recording change return without throwing 422 error.
   - Test multi-tender split payment execution (e.g. $100 cash + $50 card creating two `Payment` records).
   - Test immediate in-store delivery status transition.

---

## Summary of the Five Most Important POS Issues

| Rank | Issue | Root Cause | Impact | Recommended Solution |
|:---:|:---|:---|:---|:---|
| **1** | **No Walk-in / Guest Customer Support** | Backend strictly requires existing `User` where `role = 'customer'`; frontend has no walk-in fallback. | Completely blocks counter sales to unregistered visitors; cashier must leave POS screen to register user. | Add canonical "Walk-in Customer" fallback button + inline fast customer creation modal. |
| **2** | **Over-Tender Payment Rejection (No Change Return)** | Backend rejects `paid_amount > total_amount` with 422 validation error; frontend lacks change calculator. | Cashier cannot input customer's cash bill ($100 for $85 total) without causing a crash. | Support `tendered_amount >= total`, calculate change return, and record `paid_amount = total`. |
| **3** | **Ergonomic Split Column Layout** | Cart line items table is placed below catalog on the left; totals and payment inputs are on the right. | Adding items pushes cart off-screen; forces excessive vertical scrolling on laptops/tablets. | Redesign into 60/40 layout: Left = Catalog & Filters; Right = Sticky Cart, Totals & Payment. |
| **4** | **No Barcode Scanner Auto-Add** | Search input lacks `Enter` key listener; requires manual card clicking and "Add" button clicking. | Slows checkout down to 15–30 seconds per item instead of 1 second per barcode scan. | Add `Enter` key event listener; exact SKU match automatically increments or adds item to cart. |
| **5** | **No Thermal Receipt (A4 Invoice Only)** | Success modal links only to international freight A4 commercial document; no 80mm/58mm template. | Counter receipt printers cannot print standard compact receipts for walk-in buyers. | Implement compact `<ThermalReceipt>` modal with automatic `window.print()` support. |
