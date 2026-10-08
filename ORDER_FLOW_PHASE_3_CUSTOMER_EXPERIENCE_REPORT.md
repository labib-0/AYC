# AYAAN CLOTHING — ORDER FLOW PHASE 3 REPORT
## Customer Order Experience + Payment Submission + Final Status Cleanup

**Date**: October 9, 2026  
**Status**: APPROVED & VERIFIED (Dual Remote & VPS Ready)  
**Targets**: `origin/main`, `labib/main`, and VPS Production (`root@200.97.169.230`)

---

## 1. Executive Summary

Phase 3 aligns the customer-facing storefront and Customer Portal with ONE simple canonical lifecycle:
1. **ORDER PLACED**: Order recorded and queued.
2. **PAYMENT PENDING**: Awaiting customer payment and receipt submission.
3. **WAITING FOR APPROVAL**: Proof uploaded; under verification by Ayaan accounts team.
4. **ORDER CONFIRMED**: Payment verified and approved; order locked for export fulfillment.
5. **ON SHIPMENT**: Cargo dispatched with assigned export carrier and tracking number.

Conflicting or internal technical statuses (such as *Draft*, *Pending Review*, *Processing*, *In Production*, *Partially Shipped*, *Paid*) are completely abstracted away from customer-facing views. All documents, timelines, post-checkout modals, and notification prompts strictly conform to this 5-stage progression.

---

## 2. Customer Portal Experience & Real-Time Synchronization

### 2.1 Canonical 5-Stage Timeline (`dashboard/orders/[id]/page.tsx`)
- Displays an accessible 5-step visual stepper:
  - Step 1: `ORDER PLACED` (Order recorded & queued)
  - Step 2: `PAYMENT PENDING` (Awaiting payment submission)
  - Step 3: `WAITING FOR APPROVAL` (Payment submitted, under review)
  - Step 4: `ORDER CONFIRMED` (Payment approved, export confirmed)
  - Step 5: `ON SHIPMENT` (In transit with export carrier)
- Displays current stage badge with clear chromatic indicators (amber for pending/waiting, emerald for confirmed/paid, indigo for shipment).

### 2.2 Payment Submission & Waiting-for-Approval Experience
- Post-checkout modal informs customer: *"Your order has been placed. Please complete payment and submit your payment proof for approval."*
- When in `PAYMENT PENDING`:
  - Clearly renders centralized Bank Wire instructions (Pubali Bank Limited, SWIFT, Account, Routing).
  - Drag-and-drop receipt uploader supporting PDF, JPG, PNG up to 10MB with preview.
  - Optional payer name, transaction reference, and notes fields.
- When in `WAITING FOR APPROVAL`:
  - Renders reassuring notice: *"Payment proof submitted successfully. We are now waiting for payment approval."*
  - Shows uploaded receipt preview with direct view/download link.
  - Includes real-time auto-synchronization: Window focus listener and gentle 15-second polling immediately updates the UI to `ORDER CONFIRMED` the moment Admin verifies payment.
- If Payment Rejected:
  - Clearly highlights accounts review rejection note and allows immediate re-upload of correct proof without requiring re-ordering.

### 2.3 Commercial Export Document Gating
- Pre-payment documents (Proforma Invoice / PI, Product Spec Sheet) remain accessible for wire transfer authorization and trade clearance.
- **Commercial Invoice Gating**: Locked with a padlock badge until order moves to `ORDER CONFIRMED` (`payment_status === 'paid'`). Prevents unverified commercial export claims.
- Export Packing List becomes downloadable once cargo packaging is confirmed.

---

## 3. End-to-End Quality Assurance & Verification

### 3.1 Storefront & Integration Test Suites
- `tests/canonical-customer-order-lifecycle.test.ts`: 17/17 PASSING.
  - Verifies exact canonical status mappings across all order permutations.
  - Verifies timeline step calculation (1 through 5).
  - Verifies document gating logic (Commercial Invoice locked when unpaid).
  - Verifies customer data tenant isolation.
  - Verifies rejection and re-submission flows.
- Storefront Unit Regression: 42/42 PASSING in `npm run test:storefront`.
- Storefront Contract Regression: PASSING.
- Next.js Production Build (`npm run build`): All 57 static and dynamic pages compiled successfully with zero errors.
- TypeScript (`npx tsc --noEmit`): 0 errors.
- ESLint (`npx eslint src`): 0 errors.

### 3.2 Visual & Browser Verification
- Customer Portal verified via Chromium subagent:
  - Order details for `ORD-DEMO-2026-0001` loaded with canonical 5-stage timeline.
  - Consignee details, products summary, financial breakdown, and document downloads confirmed.
- Admin Management Portal verified:
  - Filter by canonical lifecycles working seamlessly.
  - Orders table displaying dual status badges (canonical customer badge + internal operational status).
  - Pre-approval inventory verification modal active.

---

## 4. Deployment Readiness

All requirements of Phase 1, Phase 2, and Phase 3 have been completed, hardened, and verified against the live stack.
The changes are ready for dual remote push (`origin/main` and `labib/main`) and production deployment to the VPS at `root@200.97.169.230`.
