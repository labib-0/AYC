# AYAAN CLOTHING — ORDER & PAYMENT FLOW AUDIT & REMEDIATION REPORT
## Canonical Customer Order Lifecycle Alignment

**Authoritative Reference:** `ORDER_FLOW_AUDIT_AND_REMEDIATION_REPORT.md`  
**Execution Timestamp:** 2026-10-08T18:58:00+06:00  
**Commit Reference:** `feat(order): enforce canonical payment approval and shipment flow`  

---

## 1. Executive Summary & Core Mandate

### CANONICAL CUSTOMER FLOW:
```
ORDER PLACED
     ↓
PAYMENT PENDING
     ↓
WAITING FOR APPROVAL
     ↓
ORDER CONFIRMED
     ↓
ON SHIPMENT
```

### INVENTORY DECREMENT RULE:
> **BUSINESS-CRITICAL:** Physical inventory decrement occurs **STRICTLY AND ONLY AFTER ADMIN PAYMENT APPROVAL** (or instant capture for paid card checkout / approved trade credit terms).  
> At `ORDER PLACED`, `PAYMENT PENDING`, and `WAITING FOR APPROVAL`, physical warehouse inventory remains **completely unchanged**.  
> Repeated Admin approval or duplicate requests are **strictly idempotent** (zero duplicate deductions).

---

## 2. Discovered Flow Mismatches (Audit Findings)

Prior to this remediation, an audit of the customer checkout, order creation, payment review, and shipment flow revealed the following architectural defects:

1. **Premature Stock Deduction at Order Placement:**
   - In `backend/app/Http/Controllers/Api/V1/OrderController.php`, line 705 originally deducted variant and warehouse inventory immediately upon unpaid order creation (`bank_transfer`, `wire`, `cod`), violating the core business rule.
   - *Remediation:* Removed premature stock deduction. Injected atomic idempotent `decrementInventory()` method invoked strictly during Admin payment approval (`reviewPaymentProof`) or instant paid checkout.

2. **UI Exposure of Intermediate/Internal Backend Statuses:**
   - The Customer Portal order list (`src/app/dashboard/orders/page.tsx`) and Dashboard Recent Orders displayed up to three separate, conflicting status badges simultaneously (`Payment: ...`, `Fulfillment: unfulfilled`, `Status: processing`/`pending`).
   - The Order Detail page presented a legacy 4-step progress bar (`Placed -> Processing -> Shipped -> Delivered`), omitting manual payment verification stages.
   - *Remediation:* Standardized the customer portal to present **exactly one canonical customer-facing status badge** and aligned the Order Detail progress bar to the 5-stage canonical timeline.

3. **Premature Confirmation Messaging in Checkout Modal:**
   - `src/components/cart/CheckoutModal.tsx` rendered "Order Confirmed!" immediately upon completing unpaid export checkout.
   - *Remediation:* Updated checkout completion dialog to display **"Order Placed"** with a **"PAYMENT PENDING"** status badge, accompanied by clear wire transfer instructions and a direct CTA to "View Order & Submit Payment".

4. **Missing Authoritative Customer Status in API Contract:**
   - `OrderResource.php` lacked an explicit `customer_status` attribute, forcing client interfaces to make fragile heuristic inferences across multiple columns (`status`, `payment_status`, `fulfillment_status`).
   - *Remediation:* Added authoritative `customer_status` attribute to `Order.php` model and exposed `'customer_status' => $this->customer_status` in `OrderResource.php`.

5. **Package Breakdown Variant Key Resolution in Inventory Decrement:**
   - `decrementInventory()` initially looked only for `variant_id` in package allocation breakdowns, whereas `Product::getPackageBreakdownForQuantity()` keys entries by `product_variant_id`.
   - *Remediation:* Resolved with `$entry['product_variant_id'] ?? $entry['variant_id'] ?? null` and added support for zero-variant products directly at the product inventory level.

---

## 3. Internal State → Canonical Customer Status Mapping

To preserve backward compatibility with all historical database records and avoid destructive enum changes, the authoritative mapping rules are defined as follows:

| Internal / Historical State | Authoritative Customer Status | Customer UI Label | Description Presented to Customer |
| :--- | :--- | :--- | :--- |
| `fulfillment_status` in `['shipped', 'delivered', 'fulfilled', 'partially_shipped']`<br>OR `status` in `['shipped', 'delivered', 'completed', 'partially_shipped', 'on_shipment']`<br>OR `tracking_number` + `carrier_status` | `ON_SHIPMENT` | **On Shipment** | Order is dispatched and in transit with international export carrier. |
| `payment_status === 'paid'`<br>OR `payment_confirmed_at !== null`<br>OR `status` in `['confirmed', 'in_production', 'ready_to_ship', 'order_confirmed']`<br>OR (`status === 'processing'` && `payment_status === 'paid'`) | `ORDER_CONFIRMED` | **Order Confirmed** | Payment approved. Order confirmed for export production and packing. |
| `payment_status === 'payment_submitted'`<br>OR (`payment_proof_url` present && `payment_status` not in `['paid', 'failed']`) | `WAITING_FOR_APPROVAL` | **Waiting for Approval** | "Payment submitted. We are waiting for payment approval." |
| `status` in `['order_placed', 'placed']` | `ORDER_PLACED` | **Order Placed** | Order recorded successfully. Awaiting payment instructions. |
| `payment_status === 'pending'`<br>OR `payment_status === 'failed'`<br>OR unpaid newly placed order | `PAYMENT_PENDING` | **Payment Pending** | Awaiting manual bank wire transfer submission or revised proof of payment. |

---

## 4. Payment Flow & Approval Workflow

```
Customer Places Order
        │
        ▼
Status: ORDER PLACED (Inventory Unchanged)
        │
        ▼
Status: PAYMENT PENDING (Bank Wire Details Rendered)
        │
        ▼
Customer Uploads Payment Receipt (SLIP / PDF / TXN ID)
        │
        ▼
Status: WAITING FOR APPROVAL (Inventory Still Unchanged)
        │
        ▼
Admin Review in AYC Portal (`/api/v1/admin/orders/{id}/review-payment-proof`)
   ├── REJECT: Order remains PAYMENT_PENDING with error notice; customer can re-upload.
   └── APPROVE:
         │
         ├── DB::transaction with pessimistic lock (`lockForUpdate()`)
         ├── $order->decrementInventory() executes
         ├── Payment updated to 'paid', payment_confirmed_at recorded
         ├── Order status event logged: 'payment_approved_confirmed'
         └── Order status transitions to ORDER_CONFIRMED
```

### Idempotency & Concurrency Safety
- `Order::decrementInventory()` checks `$details['inventory_decremented']`.
- If already decremented, the method safely returns `false` (no-op).
- If stock is insufficient when Admin clicks Approve, a `RuntimeException` is caught, transaction rolls back, and API returns HTTP `422 Unprocessable Entity` ("Cannot approve payment: Insufficient inventory...").
- Neither payment nor order confirmation will partially succeed if inventory cannot be safely deducted.

---

## 5. Document Gating Verification

Document gating rules remain strictly enforced:
- **Proforma Invoice (PI):** Available immediately upon order placement (`ORDER_PLACED`, `PAYMENT_PENDING`).
- **Product Offer Sheets & Packing Lists:** Available for export review.
- **Commercial Invoice (CI):** Strictly gated behind `payment_status === 'paid'` or `customer_status === 'ORDER_CONFIRMED'`. Customers cannot download or access Commercial Invoices prior to Admin payment approval.

---

## 6. Frontend UI Remediation

1. **`src/lib/order-status.ts`:**
   - Defined `CanonicalCustomerStatus`: `"ORDER_PLACED" | "PAYMENT_PENDING" | "WAITING_FOR_APPROVAL" | "ORDER_CONFIRMED" | "ON_SHIPMENT"`.
   - Exported authoritative `getCanonicalCustomerStatus(order)` and `getCanonicalStepIndex(status)`.
   - Provided `CANONICAL_TIMELINE_STAGES` (5 stages) with curated colors, icons, and descriptions.

2. **`src/app/dashboard/orders/page.tsx`:**
   - Replaced internal filter tabs with the canonical 5 tabs:
     - All Orders
     - Order Placed
     - Payment Pending
     - Waiting for Approval
     - Order Confirmed
     - On Shipment
   - Unified both desktop table and mobile card layout to display **exactly one canonical customer-facing status badge** per order.

3. **`src/app/dashboard/orders/[id]/page.tsx`:**
   - Replaced legacy 4-step stepper with the 5-stage Canonical Order Lifecycle grid (`grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3`).
   - Clear visual progression: completed stages (emerald check), current stage (amber ring/pulse), future stages (muted dashed border).
   - Displayed required notification for `WAITING_FOR_APPROVAL`: *"Payment submitted. We are waiting for payment approval."*
   - Displayed rejection advisory when payment proof was rejected while keeping primary status as `PAYMENT_PENDING`.

4. **`src/components/cart/CheckoutModal.tsx`:**
   - Updated success modal title to **"Order Placed"** with **"PAYMENT PENDING"** badge.
   - Clarified instructions and updated button to **"View Order & Submit Payment"**.

5. **`src/components/dashboard/DashboardRecentOrders.tsx` & `src/components/account/RecentOrdersCard.tsx`:**
   - Removed duplicate payment/fulfillment badge columns; display only the single canonical status badge.

---

## 7. Test Results Summary

### Backend Test Suites (PHPUnit)
1. **Canonical Customer Order Lifecycle Suite:**
   - File: `backend/tests/Feature/Order/CanonicalCustomerOrderLifecycleTest.php`
   - Total Tests: **13 / 13 passed** (58 assertions)
   - Verifications:
     - Order creation -> `ORDER_PLACED`
     - Unpaid order -> `PAYMENT_PENDING`
     - Receipt upload -> `WAITING_FOR_APPROVAL`
     - Stock unchanged prior to Admin approval
     - Admin approval -> `ORDER_CONFIRMED`
     - Admin approval decrements stock atomically
     - Double-approval idempotency (stock decremented exactly once)
     - Insufficient stock rolls back approval atomically
     - Shipment transition -> `ON_SHIPMENT`
     - Document gating (CI blocked before approval, unlocked after)
     - Customer data isolation & ownership security

2. **Order Feature Regression Suite:**
   - Command: `php artisan test tests/Feature/Order`
   - Result: **64 / 64 passed** (402 assertions)

3. **Catalog & Admin Order Suites:**
   - Result: **50 / 50 passed** (`CouponSalesReportTest`, `FacebookVideoAndFullStockNonMoqCartTest`, `MinimalProductVariantTest`)

### Frontend Test Suites (Node / Vitest)
1. **Frontend Canonical Order Lifecycle Suite:**
   - File: `tests/canonical-customer-order-lifecycle.test.ts`
   - Result: **9 / 9 passed**
2. **Storefront Regression Runner:**
   - Command: `npm run test:storefront`
   - Result: **PASS (42/42 passed)**
3. **TypeScript Compilation:**
   - Command: `npx tsc --noEmit`
   - Result: **0 errors**
4. **Production ESLint:**
   - Command: `npx eslint src`
   - Result: **0 errors**
5. **Production Next.js Build:**
   - Command: `npm run build`
   - Result: **57/57 routes compiled successfully (Turbopack)**
6. **Master Release Gate:**
   - Command: `npm run release:gate`
   - Result: **APPROVED — READY FOR DEPLOYMENT**

---

## 8. Deployment Plan

- Commit Message: `feat(order): enforce canonical payment approval and shipment flow`
- Dual Remote Push:
  - `git push labib main`
  - `git push origin main`
- VPS Server Deployment (`root@200.97.169.230`):
  - Pull main commit on `/var/www/ayaan`
  - Run non-destructive production build (`npm run build`)
  - Reload application services (`ayaan-customer`)
  - Zero DB wipe, zero destructive commands executed.
