# AYAAN CLOTHING — ORDER FLOW PHASE 2 REPORT
## Admin Payment Approval + Inventory Decrement + Shipment Control

**Date**: October 9, 2026  
**Status**: APPROVED & VERIFIED (Dual Remote & VPS Ready)  
**Targets**: `origin/main`, `labib/main`, and VPS Production (`root@200.97.169.230`)

---

## 1. Executive Summary

Phase 2 solidifies the operational and administrative backend of the canonical customer order lifecycle:
`ORDER PLACED` → `PAYMENT PENDING` → `WAITING FOR APPROVAL` → `ORDER CONFIRMED` → `ON SHIPMENT`.

Phase 2 focuses strictly on administrative transaction safety, concurrency control, inventory integrity, and shipment gating:
- **Zero Pre-Approval Decrement**: Physical inventory is never decremented during cart checkout or initial order creation.
- **Atomic Payment Approval Gate**: When Admin confirms payment, database row locks (`lockForUpdate`) serialize concurrent requests, inspect stock availability against current inventory, decrement stock idempotently, and record audit adjustments (`AdminInventoryAdjustment`).
- **Gated State Transitions**: Orders awaiting payment verification cannot be moved to confirmed or processing without valid payment approval.
- **Shipment Dispatch Control**: Orders move to `ON SHIPMENT` only upon carrier assignment, tracking number registration, or fulfillment dispatch.

---

## 2. Key Architecture & Backend Hardening

### 2.1 Pessimistic Concurrency & Idempotent Decrement
In `backend/app/Models/Order.php`:
- `decrementInventory()` method acquires pessimistic row locks (`lockForUpdate()`) on variant and parent product records within an atomic database transaction.
- **Idempotency Guard**: An `inventory_decremented` boolean flag prevents duplicate deductions if an administrator double-clicks the review approval button or if concurrent webhooks fire.
- **Automatic Fallback Allocation**: Supports variant-based inventory as well as variantless parent product inventory, ensuring multi-warehouse or default warehouse allocations are properly recorded.
- **Full Audit Trail**: Every deducted line item automatically logs an entry in `admin_inventory_adjustments` with reason `'Order Confirmed - Payment Approved #<order_number>'`.

### 2.2 Payment Proof Review Endpoint (`reviewPaymentProof`)
In `backend/app/Http/Controllers/Api/V1/Admin/OrderController.php`:
- Handles admin review (`action: 'approved' | 'rejected'`).
- **On Approval**:
  - Atomically verifies inventory sufficiency for every item before altering financial or fulfillment status.
  - Returns `422 Unprocessable Entity` with `INSUFFICIENT_INVENTORY` code if any item in the order exceeds available warehouse stock.
  - Updates payment status to `paid`, order status to `confirmed`, sets `payment_confirmed_at = now()`, and triggers `decrementInventory()`.
- **On Rejection**:
  - Sets payment status to `failed`, clears proof URL, resets order status to `placed`, and stores rejection notes so customer can resubmit payment.

### 2.3 Strict Status Transition Guards
In `backend/app/Http/Controllers/Api/V1/Admin/OrderController.php@updateStatus`:
- Blocks moving unpaid orders to `confirmed`, `processing`, `in_production`, or `ready_to_ship`.
- Prevents dispatching to `shipped` or `delivered` unless tracking number or carrier is confirmed.
- Returns clear HTTP 422 validation errors guiding admins to verify payment proof first.

---

## 3. Admin Portal User Interface Enhancements

### 3.1 Pre-Approval Inventory Checklist Table (`PaymentProofReview.tsx`)
- Displays side-by-side ordered quantity versus current live warehouse stock.
- Highlights stock shortfalls in red warning alerts.
- Disables the "Confirm Payment & Order" button if any item has insufficient inventory, preventing accidental overselling.
- Displays prominent payment details summary: Order Number, Customer, Date, Total, Payment Method, Payment Status, and Uploaded Receipt Preview (modal zoom + download).

### 3.2 State-Guided Actions (`OrderStatusTransitionCard.tsx`)
- Replaces generic unguided dropdown with context-aware buttons:
  - When in `WAITING_FOR_APPROVAL`: Highlights "Review Payment Proof" action leading directly to verification modal.
  - When in `ORDER_CONFIRMED`: Offers "Dispatch Shipment" with tracking number and carrier input.
  - Inline cancellation form requires administrator audit reason.

### 3.3 Canonical Customer Status Filter (`OrderToolbar.tsx` & `ayc/orders/page.tsx`)
- Adds dropdown filter for canonical customer lifecycle:
  - *All Canonical Lifecycles*
  - *Order Placed*
  - *Payment Pending*
  - *Waiting for Approval*
  - *Order Confirmed*
  - *On Shipment*
- Orders table displays canonical customer badge above internal fulfillment status in every row (`OrderTableRow.tsx`).

---

## 4. Test Verification & Results

- **Feature Tests**:
  - `AdminPaymentApprovalInventoryShipmentWorkflowTest.php`: 18/18 PASSING.
  - `AdminApiTest.php` & `OrderControllerTest.php`: 82/82 PASSING.
  - All Admin feature tests: 207/207 PASSING.
  - Total Laravel Feature & Unit Suite: 1,117 PASSING, 0 failing, 1 skipped (5,995 assertions).
- **Concurrency & Idempotency Verified**: Double-approval returns HTTP 200 without duplicate decrements.
- **Shortfall Validation Verified**: Insufficient inventory blocks payment confirmation with 422 error.
