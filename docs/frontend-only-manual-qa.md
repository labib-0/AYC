# AYAAN CLOTHING — Frontend-Only Live Manual QA Checklist & Guide

> **Phase 18 Live Testing Environment**  
> **Mode:** `NEXT_PUBLIC_FRONTEND_ONLY=true` (Frontend-Only / Mock Store)  
> **Customer Storefront:** [http://localhost:3000](http://localhost:3000)  
> **Admin Application:** [http://localhost:3001](http://localhost:3001)  
> **Backend Required:** NONE (Laravel, PostgreSQL, and Redis are completely bypassed)

---

## 1. QA Instructions & Principles

1. **Human Manual Testing**: All items in this checklist are meant to be executed manually by a human QA engineer or developer. No browser automation or Playwright scripts are used.
2. **Persistence**: The mock architecture uses `localStorage` namespaces prefixed with `ayaan_mock_`. Data changes (created products, updated orders, added addresses, sent RFQ messages) persist across page refreshes and navigations.
3. **Data Reset**: If test data becomes polluted, click the **Frontend Mode** floating toolbar at the bottom-left and select **Reset Demo Data** (2-step confirmation) or run `window.mockStore?.resetAllMockData()` in the browser developer console.

---

## 2. Seeded Demo Accounts

| Role | Email | Password | Intended QA Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@ayaanclothing.com` | `admin123` | Full access to Admin portal (`http://localhost:3001`), CRUD, fulfillment, quotations, inventory |
| **B2B Buyer** | `buyer@ayaanclothing.com` | `buyer123` | Approved B2B wholesale buyer; testing customer dashboard, company profile, RFQs, quotes |
| **Customer A** | `testuser@example.com` | `user123` | Regular customer account; testing orders, address book, reordering |
| **Customer B** | `customer2@example.com` | `demo123` | Secondary customer account; testing cross-user isolation and ownership |

*Tip: You can also use the **Quick Role Switch** in the bottom-left DevToolbar to instantaneously toggle between Logged Out, Customer, B2B Buyer, and Admin sessions.*

---

## 3. Mock Data Inventory Overview

- **Products**: 40 products with variants, sizes, colors, pricing tiers, and MOQs
- **Brands**: 8 active brands (Apex, Artisan, Nordic, etc.)
- **Product Categories**: 10 active apparel categories + 5 Audience groups (MEN, WOMEN, BOYS, GIRLS, UNISEX)
- **Orders**: 3 seeded customer orders (`AYN-1001`, `AYN-1002`, `AYN-1003`)
- **RFQs**: 3 seeded RFQs (`RFQ-2026-000101`, `RFQ-2026-000102`, `RFQ-2026-000103`)
- **Quotations**: 3 seeded quotations (`QT-2026-000101`, `QT-2026-000102`, `QT-2026-000103`)
- **Inventory & Warehouses**: 10 SKU stock balances across 3 warehouses (Dhaka Central, Chittagong Port, Gazipur Logistics)
- **Promotions & Coupons**: 3 active promotions (`WINTER2026`, `BULK50`, `WELCOME10`)

---

## 4. Comprehensive Manual QA Checklist

### A. Customer Storefront
- [ ] **A1. Homepage Load**: Loads without errors at `http://localhost:3000`.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A2. Hero Banner & CTAs**: Hero banner rotates/displays; clicking "Explore Wholesale" or CTA navigates to catalog.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A3. Live Ticker / Value Props**: Ticker bar displays smoothly directly below banner with 8 marquee headlines.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A4. Shop By Brand (Post-Ticker)**: Renders immediately after the Headline Ticker and directly before Hot Sales. Displays centered "SHOP BY BRAND", "ALL CATEGORIES" button, responsive brand tile grid, and "LOAD MORE" control. Clicking "ALL CATEGORIES" smoothly toggles inline expansion displaying fixed AUDIENCE (MEN, WOMEN, BOYS, GIRLS, UNISEX) first, followed by dynamic PRODUCT CATEGORIES.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A5. Hot Sales (Between Brand & Featured)**: Renders immediately after Shop By Brand and directly before Featured Products. Displays "HOT SALES" title, subtitle, curated category cards (Sweaters & Towels) in a horizontal carousel, and contextual collection showcase upon card click.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A6. Featured Products (Post-Hot-Sales)**: Renders directly after Hot Sales. 15 initial products, BEST DEALS / NEW ARRIVALS tabs, Load More button (+25 products), continuous scroll, sticky filter rail. "ALL CATEGORIES" button toggles inline panel (AUDIENCE &rarr; PRODUCT CATEGORIES) independently without disturbing filter state or pagination.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A7. Category Highlights**: Audience and Category cards render below Featured Products.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A8. Trust & Compliance**: Factory compliance, certifications, and export badges display properly before footer.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **A9. Footer Links**: All footer links (About, Terms, Privacy, FAQ, Contact) resolve to valid pages without 404s.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### B. Customer Dashboard
- [ ] **B1. Overview Dashboard**: `/dashboard` displays welcome greeting, quick statistics, and recent orders.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **B2. Dashboard Navigation**: Sidebar links navigate to Orders, RFQs & Quotes, Reorder, Company, Addresses, Documents, and Settings.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **B3. Mobile Bottom Nav**: On mobile viewports, the bottom navigation bar switches tabs cleanly.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **B4. Header Sync**: Customer avatar and name in top header correctly reflect logged-in user.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **B5. Quick Actions**: "Request a Quote", "Browse Catalog", and "Download Statement" trigger appropriate routes/actions.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### C. Authentication
- [ ] **C1. Modal Open & Close**: Clicking Login/Account in header opens AuthModal cleanly; ESC or overlay click closes it.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **C2. Customer Login**: Log in with `testuser@example.com` / `user123`. Redirects cleanly without page refresh issues.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **C3. Session Retention on Refresh**: Refreshing the page while logged in preserves the active session.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **C4. Protected Route Interception**: Visiting `/dashboard` as Guest redirects to login or opens AuthModal.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **C5. Logout Action**: Clicking Logout removes session, updates header state, and redirects to homepage.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **C6. Invalid Credentials**: Entering incorrect password shows error toast or notification without crashing.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### D. Product Catalog
- [ ] **D1. Initial Catalog Load**: Catalog loads with 15 initial products. Filter rail is initially closed.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **D2. "Load More" Click**: Clicking "Load More" appends +25 products, auto-activates continuous mode, and auto-opens filter rail once.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **D3. Infinite Scroll / Continuous Mode**: Scrolling down triggers additional pagination chunks until all 40 products are displayed.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **D4. Product Card Metadata**: Each product card clearly renders Title, Brand, Category, Starting Price (USD), MOQ, and stock badge.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **D5. Image Aspect Ratio**: Product thumbnails respect canonical 3:4 aspect ratio without stretching.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### E. Search
- [ ] **E1. Search Bar Interaction**: Clicking search opens input with debounce. No heavy full-screen blocking overlay.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **E2. Typing Query**: Typing "Hoodie" returns matching hoodie products dynamically.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **E3. Empty State**: Searching for non-existent item ("xyzabc999") shows friendly empty state with suggested categories.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **E4. Recent Searches**: Submitted queries appear in "Recent Searches". Clicking an item re-runs query; clicking "x" removes it.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **E5. URL Synchronization**: Search queries update URL query parameters (`?q=...`) allowing bookmarks and back-navigation.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### F. Filters
- [ ] **F1. Filter Ordering**: Filter sections are displayed in canonical order: Brand &rarr; Design Type &rarr; Audience &rarr; Product Category.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **F2. Single Selection**: Selecting a single brand (e.g., "Apex") filters catalog to only Apex products.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **F3. Multi-Section Filtering**: Selecting Audience "MEN" and Category "Sweaters" narrows down correctly.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **F4. Clear All Filters**: Clicking "Clear All" restores full product catalog and resets checkboxes.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **F5. Drawer on Mobile**: Mobile view renders filters in a sliding drawer with sticky "Apply" button.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### G. Product Detail
- [ ] **G1. Detail Page Route**: Navigating to `/products/[id]` or `/products/[slug]` displays full product specifications.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **G2. Gallery & Thumbnails**: Clicking secondary image thumbnails changes the main hero image smoothly.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **G3. Variant Selection**: Selecting Color (e.g. Navy) and Size (e.g. L) updates selected SKU state.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **G4. MOQ Enforcement**: Quantity input starts at or above MOQ; decrementing below MOQ is prevented or flagged.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **G5. Add to Cart Action**: Clicking "Add to Cart" adds selected quantity, shows feedback toast, and increments cart badge.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **G6. Action Constraint Check**: Confirm NO "Buy Now", "Direct Checkout", or "Instant RFQ" buttons appear on PDP.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### H. Cart
- [ ] **H1. Cart Flyout / Page**: Opening Cart displays selected items, variants, unit prices, and quantities.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **H2. Quantity Increment/Decrement**: Changing quantity updates item subtotal and overall cart total in USD.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **H3. Remove Item**: Clicking remove deletes line item and recalculates total.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **H4. Refresh Persistence**: Reloading browser retains cart items in `localStorage`.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **H5. Package Allocation Exclusion**: Verify NO internal warehouse package allocation UI is visible to the customer.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### I. Checkout
- [ ] **I1. Step Navigation**: Checkout displays customer information, address selection, and shipping method.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **I2. Address Selection**: Existing saved addresses can be selected or a new shipping address entered.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **I3. Form Validation**: Missing required fields (email, phone, destination country) highlights errors.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **I4. Order Placement**: Submitting order triggers mock store creation, clears cart, and routes to order confirmation.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **I5. No Internal Logistics Fields**: Verify no customs broker or internal carrier fields are exposed to buyer.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### J. Address Book
- [ ] **J1. List Saved Addresses**: `/dashboard/addresses` displays all addresses belonging to the current user.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **J2. Add New Address**: Submitting new address modal saves record immediately to mock store and updates list.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **J3. Edit Address**: Editing an address updates line fields, city, postal code, and country.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **J4. Set Default**: Toggling "Set as Default" updates the default badge and syncs with checkout defaults.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **J5. Delete Address**: Deleting address removes card with smooth UI feedback.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### K. Orders
- [ ] **K1. Order List**: `/dashboard/orders` shows customer orders with Order #, Date, Items, Total, Status pills.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **K2. Status Filters**: Filtering by "Pending", "Confirmed", "Shipped", or "Delivered" filters table rows.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **K3. Order Detail Page**: `/dashboard/orders/[id]` renders items breakdown, pricing, shipping destination, timeline.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **K4. Quick Reorder**: `/dashboard/reorder` displays past purchased items; clicking "Add to Cart" adds MOQ to cart with inline feedback.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### L. RFQs (Customer Commercial Hub)
- [ ] **L1. RFQ List**: `/dashboard/rfq` lists buyer's submitted RFQs with status badges (Submitted, Under Review, Quoted).  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **L2. RFQ Detail**: `/dashboard/rfq/[id]` displays target quantities, target unit price, destination port, specifications.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **L3. RFQ Message Thread**: Customer can type a message in communication box and send. Message appears instantly in timeline.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **L4. Message Persistence**: Navigating away and returning to `/dashboard/rfq/[id]` preserves sent message.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### M. Quotations
- [ ] **M1. Quotations List**: `/dashboard/quotes` lists formal quotes with Quote #, Date, Total Units, Total USD, and Expiry.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **M2. Quotation Detail**: `/dashboard/quotes/[id]` displays full commercial terms (FOB Chittagong / CIF, Payment terms).  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **M3. Quotation Accept/Decline**: Customer can click "Accept Quote" or "Decline" with modal confirmation updating status.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **M4. Document Link**: Clicking "View Commercial Document" or PI link opens formal document viewer.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### N. Admin Application (Port 3001)
- [ ] **N1. Admin Isolation**: Accessing `http://localhost:3001` renders Admin interface. Anonymous access redirects to Admin Login.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N2. Admin Dashboard**: Displays platform KPI metrics, revenue, open RFQs, order processing counts.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N3. Product Management**: Search, filter, edit, duplicate, unpublish, and delete products in mock store.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N4. Brand Management**: Create new brand, upload logo, toggle active status, verify deletion protection for brands with products.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N5. Category Management**: Add category, edit thumbnail, toggle active status. Verify Audience groups remain fixed.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N6. Inventory Adjustments**: Select warehouse, adjust stock (+ / - / absolute), provide reason, verify Low Stock threshold (200).  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N7. Order Management**: View order detail, approve payment proof, update fulfillment status, enter custom carrier & tracking.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N8. Customer B2B Approvals**: Review customer profile, set payment terms, credit limits, approve/reject B2B tier.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N9. Admin RFQ & Quotation Flow**: Open RFQ, reply to buyer, generate quotation, send formal quote to customer.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **N10. "View Storefront" Links**: Clicking "View Storefront" in Admin opens `http://localhost:3000` in new tab cleanly.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### O. Documents
- [ ] **O1. Document Hub**: Admin `/admin/documents` and customer `/dashboard/documents` show Proforma Invoices, Offer Sheets, Packing Lists.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **O2. Bank Information Verification**: Check Proforma Invoice header:
  - Bank: Pubali Bank Limited
  - Account: M/S AYAAN CLOTHING
  - Account No: 1788-901-044316
  - Swift: PUBABDDH210
  - Branch: Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **O3. Print / PDF Trigger**: Clicking Print or Download initiates native browser print layout with clean styling.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### P. Promotions & Coupons
- [ ] **P1. Promotion CRUD**: In Admin, edit promotion banner text, active dates, banner images.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **P2. Storefront Reflection**: Verify that banner text edited in Admin displays on Storefront homepage after refresh.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **P3. Coupon Code Rules**: Create coupon code (auto-uppercased), set percentage or fixed discount, test at checkout.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### Q. Settings
- [ ] **Q1. Business Profile**: Admin settings verify company name, headquarters, tax registration, contact email.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **Q2. Currency Lock**: Ensure system currency is strictly USD ($) across all pricing, quotes, and reports.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **Q3. Admin User Roles**: Inspect admin user permissions; ensure customer users cannot be granted system superadmin without validation.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### R. Cross-User Isolation (Security & Privacy)
- [ ] **R1. Order Isolation**: Log in as Customer A (`testuser@example.com`). Note visible orders. Switch to Customer B (`customer2@example.com`). Confirm Customer A's orders do NOT appear.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **R2. RFQ Isolation**: Log in as Customer B. Confirm RFQs belonging to Buyer (`buyer@ayaanclothing.com`) are inaccessible and return 404/Access Denied.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **R3. Address Isolation**: Saved addresses of Customer A are NOT exposed in Customer B's checkout or address book.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **R4. Direct URL Protection**: Direct navigation to `/dashboard/orders/AYN-1001` while logged in as an unrelated user correctly shows Access Denied.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

### S. Responsive & Accessibility Testing
- [ ] **S1. Mobile Storefront (375px - 428px)**: Navigation hamburger drawer, mobile search, and 2-column product grid render cleanly.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **S2. Mobile Dashboard (375px - 428px)**: Customer dashboard switches to card layouts, floating bottom bar, and responsive touch targets.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **S3. Tablet (768px - 1024px)**: Admin tables and customer catalog adapt gracefully without horizontal viewport breakage.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`
- [ ] **S4. Dark / Light Mode Consistency**: All UI text maintains high contrast and readability against backgrounds.  
  `Status:` [ ] PASS &nbsp; [ ] FAIL &nbsp; [ ] BLOCKED  
  `Notes:`

---

## 5. Bug Report Template

When encountering issues during manual testing, submit reports using the following template:

```markdown
### [BUG-YYYYMMDD-XXX] Short Bug Title

- **Date:** YYYY-MM-DD
- **Tester:** [Your Name / QA]
- **Area:** [Customer Storefront | Customer Dashboard | Admin | Auth | Cart | Checkout | Orders | RFQ | Quotation | Documents]
- **Route / URL:** (e.g., http://localhost:3000/dashboard/orders/AYN-1001)
- **Severity:** [P0 - Critical Blocker | P1 - High Severity | P2 - Medium | P3 - Minor Cosmetic | P4 - Suggestion/Tweak]
- **Device / Browser:** (e.g., Chrome 124 on macOS / Safari on iOS)

#### Steps to Reproduce:
1. Go to '...'
2. Click on '....'
3. Enter '....'
4. See error

#### Expected Result:
What should have happened according to business specifications.

#### Actual Result:
What actually happened.

#### Screenshots / Video:
[Attach image or recording link]

#### Console Errors / Logs:
```
[Paste browser console errors or network warnings here if any]
```

#### Network Behavior:
[Describe any failed fetch or 404/500 requests]

#### Status:
[NEW | CONFIRMED | IN_PROGRESS | RESOLVED | WONT_FIX]

#### Additional Notes:
[Any extra context on mock state or reproduction rate]
```

---

## 6. Severity Definitions

- **P0 (Critical Blocker)**: Application crashes, white screen, complete inability to log in or access core pages, mock data corrupted irrecoverably without reset.
- **P1 (High Severity)**: Major workflow broken (e.g., cannot complete checkout, RFQ message fails to send, order details fail to load).
- **P2 (Medium)**: Feature works partially with workaround, filter anomaly, non-blocking visual glitch during state change.
- **P3 (Minor Cosmetic)**: Misaligned icon, typo in copy, minor padding or responsive touch-up needed.
- **P4 (Enhancement)**: Quality-of-life recommendation, UX optimization idea.
