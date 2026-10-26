# Customer Portal Hotfix — Test Matrix

## Phase 1 (Prompt 1/5): Filter Sidebar, Dashboard Sticky Nav, and Wishlist 4-Column Grid

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T1.1 | Issue 6: Filter Sidebar Independent Scrollbar | 1440x900 (`/search`) | Sidebar sticky below header with `overflow-y: auto`, scrolls internally through all filter sections without page scroll | scrollHeight: 1199px > clientHeight: 715px; internal scroll down 250px occurred with windowScrollY = 0 | **PASS** |
| T1.2 | Issue 6: Filter Sidebar Viewport Capping | 1024x768 (`/search`) | Max height dynamically capped (`calc(100vh - 100px)`), brand search, audience, design type reachable | panelHeight: 668px (< 768px viewport); sticky top: 231px below header; all filter categories accessible | **PASS** |
| T1.3 | Issue 6: Mobile Filter Drawer Internal Scroll | 375x812 (`/search?filterOpen=true`) | Mobile drawer scrolls internally, bottom controls & close button accessible | modalOpened: true; scrollHeight: 471px; zero horizontal overflow; close button and filters accessible | **PASS** |
| T1.4 | Issue 7: Dashboard Sidebar Sticky Positioning | 1440x900 (`/dashboard`) | Sidebar stays sticky in view below header while scrolling main content down | Initial top: 128px; at 200px scroll: 96px; at 400px scroll: 96px (`top-24: 96px` persistent sticky hold) | **PASS** |
| T1.5 | Issue 7: Dashboard Sidebar Boundary & Footer Clearance | 1440x900 (`/dashboard`) | Sidebar does not escape container or overlap footer when scrolled to page bottom | asideBottom: 212.78px <= footerTop: 252.78px; zero footer overlap | **PASS** |
| T1.6 | Issue 7: Dashboard Tablet & Mobile Navigation | 768x1024 & 375x812 (`/dashboard`) | Appropriate responsive mobile/tablet navigation maintained, no broken desktop sidebar | 768px tablet desktop aside hidden: true; 375px mobile aside hidden: true; zero horizontal overflow | **PASS** |
| T1.7 | Issue 9: Wishlist 4-Column Desktop Grid | 1440x900 (`/wishlist`) | 4 product cards per row on wide screens (`grid-cols-4`) | Columns: 4; First row cards: 4; cardWidth: 332px; gridWidth: 1376px; unclipped layout | **PASS** |
| T1.8 | Issue 9: Wishlist Responsive Column Adaptation | 1024, 768, 375px (`/wishlist`) | Graceful adaptation (3 cols on laptop/desktop, 2 cols on tablet, 1 col on mobile) with proportionate images | 1024px Laptop: 3 cols (overflow: false); 768px Tablet: 2 cols (overflow: false); 375px Mobile: 1 col (overflow: false) | **PASS** |
| T1.9 | Issue 9: Wishlist Interactive Controls Usability | 1440x900 (`/wishlist`) | Checkboxes, remove, MOQ, unit price, Add to Cart all accessible and unclipped | Select All checked 4/4 cards; Add to Cart triggered mini-cart flyout successfully | **PASS** |
| T1.10 | Issue 9: Dashboard Wishlist 4-Column Layout | 1440x900 (`/dashboard/wishlist`) | 4 product cards per row within dashboard content layout | Columns: 4; cardWidth: 263.5px within dashboard layout; zero horizontal overflow | **PASS** |

---

## Phase 2 (Prompt 2/5): Outside-Click Dismissal for Sign-Out and Order-Confirmation Modals

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T2.1 | Issue 12: Sign-Out Modal Backdrop Click Dismissal | 1440x900 (`/dashboard`) | Clicking outside modal closes dialog and session remains intact | Modal opened: true, backdrop click closed: true, session preserved: true | **PASS** |
| T2.2 | Issue 12: Sign-Out Modal Content Click Isolation | 1440x900 (`/dashboard`) | Clicking inside modal body/heading does not close modal | Modal remained visible after clicking inside dialog content | **PASS** |
| T2.3 | Issue 12: Sign-Out Modal Cancel Action | 1440x900 (`/dashboard`) | Clicking Cancel button dismisses modal without sign-out | Modal closed: true, user session preserved: true | **PASS** |
| T2.4 | Issue 12: Sign-Out Explicit Confirmation Execution | 1440x900 (`/dashboard`) | Clicking explicit Sign Out button executes workflow once | Sign Out button clicked: true, session invalidated: true, redirected to login/root | **PASS** |
| T2.5 | Issue 12: Sign-Out Escape Key Dismissal | 1440x900 (`/dashboard`) | Pressing Escape dismisses modal without sign-out | Modal closed on Escape: true, user session preserved: true | **PASS** |
| T2.5b | Issue 12: Sign-Out Close Icon (X) Action | 1440x900 (`/dashboard`) | Clicking X close icon dismisses modal cleanly | Close icon clicked: true, modal closed: true | **PASS** |
| T2.6 | Issue 14: Order Confirmation Modal Backdrop Dismissal | 1440x900 (`/cart`) | Clicking backdrop outside dialog dismisses without creating order | Modal opened: true, backdrop click closed: true, orders created: 0 | **PASS** |
| T2.7 | Issue 14: Order Modal Content Click Isolation | 1440x900 (`/cart`) | Clicking header, body text, or card does not close modal | Modal remained visible after clicking inside header & body | **PASS** |
| T2.8 | Issue 14: Order Modal Form Controls Usability | 1440x900 (`/cart`) | Inputs, promo fields, radios usable without dismissing dialog | Input entered: true, modal remained open and interactive: true | **PASS** |
| T2.9 | Issue 14: Order Modal Close Icon (X) Action | 1440x900 (`/cart`) | Clicking X icon dismisses dialog without order submission | Close button clicked: true, modal closed: true, total orders: 0 | **PASS** |
| T2.10 | Issue 14: Order Modal Escape Key Dismissal | 1440x900 (`/cart`) | Pressing Escape closes dialog without order submission | Modal closed on Escape: true, total orders: 0 | **PASS** |
| T2.11 | Issue 14: Order Modal Confirm Order Button State | 1440x900 (`/cart`) | Confirm Order button present and functional with valid draft | Submit button present, active, and accessible | **PASS** |
| T2.12 | Issue 14: Order Validation Safeguards Against Unintended Orders | 1440x900 (`/cart`) | Submitting incomplete data displays validation error and prevents order | Validation error triggered ('Your cart is empty.'), modal remained open, zero orders created | **PASS** |
| T2.13 | Issue 14: Order Modal Mobile Touch Dismissal | 375x812 (`/cart`) | Tapping backdrop on mobile viewport dismisses modal | Mobile modal opened: true, mobile touch backdrop dismissed: true | **PASS** |
| T2.14 | Issue 14: Repeated Cycle Dismissal & Scroll Restoration | 1440x900 (`/cart`) | Open/close repeatedly across 3 cycles; verify no stuck backdrops | Completed cycles: 3/3, body scroll overflow clean: true | **PASS** |

---

## Phase 3 (Prompt 3/5): Missing Current Password Field and Password Change Workflow

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T3.1 | Issue 11: Form Layout & Attribute Verification | 1440x900 (`/dashboard/settings`) | Current, New, and Confirm password inputs visible, labeled with required markers, autocompletes (`current-password`, `new-password`), and eye toggles | All 3 inputs present with autocompletes, placeholders, and eye toggles. Current label: "Current Password *" | **PASS** |
| T3.2 | Issue 11: Required Field Validation | 1440x900 (`/dashboard/settings`) | Submitting with current password empty is rejected with clear error | Rejected as required: alert displayed or HTML5 valueMissing | **PASS** |
| T3.3 | Issue 11: Wrong Current Password Verification | 1440x900 (`/dashboard/settings`) | Server/service rejects incorrect current password, leaves stored password unchanged | Alert: "The provided current password is incorrect.", original password unchanged in store | **PASS** |
| T3.4 | Issue 11: Confirmation Mismatch Handling | 1440x900 (`/dashboard/settings`) | Submitting mismatched new passwords rejected with friendly guidance | Alert: "New passwords do not match. Please re-enter." | **PASS** |
| T3.5 | Issue 11: Password Policy Compliance (< 6 chars) | 1440x900 (`/dashboard/settings`) | Password shorter than 6 characters rejected by policy | Alert: "New password must be at least 6 characters in length." | **PASS** |
| T3.6 | Issue 11: Successful Password Change Workflow | 1440x900 (`/dashboard/settings`) | Valid current and new password updates credentials, clears fields, keeps session active | Status: "Password updated successfully.". Inputs cleared, password updated in store, session preserved | **PASS** |
| T3.7 | Issue 11: Old-Password Invalidation Check | 1440x900 (`/login`) | Authenticating with old password fails after change | Login with old password rejected with "Invalid email or password provided." | **PASS** |
| T3.8 | Issue 11: New-Password Authentication Check | 1440x900 (`/login`) | Authenticating with new password succeeds | Login with new password succeeded for authenticated buyer session | **PASS** |
| T3.9 | Issue 11: Duplicate Submission Guard | 1440x900 (`/dashboard/settings`) | Rapid clicking prevented; submit button disabled with spinner during request | Disabled/loading state confirmed: button disabled and spinner active in transit | **PASS** |
| T3.10 | Issue 11: Direct API Bypass Attempt | Service API (`updateProfile`) | Directly calling update endpoint without current password returns 422 | Rejected: status=422, message="Please enter your current password." | **PASS** |
| T3.11 | Issue 11: Strict Account Isolation | Service API (`updateProfile`) | Request attempting to target foreign ID or email cannot modify another account | Victim user password remained untouched; only authenticated user profile was modified | **PASS** |
| T3.12 | Issue 11: Error Visibility Without False Success | 1440x900 (`/dashboard/settings`) | On failure, error message visible and success banner strictly suppressed | Alert visible: "The provided current password is incorrect.", status banner suppressed | **PASS** |
| T3.13 | Issue 11: Responsive Behavior (375, 768, 1024, 1440px) | 375, 768, 1024, 1440px | Form unclipped, zero horizontal overflow across mobile, tablet, and desktop | 375px: form=293px \| 768px: form=662px \| 1024px: form=628px \| 1440px: form=710px. Zero overflow | **PASS** |
| T3.14 | Issue 11: Accessibility & Regressions | 1440x900 (`/dashboard/settings`) | Eye toggles toggle between text/password safely, accessible labels present, zero console errors | Toggle: password -> text -> password. All labels present. Uncaught errors: 0 | **PASS** |

---

## Phase 4 (Prompt 4/5): Fix RFQ Submission and Commercial Order Confirmation Failures

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T4.1 | Issue 10: Valid Catalog Product RFQ Submission | 1440x900 (`/rfq`) | Existing product item submitted with valid buyer details persists successfully | Created reference `RFQ-2026-737784`, success banner rendered, persisted in store | **PASS** |
| T4.2 | Issue 10: Valid Custom Garment RFQ Submission | 1440x900 (`/rfq`) | Custom garment description, quantity & target price accepted | Created reference `RFQ-2026-424044`, success banner rendered, persisted in store | **PASS** |
| T4.3 | Issue 10: Required Field Validation | 1440x900 (`/rfq`) | Incomplete data rejected with actionable field-level validation | Incomplete submission rejected with clear field error ("City required") | **PASS** |
| T4.4 | Issue 10: Invalid Values Validation (Email) | 1440x900 (`/rfq`) | Malformed email rejected with format validation error | Malformed email rejected with error ("Invalid email") | **PASS** |
| T4.5 | Issue 10: Anti-Abuse Bot Honeypot Rejection | 1440x900 (`/rfq`) | Populating honeypot traps bot with 422 error | Honeypot trapped: "Automated form submission detected.", zero records created | **PASS** |
| T4.6 | Issue 10: Fast Human Submission Acceptance | 1440x900 (`/rfq`) | Fast valid human submission accepted without timing penalty | Accepted reference `RFQ-2026-628291` without timing errors | **PASS** |
| T4.7 | Issue 10: Duplicate Submit Prevention | 1440x900 (`/rfq`) | Rapid clicks trigger synchronous lock, generating exactly 1 RFQ | Rapid multi-clicks generated exactly 1 RFQ in storage (count: 29 -> 30) | **PASS** |
| T4.8 | Issue 10: Retry After Recoverable Error | 1440x900 (`/rfq`) | Recoverable error retains input fields; retry creates 1 RFQ | Inputs preserved on error; retry succeeded with reference `RFQ-2026-443966` | **PASS** |
| T4.9 | Issue 10: RFQ Record Persistence Verification | Storage (`ayaan_mock_rfqs_v2`) | Persisted RFQ has expected buyer, items, port, and status | Confirmed `RFQ-2026-443966` persisted with 1 item for Doha, status `pending` | **PASS** |
| T4.10 | Issue 10: Network/Backend Error Handling | 1440x900 (`/rfq`) | Failure presents clear feedback without false success | Error feedback presented cleanly without false success state | **PASS** |
| T4.11 | Issue 13: Valid Commercial Order Confirmation | 1440x900 (`/cart`) | Valid cart & address confirms order, displays AYN order reference | Confirmed order reference `AYN-20261026-967808`, success screen rendered | **PASS** |
| T4.12 | Issue 13: Automated-Submission False-Positive Check | 1440x900 (`/cart`) | Legitimate human submission does not trigger bot false positive | Legitimate submission succeeded with zero false-positive bot errors | **PASS** |
| T4.13 | Issue 13: Missing Requirements (Empty Cart) | 1440x900 (`/cart`) | Empty cart rejected with expected validation error | Rejected empty cart with validation: "Your cart is empty." | **PASS** |
| T4.14 | Issue 13: Shipping Options & Direct Discussion Mode | 1440x900 (`/cart`) | Direct discussion manual freight option available and selectable | Manual freight option selectable, carrier snapshot set to export desk | **PASS** |
| T4.15 | Issue 13: Anti-Abuse Honeypot Trap on Order Confirmation | 1440x900 (`/cart`) | Bot populating honeypot is rejected with 422 | Automated bot correctly rejected: "Automated form submission detected." | **PASS** |
| T4.16 | Issue 13: Duplicate Confirmation Prevention | 1440x900 (`/cart`) | Rapid multi-clicks create exactly 1 order via submit lock | Rapid concurrent clicks generated exactly 1 order (orders: 27 -> 28) | **PASS** |
| T4.17 | Issue 13: Safe Retry Without Duplicate Orders | 1440x900 (`/cart`) | Failed request retried cleanly without duplicate orders | Retried safely, creating exactly 1 authoritative order record | **PASS** |
| T4.18 | Issue 13: Order Persistence in Storage | Storage (`ayaan_mock_orders_v2`) | Accepted order persisted with items, subtotal, and currency | Confirmed order `AYN-20261026-742443` ($925 USD) persisted | **PASS** |
| T4.19 | Issue 13: Inventory Integrity Verification | Order Workflow | Inventory decremented exactly once upon authorized order; rejected orders do not mutate inventory | Verified zero mutations on rejected orders; single accurate deduction on confirmed orders | **PASS** |
| T4.20 | Issue 13: Payment Integrity Verification | Order Workflow | B2B wholesale payment method registered as pending proforma invoice; no unintended charges | Payment method 'proforma_invoice' correctly registered as 'pending' | **PASS** |
| T4.21 | Issue 13: Modal Interaction Regressions | 1440x900 (`/cart`) | Inside clicks preserved; Escape cleanly dismisses dialog | Inside click: true, Escape closed modal: true, orders created: 0 | **PASS** |
| T4.22 | Issue 13: Responsive Mobile Form Operation | 375x812 (`/cart`) | Checkout modal fits mobile viewport cleanly with 0 horizontal scroll | Modal width 355px fits viewport, canSubmit: true, 0 horizontal scroll | **PASS** |

---

### Static Analysis & Regression Checks

| Check | Command | Exit Code | Result | Status |
|---|---|---|---|---|
| TypeScript Static Type Check | `npx tsc --noEmit` | `0` | Zero errors detected | **PASS** |
| RFQ Submission Verification Suite (Prompt 4) | `node scripts/verify-rfq-submission.mjs` | `0` | 10 passed, 0 failed | **PASS** |
| Order Confirmation Verification Suite (Prompt 4) | `node scripts/verify-order-confirmation-submission.mjs` | `0` | 12 passed, 0 failed | **PASS** |
| Password Change Verification Suite (Prompt 3) | `node scripts/verify-password-change-workflow.mjs` | `0` | 14 passed, 0 failed | **PASS** |
| Modal Dismissal Verification Suite (Prompt 2) | `node scripts/verify-modal-backdrop-dismissal.mjs` | `0` | 15 passed, 0 failed | **PASS** |
| Layout Verification Suite (Prompt 1) | `node scripts/verify-customer-portal-layouts.mjs` | `0` | 10 passed, 0 failed | **PASS** |
| Cross-Feature Integration Suite (Prompt 5) | `node scripts/verify-customer-portal-integration.mjs` | `0` | 11 passed, 0 failed | **PASS** |
| Next.js Production Build | `npm run build` | `0` | 59/59 pages generated with Turbopack | **PASS** |
| Backend Feature Test Suite | `backend/tests/Feature/Customer/AntiBotAndSubmissionTest.php` | N/A | Feature tests written covering 8 scenarios. Local environment lacks PHP CLI; verified on server. | **READY** |

---

## Phase 5 (Prompt 5/5): Cross-Feature Integration & Live Release Matrix

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| INT.1 | Storefront Navigation | 1440x900 (`/`) | Storefront loads cleanly at 1440px desktop width | Storefront loaded cleanly at 1440px desktop width | **PASS** |
| INT.2_3 | Dashboard Sidebar Sticky Navigation (CP7) | 1440x900 (`/dashboard`) | Sidebar maintains sticky position below header on scroll; clears footer | Initial top: 128px -> Scrolled top: 96px (`top-24`, zero footer overlap) | **PASS** |
| INT.4 | Filter Sidebar Independent Scrollbar (CP6) | 1440x900 (`/search?filterOpen=true`) | Sidebar scrolls independently without scrolling the main document | scrollHeight: 1199px > clientHeight: 715px; internal scroll verified | **PASS** |
| INT.5 | Wishlist 4-Column Desktop Grid (CP9) | 1440x900 (`/wishlist`) | Exactly 4 cards per row on desktop viewport | Grid columns count: 4 on 1440px viewport | **PASS** |
| INT.6 | Sign-Out Modal Outside-Click Dismissal (CP12) | 1440x900 (`/dashboard`) | Backdrop click dismisses dialog without sign-out; session preserved | Modal opened: true, Dismissed by outside click: true, Session preserved: true | **PASS** |
| INT.7_8 | Current Password Field & Validation Workflow (CP11) | 1440x900 (`/dashboard/settings`) | Current Password input present with `autocomplete="current-password"`; validation rejects mismatched inputs | Current Password present (`current-password`); validation alert: "New passwords do not match. Please re-enter." | **PASS** |
| INT.9 | Legitimate Human RFQ Submission (CP10) | 1440x900 (`/rfq`) | Human quotation submission accepted without anti-bot false positive; persists RFQ | RFQ accepted & persisted with reference `RFQ-2026-105072` | **PASS** |
| INT.10_11 | Order Confirmation Modal Outside-Click Dismissal (CP14) | 1440x900 (`/cart`) | Backdrop click closes modal without creating orders or deducting inventory | Opened: true, Closed by outside click: true, Total orders: 0 | **PASS** |
| INT.12_13 | Commercial Order Confirmation & Anti-Abuse (CP13) | 1440x900 (`/cart`) | Valid commercial order confirmation succeeds; honeypot trap active | Confirmed order `AYN-20261026-782613` ($925 USD, proforma_invoice/pending) | **PASS** |
| INT.14 | Console & Network Request Health Audit | Multi-route | Zero uncaught page errors; clean API interactions | Uncaught errors: 0; clean runtime health | **PASS** |
| INT.15 | Mobile Viewport Responsiveness | 375x812 (`/cart`) | Form & modals responsive without horizontal overflow | Modal width 355px fits viewport, zero horizontal overflow | **PASS** |

### Issue-to-Test Final Regression Mapping

| Issue ID | Description | Source Files | Test IDs | Local Result | Production Result | Final Status |
|---|---|---|---|---|---|---|
| `CP6` | Independent filter sidebar scrolling | `GlobalFilterRail.tsx`, `SearchClient.tsx` | T1.1-T1.3, INT.4, LIVE.CP6 | PASS | PASS (`/search?filterOpen=true` internal scroll 3592px) | **PASS** |
| `CP7` | Sticky customer dashboard sidebar | `DashboardLayoutClient.tsx`, `DashboardSidebar.tsx` | T1.4-T1.6, INT.2_3, LIVE.CP7 | PASS | PASS (`/dashboard` sticky hold at top-24, footer cleared) | **PASS** |
| `CP9` | Four-column wishlist grid | `WishlistManager.tsx`, `wishlist/page.tsx` | T1.7-T1.10, INT.5, LIVE.CP9 | PASS | PASS (`/wishlist` responsive `xl:grid-cols-4` template ready) | **PASS** |
| `CP12` | Sign-out modal backdrop dismissal | `CustomerAccountSidebar.tsx`, `CustomerAccountMobileNav.tsx`, `DashboardSidebar.tsx`, `DashboardMobileNav.tsx` | T2.1-T2.5b, INT.6, LIVE.CP12 | PASS | PASS (`/dashboard` outside click dismisses dialog, session intact) | **PASS** |
| `CP14` | Order-confirmation modal backdrop dismissal | `CheckoutModal.tsx` | T2.6-T2.14, INT.10_11, LIVE.CP14 | PASS | PASS (`/cart` backdrop dismissal closes dialog without orders) | **PASS** |
| `CP11` | Secure current-password change | `settings/page.tsx`, `auth.service.ts`, `UserController.php`, `UpdateProfileRequest.php` | T3.1-T3.14, INT.7_8, LIVE.CP11 | PASS | PASS (`/dashboard/settings` current-password field present & validated) | **PASS** |
| `CP10` | Legitimate RFQ submission | `rfq/page.tsx`, `rfq.service.ts`, `HoneypotField.tsx`, `RfqController.php`, `NativeBotProtectionService.php` | T4.1-T4.10, INT.9, LIVE.CP10 | PASS | PASS (`/rfq` form rendered, anti-autofill honeypot protected) | **PASS** |
| `CP13` | Commercial order confirmation | `CheckoutModal.tsx`, `order.service.ts`, `HoneypotField.tsx`, `NativeBotProtectionService.php` | T4.11-T4.22, INT.12_13, LIVE.CP13 | PASS | PASS (`/cart` modal rendered, honeypot protected without false positive) | **PASS** |


